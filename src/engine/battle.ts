// The trading day as a card battle. All functions are pure: they take a state and return a new one.
//
// Turn loop:  start turn (refill Focus, draw)  ->  play cards (open/close trades)  ->  end turn:
//   the market moves along a path, stops trigger along the way, then the turn is scored:
//     chips = the turn's dollar P&L      mult = 1 + bonuses for trading like a pro
//     score += chips x mult
// The day is won if the score reaches the goal by the 4:00 pm close.
// It is lost if the day's P&L hits the loss limit (the risk desk shuts you down) or the goal is missed.

import { CARDS, DECKS, type CardId } from './cards';
import { drawCards } from './deck';
import type { EdgeId } from './edges';
import { createDay, TICKS, turnPath, type Ticker } from './market';
import { TURNS_PER_DAY } from './options';
import { rng } from './rng';
import type { BattleState, CardInstance, MultPart, TurnResult } from './state';
import { closeTrade, equity, fmtMoney, isDefinedRisk, totalRisk, tradePnl, turnsLeft } from './trades';

export const BASE_FOCUS = 3;
export const HAND_SIZE = 5;
export const LOSS_LIMIT = 2500;
export const RISK_BUDGET = 6000;

export interface BattleOptions {
  seed: string;
  deckId: string;
  cards: CardId[];
  edges: EdgeId[];
  goal: number;
  /** Friday: The Chair's rate decision lands mid-afternoon. */
  boss?: boolean;
  ticker?: Ticker;
}

export function newBattle(o: BattleOptions): BattleState {
  const day = createDay(o.seed, o.ticker, o.boss);
  const cards: CardInstance[] = o.cards.map((id, uid) => ({ uid, id }));
  const edges = o.edges;
  const s: BattleState = {
    seed: o.seed, deckId: o.deckId, day, edges, boss: !!o.boss,
    turn: 0, status: 'playing', endReason: null,
    price: day.open, iv: day.iv, candles: [],
    focus: 0, hand: [], drawPile: rng(`${o.seed}:deal`).shuffle(cards), discardPile: [], exhausted: [], shuffles: 0,
    trades: [], nextTradeId: 1, realized: 0,
    score: 0, goal: o.goal,
    lossLimit: LOSS_LIMIT + (edges.includes('riskBuddy') ? 1000 : 0) - (edges.includes('coffee') ? 500 : 0),
    log: [{ turn: 0, text: `Market open. ${day.ticker.name} (${day.ticker.symbol}) at $${day.open.toFixed(2)}.`, tone: 'info' }],
    riskBudget: RISK_BUDGET + (edges.includes('bigBook') ? 3000 : 0),
    lastTurn: null,
    stats: { tradesOpened: 0, bestTurn: 0, worstTurn: 0, stopsHit: 0, heldThroughEvent: false, premiumCollected: 0 },
  };
  startTurn(s);
  return s;
}

/** A single day with a starter deck, as used by the tests and quick play. */
export function newDeckBattle(seed: string, deckId: string, edges: EdgeId[] = [], ticker?: Ticker): BattleState {
  const deck = DECKS.find((d) => d.id === deckId);
  if (!deck || deck.locked) throw new Error(`Unknown deck ${deckId}`);
  return newBattle({ seed, deckId, cards: deck.cards, edges, goal: deck.goal, ticker });
}

function startTurn(s: BattleState): void {
  s.focus = BASE_FOCUS + (s.edges.includes('coffee') ? 1 : 0);
  drawCards(s, HAND_SIZE + (s.edges.includes('tapeReader') ? 1 : 0));
  const ev = s.day.plan[s.turn].event;
  if (ev) s.log.push({ turn: s.turn, text: `${ev.name} this turn! ${ev.blurb}`, tone: 'info' });
}

/** Why the current positions earn a bonus multiplier. Rewards trading with known risk. */
export function multiplier(s: BattleState): { total: number; parts: MultPart[] } {
  const parts: MultPart[] = [{ name: 'Base', value: 1, why: 'Every turn starts at x1.' }];
  const open = s.trades;
  if (open.length && open.every(isDefinedRisk)) {
    parts.push({ name: 'Defined risk', value: 1, why: 'Every open trade has a known worst case (a stop, a spread, or a protective put).' });
  }
  const hasPut = open.some((t) => t.kind === 'putSpread' || t.kind === 'condor');
  const hasCall = open.some((t) => t.kind === 'callSpread' || t.kind === 'condor');
  if (hasPut && hasCall) parts.push({ name: 'Full condor', value: 1, why: 'You are paid on both sides of the price.' });
  if (s.edges.includes('thetaGang') && open.some((t) => t.legs.some((l) => l.kind !== 'stock' && l.qty < 0))) {
    parts.push({ name: 'Theta Gang', value: 1, why: 'Edge: you hold sold options.' });
  }
  if (s.edges.includes('volHunter') && open.some((t) => t.legs.some((l) => l.kind !== 'stock' && l.qty > 0))) {
    parts.push({ name: 'Vol Hunter', value: 1, why: 'Edge: you own options.' });
  }
  if (s.edges.includes('momentum') && s.candles.length) {
    const last = s.candles[s.candles.length - 1];
    const shares = open.flatMap((t) => t.legs).filter((l) => l.kind === 'stock').reduce((a, l) => a + l.qty, 0);
    if (shares !== 0 && Math.sign(shares) === Math.sign(last.c - last.o)) parts.push({ name: 'Momentum Mike', value: 1, why: 'Edge: your shares follow the last move.' });
  }
  return { total: parts.reduce((a, p) => a + p.value, 0), parts };
}

