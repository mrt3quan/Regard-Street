// Every card is a real trading action. play() mutates a draft of the battle state and
// returns an error message instead when the card can't be played right now.

import { drawCards } from './deck';
import { expectedMove, optionPrice } from './options';
import type { BattleState } from './state';
import {
  closeTrade, creditSpreadLegs, credit, fmtMoney, openTrade, tradePnl, turnsLeft,
} from './trades';

export type CardId =
  | 'buy' | 'short' | 'stop' | 'takeProfit' | 'cutLoss' | 'tape' | 'protPut' | 'espresso'
  | 'sellPut' | 'sellCall' | 'condor' | 'roll'
  | 'lockGains' | 'doubleDown' | 'buyCalls' | 'buyPuts' | 'buyStraddle' | 'coveredCall';

export type CardType = 'LONG' | 'SHORT' | 'PREMIUM' | 'SAFE' | 'CLOSE' | 'SKILL' | 'ADJUST' | 'VOL';
export type Rarity = 'common' | 'uncommon' | 'rare';

export interface CardDef {
  id: CardId;
  name: string;
  cost: number;
  type: CardType;
  rarity: Rarity;
  text: string;
  /** Plain-language explanation of the real concept behind the card. */
  learn: { term: string; text: string };
  /** Removed for the rest of the day once played. */
  exhaust?: boolean;
  play(s: BattleState): string | null;
}

export const SHARES = 100;
export const CONTRACTS = 10;
export const STOP_DOLLARS = 250;
const MIN_CREDIT = 0.05;

export const OPTION_CONTRACTS = 3;

const log = (s: BattleState, text: string, tone: 'good' | 'bad' | 'info' = 'info') => s.log.push({ turn: s.turn, text, tone });

function sellSpread(s: BattleState, type: 'put' | 'call', sds: number): string | null {
  const legs = creditSpreadLegs(s, type, sds, CONTRACTS);
  if (legs[0].entry - legs[1].entry < MIN_CREDIT) return 'The premium is too small now. Late in the day, far-away options are almost worthless.';
  const t = openTrade(s, type === 'put' ? 'putSpread' : 'callSpread', `${type === 'put' ? 'Put' : 'Call'} spread ${legs[0].strike}/${legs[1].strike}`, legs);
  log(s, `Sold a ${type} spread ${legs[0].strike}/${legs[1].strike} for ${fmtMoney(credit(t))}.`);
  return null;
}

