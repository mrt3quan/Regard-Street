// Valuing and opening trades. All money is in dollars; one option contract covers 100 shares.

import { expectedMove, optionPrice, TURNS_PER_DAY } from './options';
import type { BattleState, Leg, Trade, TradeKind } from './state';

export const CONTRACT = 100;

export function turnsLeft(s: BattleState): number {
  return Math.max(0, TURNS_PER_DAY - s.turn);
}

export function legValue(leg: Leg, price: number, iv: number, turns: number): number {
  if (leg.kind === 'stock') return leg.qty * price;
  return leg.qty * CONTRACT * optionPrice(leg.kind, price, leg.strike, turns, iv);
}

export function legCost(leg: Leg): number {
  return leg.kind === 'stock' ? leg.qty * leg.entry : leg.qty * CONTRACT * leg.entry;
}

export function tradePnl(t: Trade, price: number, iv: number, turns: number): number {
  return t.legs.reduce((sum, leg) => sum + legValue(leg, price, iv, turns) - legCost(leg), 0);
}

export function openPnl(s: BattleState): number {
  const tl = turnsLeft(s);
  return s.trades.reduce((sum, t) => sum + tradePnl(t, s.price, s.iv, tl), 0);
}

/** Today's total P&L: locked-in plus open. */
export function equity(s: BattleState): number {
  return s.realized + openPnl(s);
}

/** Money received up front for selling options (positive for credit spreads). */
export function credit(t: Trade): number {
  return -t.legs.filter((l) => l.kind !== 'stock').reduce((sum, l) => sum + legCost(l), 0);
}

/** Worst case loss if held to the close, or null when there is no hard limit. */
export function maxLoss(t: Trade): number | null {
  const opts = t.legs.filter((l) => l.kind !== 'stock');
  const stock = t.legs.find((l) => l.kind === 'stock');
  if (t.kind === 'putSpread' || t.kind === 'callSpread' || t.kind === 'condor') {
    // For each side, the loss is capped at the distance between the strikes.
    const widths = (['put', 'call'] as const).map((type) => {
      const legs = opts.filter((l) => l.kind === type);
      if (legs.length < 2) return 0;
      const contracts = Math.abs(legs[0].qty);
      return Math.abs(legs[0].strike - legs[1].strike) * contracts * CONTRACT;
    });
    return Math.max(...widths) - credit(t);
  }
  if (t.kind === 'protected' && stock) {
    const put = opts.find((l) => l.kind === 'put');
    if (put) return (stock.entry - put.strike) * stock.qty + put.entry * put.qty * CONTRACT;
  }
  if (t.stop != null) return t.stop;
  return null;
}

/**
 * Money at risk in a trade, for the risk budget. Defined-risk trades count their max loss;
 * naked stock counts as a bad day's move (8% of the position).
 */
export function riskOf(t: Trade): number {
  const ml = maxLoss(t);
  if (ml != null) return Math.max(0, ml);
  return t.legs.filter((l) => l.kind === 'stock').reduce((a, l) => a + Math.abs(l.qty) * l.entry * 0.08, 0);
}

export function totalRisk(s: BattleState): number {
  return s.trades.reduce((a, t) => a + riskOf(t), 0);
}

export function isDefinedRisk(t: Trade): boolean {
  return maxLoss(t) != null;
}

export function openTrade(s: BattleState, kind: TradeKind, label: string, legs: Leg[]): Trade {
  const t: Trade = { id: s.nextTradeId++, label, kind, legs, stop: null, openedTurn: s.turn };
  s.trades.push(t);
  s.stats.tradesOpened++;
  const c = credit(t);
  if (c > 0) s.stats.premiumCollected += c;
  return t;
}

/** Close a trade at the current price, locking in its P&L. Returns the P&L. */
export function closeTrade(s: BattleState, t: Trade, price = s.price, iv = s.iv, turns = turnsLeft(s)): number {
  const pnl = tradePnl(t, price, iv, turns);
  s.realized += pnl;
  s.trades = s.trades.filter((x) => x.id !== t.id);
  return pnl;
}

export function spreadWidth(price: number): number {
  return price >= 100 ? 3 : price >= 50 ? 2 : 1;
}

/**
 * Legs for a credit spread: sell an option `sds` expected moves away from the price
 * and buy a cheaper one further out as protection.
 */
export function creditSpreadLegs(s: BattleState, type: 'put' | 'call', sds: number, contracts: number): Leg[] {
  const tl = turnsLeft(s);
  const move = s.price * expectedMove(s.iv, tl) * sds;
  const w = spreadWidth(s.price);
  const short = type === 'put' ? Math.floor(s.price - Math.max(move, 0.5)) : Math.ceil(s.price + Math.max(move, 0.5));
  const long = type === 'put' ? short - w : short + w;
  const px = (k: number) => Math.round(optionPrice(type, s.price, k, tl, s.iv) * 100) / 100;
  return [
    { kind: type, strike: short, qty: -contracts, entry: px(short) },
    { kind: type, strike: long, qty: contracts, entry: px(long) },
  ];
}

export function fmtMoney(x: number, sign = false): string {
  const v = Math.round(x);
  const s = `$${Math.abs(v).toLocaleString('en-US')}`;
  if (v < 0) return `-${s}`;
  return sign ? `+${s}` : s;
}
