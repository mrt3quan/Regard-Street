// A run is one work week at the firm: Monday to Friday, with the shop after each day.
//
// Boss trust (3 hearts) replaces "lose once and it's over": markets are random, so a missed
// goal costs 1 heart, blowing through the daily loss limit costs 2, and 0 hearts means you're
// fired. Survive Friday's boss (the Fed decision) and the week is cleared.

import { newBattle } from './battle';
import { CARDS, DECKS, type CardId, type Rarity } from './cards';
import { EDGE_IDS, MAX_EDGES, type EdgeId } from './edges';
import { rng } from './rng';
import type { BattleState } from './state';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const GOAL_SCALE = [1, 1.15, 1.3, 1.45, 1.6];
export const START_TRUST = 3;
export const START_CASH = 4;
export const PRICES: Record<Rarity, number> = { common: 3, uncommon: 5, rare: 7 };
export const EDGE_PRICE = 6;
export const REMOVE_PRICE = 3;
const RARITY_WEIGHT: Record<Rarity, number> = { common: 6, uncommon: 3, rare: 1 };

export interface DayResult {
  day: number;
  won: boolean;
  blewUp: boolean;
  score: number;
  goal: number;
  pnl: number;
  bonus: number;
}

export interface ShopItem {
  card: CardId;
  price: number;
  sold: boolean;
}

export interface ShopState {
  offers: ShopItem[];
  edge: EdgeId | null;
  edgeSold: boolean;
  rerolls: number;
  removed: boolean;
}

export interface Bonus {
  base: number;
  overshoot: number;
  interest: number;
  edge: number;
  total: number;
}

export interface RunState {
  version: 1;
  seed: string;
  name: string;
  deckId: string;
  cards: CardId[];
  edges: EdgeId[];
  cash: number;
  trust: number;
  /** 0 = Monday ... 4 = Friday. */
  day: number;
  phase: 'day' | 'shop' | 'cleared' | 'fired';
  results: DayResult[];
  shop: ShopState | null;
  lastBonus: Bonus | null;
}

export function newRun(seed: string, deckId: string, edge: EdgeId, name: string): RunState {
  const deck = DECKS.find((d) => d.id === deckId);
  if (!deck || deck.locked) throw new Error(`Unknown deck ${deckId}`);
  return {
    version: 1, seed, name, deckId, cards: [...deck.cards], edges: [edge],
    cash: START_CASH, trust: START_TRUST, day: 0, phase: 'day', results: [], shop: null, lastBonus: null,
  };
}

export function dayGoal(run: RunState): number {
  const base = DECKS.find((d) => d.id === run.deckId)!.goal;
  return Math.round((base * GOAL_SCALE[run.day]) / 10) * 10;
}

export const isBossDay = (run: RunState) => run.day === WEEKDAYS.length - 1;

export function battleFor(run: RunState): BattleState {
  return newBattle({
    seed: `${run.seed}:${run.day}`, deckId: run.deckId, cards: run.cards, edges: run.edges,
    goal: dayGoal(run), boss: isBossDay(run),
  });
}

export function bonusFor(run: RunState, b: BattleState): Bonus {
  if (b.status !== 'won') return { base: 1, overshoot: 0, interest: 0, edge: 0, total: 1 };
  const base = 4;
  const overshoot = Math.max(0, Math.min(4, Math.floor((b.score - b.goal) / (b.goal * 0.5))));
  const interest = Math.min(3, Math.floor(run.cash / 5));
  const edge = run.edges.includes('taxWizard') ? 3 : 0;
  return { base, overshoot, interest, edge, total: base + overshoot + interest + edge };
}

/** Record the finished day: pay the bonus, adjust trust, and move to the shop or end the run. */
export function finishDay(run: RunState, b: BattleState): RunState {
  const won = b.status === 'won';
  const blewUp = !!b.endReason?.includes('loss limit');
  const bonus = bonusFor(run, b);
  const next: RunState = {
    ...run,
    cash: run.cash + bonus.total,
    trust: run.trust - (won ? 0 : blewUp ? 2 : 1),
    results: [...run.results, { day: run.day, won, blewUp, score: b.score, goal: b.goal, pnl: b.realized, bonus: bonus.total }],
    lastBonus: bonus,
  };
  if (next.trust <= 0) return { ...next, trust: 0, phase: 'fired', shop: null };
  if (isBossDay(run)) return { ...next, phase: 'cleared', shop: null };
  return { ...next, phase: 'shop', shop: makeShop(next, 0) };
}

function pickCard(r: ReturnType<typeof rng>): CardId {
  const ids = Object.keys(CARDS) as CardId[];
  const total = ids.reduce((a, id) => a + RARITY_WEIGHT[CARDS[id].rarity], 0);
  let x = r.next() * total;
  for (const id of ids) { x -= RARITY_WEIGHT[CARDS[id].rarity]; if (x < 0) return id; }
  return ids[0];
}

function makeShop(run: RunState, rerolls: number): ShopState {
  const r = rng(`${run.seed}:shop:${run.day}:${rerolls}`);
  const offers: ShopItem[] = [];
  while (offers.length < 3) {
    const card = pickCard(r);
    if (!offers.some((o) => o.card === card)) offers.push({ card, price: PRICES[CARDS[card].rarity], sold: false });
  }
  const available = EDGE_IDS.filter((e) => !run.edges.includes(e));
  const edge = run.edges.length < MAX_EDGES && available.length ? r.pick(available) : null;
  return { offers, edge, edgeSold: false, rerolls, removed: false };
}

export const rerollPrice = (shop: ShopState) => 2 + shop.rerolls;

export function buyCard(run: RunState, index: number): RunState | string {
  const item = run.shop?.offers[index];
  if (!run.shop || !item || item.sold) return 'That card is gone.';
  if (run.cash < item.price) return 'Not enough bonus cash.';
  const offers = run.shop.offers.map((o, i) => (i === index ? { ...o, sold: true } : o));
  return { ...run, cash: run.cash - item.price, cards: [...run.cards, item.card], shop: { ...run.shop, offers } };
}

export function buyEdge(run: RunState): RunState | string {
  if (!run.shop?.edge || run.shop.edgeSold) return 'No Edge for sale.';
  if (run.cash < EDGE_PRICE) return 'Not enough bonus cash.';
  if (run.edges.length >= MAX_EDGES) return `You can hold at most ${MAX_EDGES} Edges.`;
  return { ...run, cash: run.cash - EDGE_PRICE, edges: [...run.edges, run.shop.edge], shop: { ...run.shop, edgeSold: true } };
}

export function removeCard(run: RunState, index: number): RunState | string {
  if (!run.shop || run.shop.removed) return 'You can remove one card per visit.';
  if (run.cash < REMOVE_PRICE) return 'Not enough bonus cash.';
  if (run.cards.length <= 8) return 'Your deck needs at least 8 cards.';
  const cards = run.cards.filter((_, i) => i !== index);
  return { ...run, cash: run.cash - REMOVE_PRICE, cards, shop: { ...run.shop, removed: true } };
}

export function reroll(run: RunState): RunState | string {
  if (!run.shop) return 'The shop is closed.';
  const price = rerollPrice(run.shop);
  if (run.cash < price) return 'Not enough bonus cash.';
  const fresh = makeShop(run, run.shop.rerolls + 1);
  return { ...run, cash: run.cash - price, shop: { ...fresh, edge: run.shop.edgeSold ? null : run.shop.edge, edgeSold: run.shop.edgeSold, removed: run.shop.removed } };
}

export function nextDay(run: RunState): RunState {
  return { ...run, day: run.day + 1, phase: 'day', shop: null };
}