export const CARDS: Record<CardId, CardDef> = {
  buy: {
    id: 'buy', name: 'Buy 100', cost: 1, type: 'LONG', rarity: 'common',
    text: `Buy ${SHARES} shares. Win if the price rises.`,
    learn: { term: 'Going long', text: 'Buying shares. Every $1 the price rises earns you $1 per share, and every $1 it falls costs you the same.' },
    play(s) {
      openTrade(s, 'long', `Long ${SHARES} ${s.day.ticker.symbol}`, [{ kind: 'stock', strike: 0, qty: SHARES, entry: s.price }]);
      log(s, `Bought ${SHARES} ${s.day.ticker.symbol} at $${s.price.toFixed(2)}.`);
      return null;
    },
  },
  short: {
    id: 'short', name: 'Short 100', cost: 1, type: 'SHORT', rarity: 'common',
    text: `Sell ${SHARES} borrowed shares. Win if it falls.`,
    learn: { term: 'Short selling', text: 'You borrow shares, sell them now, and buy them back later. If the price falls you pocket the difference. If it rises, your loss has no ceiling.' },
    play(s) {
      openTrade(s, 'short', `Short ${SHARES} ${s.day.ticker.symbol}`, [{ kind: 'stock', strike: 0, qty: -SHARES, entry: s.price }]);
      log(s, `Shorted ${SHARES} ${s.day.ticker.symbol} at $${s.price.toFixed(2)}.`);
      return null;
    },
  },
  stop: {
    id: 'stop', name: 'Stop Loss', cost: 0, type: 'SAFE', rarity: 'common',
    text: `Auto-close each open trade if it loses ${fmtMoney(STOP_DOLLARS)}.`,
    learn: { term: 'Stop loss', text: 'An order that closes your trade automatically once the loss hits a limit you chose in advance. Pros decide where they are wrong BEFORE they enter. (Spreads get a stop at 2x the money you collected.)' },
    play(s) {
      const targets = s.trades.filter((t) => t.stop == null);
      if (!targets.length) return 'All your open trades already have a stop (or you have none).';
      for (const t of targets) t.stop = t.kind === 'long' || t.kind === 'short' || t.kind === 'protected' ? STOP_DOLLARS : Math.max(50, Math.round(credit(t) * 2));
      log(s, `Stops set on ${targets.length} trade${targets.length > 1 ? 's' : ''}.`);
      return null;
    },
  },
  takeProfit: {
    id: 'takeProfit', name: 'Take Profit', cost: 1, type: 'CLOSE', rarity: 'common',
    text: 'Close every winning trade. Lock it in.',
    learn: { term: 'Taking profit', text: 'Money on the screen is not yours until you close the trade. Many option sellers close at 50% of the max profit instead of waiting for the last dollar.' },
    play(s) {
      const tl = turnsLeft(s);
      const winners = s.trades.filter((t) => tradePnl(t, s.price, s.iv, tl) > 0);
      if (!winners.length) return 'None of your trades is in profit right now.';
      const sum = winners.reduce((acc, t) => acc + closeTrade(s, t), 0);
      log(s, `Took profit on ${winners.length} trade${winners.length > 1 ? 's' : ''}: ${fmtMoney(sum, true)}.`, 'good');
      return null;
    },
  },
  cutLoss: {
    id: 'cutLoss', name: 'Cut Losses', cost: 0, type: 'CLOSE', rarity: 'common',
    text: 'Close every losing trade.',
    learn: { term: 'Cutting losses', text: 'Small losses are part of trading. The dangerous ones are the losses you hold on to hoping they come back.' },
    play(s) {
      const tl = turnsLeft(s);
      const losers = s.trades.filter((t) => tradePnl(t, s.price, s.iv, tl) < 0);
      if (!losers.length) return 'None of your trades is losing right now.';
      const sum = losers.reduce((acc, t) => acc + closeTrade(s, t), 0);
      log(s, `Cut ${losers.length} losing trade${losers.length > 1 ? 's' : ''}: ${fmtMoney(sum, true)}.`, 'bad');
      return null;
    },
  },
  tape: {
    id: 'tape', name: 'Read the Tape', cost: 0, type: 'SKILL', rarity: 'common',
    text: 'Draw 2 cards.',
    learn: { term: 'Reading the tape', text: 'Watching the flow of trades and prices to get a feel for the market. The name comes from the paper ticker tape of the 1900s.' },
    play(s) {
      drawCards(s, 2);
      return null;
    },
  },
  espresso: {
    id: 'espresso', name: 'Double Espresso', cost: 0, type: 'SKILL', rarity: 'rare', exhaust: true,
    text: '+1 Focus now. Used up for the day.',
    learn: { term: 'Focus', text: 'Your energy for the day. Every trade costs attention; tired traders make sloppy trades.' },
    play(s) {
      s.focus += 1;
      return null;
    },
  },
  protPut: {
    id: 'protPut', name: 'Protective Put', cost: 1, type: 'SAFE', rarity: 'uncommon',
    text: 'Buy a put under your shares. Caps your loss.',
    learn: { term: 'Protective put', text: 'A put is insurance: it pays off if the price falls below its strike. Owning shares plus a put means your worst case is known in advance.' },
    play(s) {
      const t = [...s.trades].reverse().find((x) => x.kind === 'long');
      if (!t) return 'You need an unprotected long stock position first.';
      const shares = t.legs[0].qty;
      const strike = Math.floor(s.price * 0.99);
      const entry = Math.round(optionPrice('put', s.price, strike, turnsLeft(s), s.iv) * 100) / 100;
      t.legs.push({ kind: 'put', strike, qty: Math.round(shares / 100), entry });
      t.kind = 'protected';
      t.label = `Protected long (put ${strike})`;
      log(s, `Bought protection: put ${strike} for ${fmtMoney(entry * shares)}.`);
      return null;
    },
  },
  sellPut: {
    id: 'sellPut', name: 'Sell Put Spread', cost: 1, type: 'PREMIUM', rarity: 'common',
    text: 'Get paid now. Keep it if price stays ABOVE.',
    learn: { term: 'Put credit spread', text: `You sell a put and buy a cheaper one below it (${CONTRACTS} contracts, expiring at 4pm). You collect money up front. The bought put caps your loss if the price crashes.` },
    play: (s) => sellSpread(s, 'put', 1.0),
  },
  sellCall: {
    id: 'sellCall', name: 'Sell Call Spread', cost: 1, type: 'PREMIUM', rarity: 'common',
    text: 'Get paid now. Keep it if price stays BELOW.',
    learn: { term: 'Call credit spread', text: `You sell a call and buy a cheaper one above it (${CONTRACTS} contracts, expiring at 4pm). You collect money up front, and the bought call caps your loss if the price rockets.` },
    play: (s) => sellSpread(s, 'call', 1.0),
  },
  condor: {
    id: 'condor', name: 'Iron Condor', cost: 2, type: 'PREMIUM', rarity: 'uncommon',
    text: 'Sell both spreads. Win if price stays in the middle.',
    learn: { term: 'Iron condor', text: 'Two credit spreads at once, one on each side. It profits when the market stays quiet. Only one side can lose at the close, so the risk is capped.' },
    play(s) {
      const put = creditSpreadLegs(s, 'put', 1.1, CONTRACTS);
      const call = creditSpreadLegs(s, 'call', 1.1, CONTRACTS);
      if (put[0].entry - put[1].entry + call[0].entry - call[1].entry < MIN_CREDIT * 2) return 'The premium is too small now. Late in the day, far-away options are almost worthless.';
      const t = openTrade(s, 'condor', `Iron condor ${put[0].strike}/${call[0].strike}`, [...put, ...call]);
      log(s, `Sold an iron condor ${put[0].strike}/${call[0].strike} for ${fmtMoney(credit(t))}.`);
      return null;
    },
  },
  roll: {
    id: 'roll', name: 'Roll Away', cost: 1, type: 'ADJUST', rarity: 'uncommon',
    text: 'Move your worst option trade further away.',
    learn: { term: 'Rolling', text: 'Closing a threatened option position and re-opening it at a safer strike. It usually locks in a small loss to avoid a big one.' },
    play(s) {
      const tl = turnsLeft(s);
      const opts = s.trades.filter((t) => t.kind === 'putSpread' || t.kind === 'callSpread' || t.kind === 'condor');
      if (!opts.length) return 'You have no option trades to roll.';
      const worst = opts.reduce((a, b) => (tradePnl(a, s.price, s.iv, tl) <= tradePnl(b, s.price, s.iv, tl) ? a : b));
      const pnl = closeTrade(s, worst);
      const kind = worst.kind;
      if (kind === 'condor') {
        const legs = [...creditSpreadLegs(s, 'put', 1.5, CONTRACTS), ...creditSpreadLegs(s, 'call', 1.5, CONTRACTS)];
        openTrade(s, 'condor', `Iron condor ${legs[0].strike}/${legs[2].strike}`, legs);
      } else {
        const type = kind === 'putSpread' ? 'put' : 'call';
        const legs = creditSpreadLegs(s, type, 1.5, CONTRACTS);
        openTrade(s, kind, `${type === 'put' ? 'Put' : 'Call'} spread ${legs[0].strike}/${legs[1].strike}`, legs);
      }
      log(s, `Rolled ${worst.label} (${fmtMoney(pnl, true)}) further away.`);
      return null;
    },
  },
  lockGains: {
    id: 'lockGains', name: 'Lock Gains', cost: 0, type: 'SAFE', rarity: 'uncommon',
    text: 'Winning trades close if they give back half their profit.',
    learn: { term: 'Trailing stop', text: 'Moving your stop up as a trade wins, so a winner cannot turn into a loser. Here: if a winning trade falls back to half of its current profit, it closes.' },
    play(s) {
      const tl = turnsLeft(s);
      const winners = s.trades.filter((t) => tradePnl(t, s.price, s.iv, tl) > 20);
      if (!winners.length) return 'You need a trade that is in profit first.';
      for (const t of winners) t.stop = -Math.round(tradePnl(t, s.price, s.iv, tl) * 0.5);
      log(s, `Trailing stops set on ${winners.length} winner${winners.length > 1 ? 's' : ''}.`, 'good');
      return null;
    },
  },
  doubleDown: {
    id: 'doubleDown', name: 'Double Down', cost: 1, type: 'ADJUST', rarity: 'uncommon',
    text: `Add ${SHARES} more shares in the direction you already hold.`,
    learn: { term: 'Pyramiding vs averaging down', text: 'Adding to a WINNING trade can boost profits. Adding to a LOSING one ("averaging down") is how many blow-ups start. Check your P&L before you press.' },
    play(s) {
      const shares = s.trades.flatMap((t) => t.legs).filter((l) => l.kind === 'stock').reduce((a, l) => a + l.qty, 0);
      if (shares === 0) return 'You need a stock position first.';
      const long = shares > 0;
      openTrade(s, long ? 'long' : 'short', `${long ? 'Long' : 'Short'} ${SHARES} ${s.day.ticker.symbol}`, [{ kind: 'stock', strike: 0, qty: long ? SHARES : -SHARES, entry: s.price }]);
      log(s, `Doubled down: ${long ? 'bought' : 'shorted'} ${SHARES} more at $${s.price.toFixed(2)}.`);
      return null;
    },
  },
  buyCalls: {
    id: 'buyCalls', name: 'Buy Calls', cost: 1, type: 'LONG', rarity: 'common',
    text: 'Cheap bet on a rise. You can only lose what you pay.',
    learn: { term: 'Call option', text: `The right to BUY at the strike price (${OPTION_CONTRACTS} contracts, expiring at 4pm). If the price shoots up you win big; if not, the call slowly loses value (time decay) and can expire worthless.` },
    play: (s) => buyOptions(s, 'call'),
  },
  buyPuts: {
    id: 'buyPuts', name: 'Buy Puts', cost: 1, type: 'SHORT', rarity: 'common',
    text: 'Cheap bet on a drop. You can only lose what you pay.',
    learn: { term: 'Put option', text: `The right to SELL at the strike price (${OPTION_CONTRACTS} contracts, expiring at 4pm). It gains when the price falls. Also used as insurance for shares you own.` },
    play: (s) => buyOptions(s, 'put'),
  },
  buyStraddle: {
    id: 'buyStraddle', name: 'Buy Straddle', cost: 2, type: 'VOL', rarity: 'rare',
    text: 'Own a call AND a put. Win on a big move either way.',
    learn: { term: 'Long straddle', text: 'You own both a call and a put at the same strike. You win if the price moves MORE than what you paid, up or down. Traders buy these before big news, and lose when nothing happens.' },
    play(s) {
      const tl = turnsLeft(s);
      const k = Math.round(s.price);
      const px = (type: 'call' | 'put') => Math.round(optionPrice(type, s.price, k, tl, s.iv) * 100) / 100;
      openTrade(s, 'straddle', `Straddle ${k}`, [
        { kind: 'call', strike: k, qty: OPTION_CONTRACTS, entry: px('call') },
        { kind: 'put', strike: k, qty: OPTION_CONTRACTS, entry: px('put') },
      ]);
      log(s, `Bought a ${k} straddle for ${fmtMoney((px('call') + px('put')) * OPTION_CONTRACTS * 100)}.`);
      return null;
    },
  },
  coveredCall: {
    id: 'coveredCall', name: 'Covered Call', cost: 1, type: 'PREMIUM', rarity: 'uncommon',
    text: 'Sell a call on shares you own. Paid now, upside capped.',
    learn: { term: 'Covered call', text: 'You sell someone the right to buy your shares at a higher price. You get paid now, but give up gains above the strike. With a protective put too, it is called a collar.' },
    play(s) {
      const t = [...s.trades].reverse().find((x) => (x.kind === 'long' || x.kind === 'protected') && !x.legs.some((l) => l.kind === 'call'));
      if (!t) return 'You need long shares without a call sold on them.';
      const tl = turnsLeft(s);
      const contracts = Math.round(t.legs[0].qty / 100);
      const strike = Math.ceil(s.price * (1 + expectedMove(s.iv, tl)));
      const entry = Math.round(optionPrice('call', s.price, strike, tl, s.iv) * 100) / 100;
      if (entry < MIN_CREDIT) return 'The call is worth almost nothing this late in the day.';
      t.legs.push({ kind: 'call', strike, qty: -contracts, entry });
      if (t.kind === 'long') t.kind = 'covered';
      t.label = t.kind === 'protected' ? `Collar ${t.legs.find((l) => l.kind === 'put')?.strike}/${strike}` : `Covered call ${strike}`;
      s.stats.premiumCollected += entry * contracts * 100;
      log(s, `Sold a ${strike} call on your shares for ${fmtMoney(entry * contracts * 100)}.`);
      return null;
    },
  },
};

