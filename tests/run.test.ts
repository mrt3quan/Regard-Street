import { describe, expect, it } from 'vitest';
import { buyCard, dayGoal, finishDay, newRun, nextDay, removeCard, reroll, battleFor } from '../src/engine/run';
import type { BattleState } from '../src/engine/state';

const ended = (b: BattleState, status: 'won' | 'lost', score: number, reason = ''): BattleState => ({ ...b, status, score, endReason: reason });

describe('the week', () => {
  it('goals rise through the week and Friday is the boss', () => {
    let r = newRun('wk', 'condor', 'riskBuddy', 'T');
    const goals: number[] = [];
    for (let d = 0; d < 5; d++) { goals.push(dayGoal(r)); r = { ...r, day: d + 1 }; }
    expect(goals).toEqual([...goals].sort((a, b) => a - b));
    expect(battleFor({ ...r, day: 4 }).boss).toBe(true);
    expect(battleFor({ ...r, day: 4 }).day.plan.some((p) => p.event?.name === 'Fed decision')).toBe(true);
  });

  it('missing a goal costs one heart, the loss limit costs two', () => {
    const r = newRun('hearts', 'stock', 'riskBuddy', 'T');
    const b = battleFor(r);
    expect(finishDay(r, ended(b, 'lost', 10, 'The bell rang')).trust).toBe(2);
    expect(finishDay(r, ended(b, 'lost', -900, 'Your P&L hit the $2,500 daily loss limit.')).trust).toBe(1);
    const won = finishDay(r, ended(b, 'won', b.goal * 2));
    expect(won.trust).toBe(3);
    expect(won.phase).toBe('shop');
    expect(won.cash).toBeGreaterThan(r.cash + 4);
  });

  it('three misses and you are fired', () => {
    let r = newRun('fired', 'stock', 'riskBuddy', 'T');
    for (let d = 0; d < 3; d++) {
      r = finishDay(r, ended(battleFor(r), 'lost', 0, 'The bell rang'));
      if (r.phase === 'shop') r = nextDay(r);
    }
    expect(r.phase).toBe('fired');
  });

  it('the shop sells cards, rerolls and removes within the rules', () => {
    let r = finishDay(newRun('shop', 'condor', 'riskBuddy', 'T'), ended(battleFor(newRun('shop', 'condor', 'riskBuddy', 'T')), 'won', 5000));
    r = { ...r, cash: 20 };
    const card = r.shop!.offers[0].card;
    const bought = buyCard(r, 0);
    if (typeof bought === 'string') throw new Error(bought);
    expect(bought.cards).toContain(card);
    expect(buyCard(bought, 0)).toBe('That card is gone.');
    const removed = removeCard(bought, 0);
    if (typeof removed === 'string') throw new Error(removed);
    expect(removed.cards.length).toBe(bought.cards.length - 1);
    expect(removeCard(removed, 0)).toBe('You can remove one card per visit.');
    const rolled = reroll(removed);
    if (typeof rolled === 'string') throw new Error(rolled);
    expect(rolled.cash).toBe(removed.cash - 2);
    expect(rolled.shop!.removed).toBe(true);
  });
});
