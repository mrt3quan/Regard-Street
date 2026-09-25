// Plays many days with simple bots to check the goal is reachable with skill and not by luck.
import { describe, expect, it } from 'vitest';
import { endTurn, newDeckBattle as newBattle, playCard } from '../src/engine/battle';
import { CARDS, type CardId } from '../src/engine/cards';
import { rng } from '../src/engine/rng';
import type { BattleState } from '../src/engine/state';
import { tradePnl, turnsLeft } from '../src/engine/trades';
import { battleFor, finishDay, newRun, nextDay, type RunState } from '../src/engine/run';

type Bot = (s: BattleState, r: ReturnType<typeof rng>) => CardId[];

function tryPlay(s: BattleState, id: CardId): BattleState {
  const c = s.hand.find((x) => x.id === id);
  if (!c) return s;
  const r = playCard(s, c.uid);
  return r.error ? s : r.state;
}

function playDay(start: BattleState, seed: string, bot: Bot): BattleState {
  let s = start;
  const r = rng(`${seed}:bot`);
  while (s.status === 'playing') {
    for (let guard = 0; guard < 10; guard++) {
      const wants = bot(s, r);
      const next = wants.reduce(tryPlay, s);
      if (next === s) break;
      s = next;
    }
    s = endTurn(s).state;
  }
  return s;
}

const random: Bot = (s, r) => (s.hand.length ? [r.pick(s.hand).id] : []);

const isOpt = (k: string) => k !== 'long' && k !== 'short' && k !== 'protected';

/** Sells premium on quiet turns, stacks it, and gets flat before scheduled events. */
const condorPro: Bot = (s) => {
  const plan = s.day.plan[s.turn];
  const hasOpts = s.trades.some((t) => isOpt(t.kind));
  if (plan.event) return hasOpts ? ['takeProfit', 'cutLoss'] : ['tape'];
  const tl = turnsLeft(s);
  if (s.trades.some((t) => tradePnl(t, s.price, s.iv, tl) < -400)) return ['roll', 'cutLoss'];
  if (s.turn >= 6) return ['tape'];
  return ['condor', 'sellPut', 'sellCall', 'tape'];
};

/** Follows the last move with stacked shares, stops on everything, cuts losers. */
const momentumPro: Bot = (s) => {
  const last = s.candles[s.candles.length - 1];
  const shares = s.trades.flatMap((t) => t.legs).filter((l) => l.kind === 'stock').reduce((a, l) => a + l.qty, 0);
  const wants: CardId[] = ['tape'];
  if (last && s.turn < 7) {
    const up = last.c > last.o;
    if (shares !== 0 && Math.sign(shares) !== (up ? 1 : -1)) wants.push('cutLoss', 'takeProfit');
    wants.push(up ? 'buy' : 'short', up ? 'buy' : 'short');
  }
  wants.push('stop');
  return wants;
};

/** Stacks as much risk as possible with no protection. */
const reckless: Bot = () => ['buy', 'short', 'sellPut', 'sellCall', 'condor', 'espresso'];

function run(seed: string, deck: string, bot: Bot): BattleState {
  return playDay(newBattle(seed, deck, []), seed, bot);
}

/** Plays whole weeks without shopping; returns how often the week is cleared. */
function weekRate(deck: string, bot: Bot, n = 200): number {
  let cleared = 0;
  for (let i = 0; i < n; i++) {
    let r: RunState = newRun(`week-${i}`, deck, 'riskBuddy', 'Bot');
    while (r.phase !== 'cleared' && r.phase !== 'fired') {
      r = finishDay(r, playDay(battleFor(r), `${r.seed}:${r.day}`, bot));
      if (r.phase === 'shop') r = nextDay(r);
    }
    if (r.phase === 'cleared') cleared++;
  }
  return cleared / n;
}

function stats(deck: string, bot: Bot, n = 400) {
  let wins = 0, lossLimit = 0, total = 0;
  for (let i = 0; i < n; i++) {
    const s = run(`bal-${i}`, deck, bot);
    if (s.status === 'won') wins++;
    if (s.endReason?.includes('loss limit')) lossLimit++;
    total += s.score;
  }
  return { winRate: wins / n, lossLimitRate: lossLimit / n, avgScore: Math.round(total / n) };
}

describe('balance', () => {
  it('rewards skill over random play', () => {
    const table = {
      randomStock: stats('stock', random),
      momentumStock: stats('stock', momentumPro),
      randomCondor: stats('condor', random),
      proCondor: stats('condor', condorPro),
      recklessCondor: stats('condor', reckless),
      recklessStock: stats('stock', reckless),
    };
    process.stdout.write('\nBAL ' + Object.entries(table).map(([k, v]) => `${k.padEnd(15)} win ${(v.winRate * 100).toFixed(1).padStart(5)}%  limit ${(v.lossLimitRate * 100).toFixed(1).padStart(5)}%  avg ${v.avgScore}`).join('\nBAL ') + '\n');
    expect(table.momentumStock.winRate).toBeGreaterThan(table.randomStock.winRate + 0.1);
    expect(table.proCondor.winRate).toBeGreaterThan(table.randomCondor.winRate + 0.1);
  });

  it('a skilled week clears far more often than a random one', () => {
    const weeks = {
      randomStock: weekRate('stock', random),
      momentumStock: weekRate('stock', momentumPro),
      randomCondor: weekRate('condor', random),
      proCondor: weekRate('condor', condorPro),
    };
    process.stdout.write('\nWEEK ' + Object.entries(weeks).map(([k, v]) => `${k.padEnd(15)} cleared ${(v * 100).toFixed(1)}%`).join('\nWEEK ') + '\n');
    expect(weeks.momentumStock).toBeGreaterThan(weeks.randomStock * 2);
    expect(weeks.proCondor).toBeGreaterThan(weeks.randomCondor * 2);
    void CARDS; void reckless;
  });
});
