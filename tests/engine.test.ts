import { describe, expect, it } from 'vitest';
import { endTurn, newBattle, playCard } from '../src/engine/battle';
import { createDay, turnPath, TICKS } from '../src/engine/market';
import { normCdf, optionPrice } from '../src/engine/options';
import { maxLoss, tradePnl } from '../src/engine/trades';
import type { BattleState } from '../src/engine/state';

const play = (s: BattleState, id: string) => {
  const card = s.hand.find((c) => c.id === id);
  if (!card) throw new Error(`no ${id} in hand`);
  const r = playCard(s, card.uid);
  if (r.error) throw new Error(r.error);
  return r.state;
};
const withHand = (s: BattleState, ids: string[]): BattleState => ({ ...s, hand: ids.map((id, i) => ({ uid: 1000 + i, id: id as never })), focus: 10 });

describe('options math', () => {
  it('normCdf matches known values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
  });
  it('satisfies put-call parity (no interest)', () => {
    const c = optionPrice('call', 100, 102, 4, 0.4);
    const p = optionPrice('put', 100, 102, 4, 0.4);
    expect(c - p).toBeCloseTo(100 - 102, 6);
  });
  it('is worth intrinsic value at expiry', () => {
    expect(optionPrice('put', 95, 100, 0, 0.5)).toBe(5);
    expect(optionPrice('call', 95, 100, 0, 0.5)).toBe(0);
  });
});

describe('market', () => {
  it('is deterministic for a seed', () => {
    expect(createDay('abc')).toEqual(createDay('abc'));
    expect(createDay('abc').returns).not.toEqual(createDay('abd').returns);
  });
  it('paths start at the price and land on the planned return', () => {
    const d = createDay('path');
    const p = turnPath(d, 3, 100);
    expect(p).toHaveLength(TICKS + 1);
    expect(p[0]).toBeCloseTo(100, 9);
    expect(Math.log(p[TICKS] / 100)).toBeCloseTo(d.returns[3], 9);
  });
  it('the market ignores what the player does', () => {
    let a = newBattle('same', 'stock', []);
    let b = newBattle('same', 'stock', []);
    b = play(withHand(b, ['buy']), 'buy');
    for (let i = 0; i < 8; i++) { a = endTurn(a).state; b = endTurn(b).state; if (a.status !== 'playing') break; }
    expect(a.candles.map((c) => c.c)).toEqual(b.candles.map((c) => c.c));
  });
});

describe('trades', () => {
  it('credit spreads have a capped max loss that matches expiry payoff', () => {
    let s = play(withHand(newBattle('spread', 'condor', []), ['sellPut']), 'sellPut');
    const t = s.trades[0];
    const worst = tradePnl(t, 1, s.iv, 0); // price crashes to $1 at expiry
    expect(maxLoss(t)).toBeCloseTo(-worst, 6);
    expect(tradePnl(t, 10_000, s.iv, 0)).toBeGreaterThan(0); // far above: keep the credit
  });
  it('stops close a trade once its loss reaches the limit', () => {
    // Find a day where a stopped long position actually gets hit.
    for (let i = 0; i < 100; i++) {
      let s = newBattle(`stops-${i}`, 'stock', []);
      s = play(withHand(s, ['buy', 'stop']), 'buy');
      s = play(s, 'stop');
      expect(s.trades[0].stop).toBe(250);
      for (let t = 0; t < 8 && s.status === 'playing' && s.trades.length; t++) s = endTurn(s).state;
      if (s.stats.stopsHit === 0) continue;
      // Closed at the first tick past the stop: a loss of at least $250, plus at most one tick of slippage.
      expect(s.realized).toBeLessThanOrEqual(-250 + 1e-6);
      expect(s.realized).toBeGreaterThan(-600);
      return;
    }
    throw new Error('no seed triggered a stop');
  });
  it('score adds chips x mult every turn', () => {
    let s = play(withHand(newBattle('mult', 'condor', []), ['condor']), 'condor');
    const r = endTurn(s);
    expect(r.result!.mult).toBe(3); // base + defined risk + full condor
    expect(r.state.score).toBe(Math.round(r.result!.chips * 3));
  });
});