function buyOptions(s: BattleState, type: 'call' | 'put'): string | null {
  const tl = turnsLeft(s);
  const strike = type === 'call' ? Math.ceil(s.price * 1.004) : Math.floor(s.price * 0.996);
  const entry = Math.round(optionPrice(type, s.price, strike, tl, s.iv) * 100) / 100;
  if (entry < MIN_CREDIT) return 'These options are almost worthless this late in the day.';
  openTrade(s, type === 'call' ? 'longCall' : 'longPut', `${OPTION_CONTRACTS} ${strike} ${type}s`, [{ kind: type, strike, qty: OPTION_CONTRACTS, entry }]);
  log(s, `Bought ${OPTION_CONTRACTS} ${strike} ${type}s for ${fmtMoney(entry * OPTION_CONTRACTS * 100)}.`);
  return null;
}

export interface DeckDef {
  id: string;
  name: string;
  blurb: string;
  winsWhen: string;
  risk: string;
  difficulty: number;
  /** Monday's score goal with this deck (later days ask for more). */
  goal: number;
  cards: CardId[];
  locked?: boolean;
}

export const DECKS: DeckDef[] = [
  {
    id: 'stock', name: 'Stock Starter', blurb: 'Buy and short shares. Simple, honest, and unforgiving.',
    winsWhen: 'Price goes your way', risk: 'Big if wrong: use stops', difficulty: 1, goal: 220,
    cards: ['buy', 'buy', 'buy', 'short', 'short', 'short', 'stop', 'stop', 'takeProfit', 'cutLoss', 'tape', 'protPut', 'espresso'],
  },
  {
    id: 'condor', name: 'Iron Condor', blurb: 'Sell options and get paid for time passing. Win when the market stays calm.',
    winsWhen: 'Price stays in a range', risk: 'Capped', difficulty: 3, goal: 450,
    cards: ['sellPut', 'sellPut', 'sellPut', 'sellCall', 'sellCall', 'sellCall', 'condor', 'takeProfit', 'takeProfit', 'roll', 'stop', 'tape', 'espresso'],
  },
  { id: 'wheel', name: 'The Wheel', blurb: 'Coming soon.', winsWhen: 'Slow and steady', risk: 'Own the drop', difficulty: 3, goal: 0, cards: [], locked: true },
  { id: 'straddle', name: 'Straddle', blurb: 'Coming soon.', winsWhen: 'A big move, any way', risk: 'Quiet days', difficulty: 4, goal: 0, cards: [], locked: true },
];