export function canPlay(s: BattleState, uid: number): string | null {
  if (s.status !== 'playing') return 'The day is over.';
  const card = s.hand.find((c) => c.uid === uid);
  if (!card) return 'That card is not in your hand.';
  if (CARDS[card.id].cost > s.focus) return 'Not enough Focus.';
  return null;
}

export function playCard(state: BattleState, uid: number): { state: BattleState; error: string | null } {
  const err = canPlay(state, uid);
  if (err) return { state, error: err };
  const s = structuredClone(state);
  const card = s.hand.find((c) => c.uid === uid)!;
  const def = CARDS[card.id];
  s.hand = s.hand.filter((c) => c.uid !== uid);
  s.focus -= def.cost;
  const riskBefore = totalRisk(s);
  const error = def.play(s);
  if (error) return { state, error };
  const riskAfter = totalRisk(s);
  if (riskAfter > s.riskBudget && riskAfter > riskBefore + 0.01) {
    return { state, error: `Risk desk says no: that would put ${fmtMoney(riskAfter)} at risk. Your limit is ${fmtMoney(s.riskBudget)}. Close something or add protection first.` };
  }
  (def.exhaust ? s.exhausted : s.discardPile).push(card);
  return { state: s, error: null };
}

function liquidateAll(s: BattleState): number {
  return [...s.trades].reduce((sum, t) => sum + closeTrade(s, t), 0);
}

/** Resolve the market move for the current turn. */
export function endTurn(state: BattleState): { state: BattleState; result: TurnResult | null } {
  if (state.status !== 'playing') return { state, result: null };
  const s = structuredClone(state);
  const i = s.turn;
  const plan = s.day.plan[i];
  const path = turnPath(s.day, i, s.price);
  const mult = multiplier(s);
  const before = equity(s);
  const tl = turnsLeft(s);
  if (plan.event && s.trades.some((t) => t.legs.some((l) => l.kind !== 'stock' && l.qty < 0))) s.stats.heldThroughEvent = true;

  // Walk the path; stops trigger at the first tick where the loss reaches them.
  const stopped: string[] = [];
  for (let k = 1; k <= TICKS; k++) {
    const turns = tl - k / TICKS;
    for (const t of [...s.trades]) {
      if (t.stop == null) continue;
      const pnl = tradePnl(t, path[k], s.iv, turns);
      if (pnl <= -t.stop) {
        const locked = closeTrade(s, t, path[k], s.iv, turns);
        stopped.push(`${t.label} stopped out at ${fmtMoney(locked, true)}`);
        s.stats.stopsHit++;
      }
    }
  }

  s.price = path[TICKS];
  if (plan.event) s.iv = s.day.ivAfterEvent;
  s.candles.push({ o: path[0], h: Math.max(...path), l: Math.min(...path), c: path[TICKS] });
  s.turn = i + 1;

  if (s.turn >= TURNS_PER_DAY) {
    // 4:00 pm: options expire and a day trader goes home flat.
    const closed = liquidateAll(s);
    if (closed !== 0) s.log.push({ turn: i, text: `Closing bell. Everything settled: ${fmtMoney(closed, true)}.`, tone: closed >= 0 ? 'good' : 'bad' });
  }

  const after = equity(s);
  const chips = after - before;
  const gained = Math.round(chips * mult.total);
  s.score += gained;
  s.stats.bestTurn = Math.max(s.stats.bestTurn, gained);
  s.stats.worstTurn = Math.min(s.stats.worstTurn, gained);
  for (const line of stopped) s.log.push({ turn: i, text: line, tone: 'bad' });

  const result: TurnResult = {
    turn: i, path, move: path[TICKS] / path[0] - 1, chips, mult: mult.total, parts: mult.parts, gained, stopped, event: plan.event,
  };
  s.lastTurn = result;

  if (after <= -s.lossLimit) {
    liquidateAll(s);
    s.status = 'lost';
    s.endReason = `Your P&L hit the ${fmtMoney(s.lossLimit)} daily loss limit. The risk desk closed all your trades.`;
  } else if (s.turn >= TURNS_PER_DAY) {
    s.status = s.score >= s.goal ? 'won' : 'lost';
    s.endReason = s.status === 'won' ? 'You hit the goal. Great day!' : `The bell rang before you reached the goal of ${s.goal.toLocaleString('en-US')}.`;
  } else {
    s.discardPile.push(...s.hand);
    s.hand = [];
    startTurn(s);
  }
  return { state: s, result };
}

/** Once the goal is reached, the player may close everything and leave early with the win. */
export function goHomeEarly(state: BattleState): BattleState {
  if (state.status !== 'playing' || state.score < state.goal) return state;
  const s = structuredClone(state);
  const pnl = liquidateAll(s);
  s.log.push({ turn: s.turn, text: `Closed everything (${fmtMoney(pnl, true)}) and went home early.`, tone: 'good' });
  s.status = 'won';
  s.endReason = 'Goal reached. You locked it in and left early. Knowing when to stop is a skill.';
  return s;
}
