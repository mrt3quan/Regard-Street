// The market for one trading day, fully decided at the start of the day from the seed.
//
// Model (all hidden from the player except the per-turn size of the next move):
//   turn return = sigma_i * e_i,   e_i = rho * e_(i-1) + sqrt(1 - rho^2) * z_i
//   - sigma_i follows the intraday U-shape (busy open and close, quiet lunch)
//   - realised volatility is usually a bit LOWER than implied volatility (the "volatility
//     risk premium" that option sellers earn in real markets), except on wild days
//   - one turn may carry a scheduled event (Fed speech, CEO live stream...) with a much
//     bigger move; implied volatility drops after it ("IV crush")
//   - rho is the day's hidden character: trend days (moves follow through) or choppy
//     days (moves reverse). The player can only learn it by watching the price.
// The direction of every move is random. Mr. Market reveals size, never direction.

import { expectedMove, TURNS_PER_DAY } from './options';
import { rng } from './rng';

export interface Ticker {
  symbol: string;
  name: string;
  sector: string;
  price: number;
}

/** Fictional companies. None of these are real. */
export const TICKERS: readonly Ticker[] = [
  { symbol: 'NOVX', name: 'Novex Semiconductor', sector: 'Tech', price: 142.2 },
  { symbol: 'VOLT', name: 'Voltra Motors', sector: 'Autos', price: 88.1 },
  { symbol: 'PTRL', name: 'Petrola Energy', sector: 'Oil', price: 61.3 },
  { symbol: 'AURM', name: 'Aurum Mining', sector: 'Gold', price: 48.4 },
  { symbol: 'MEDX', name: 'Medixa Health', sector: 'Health', price: 118.5 },
];

export type Mood = 'calm' | 'jittery' | 'wild';

export interface MarketEvent {
  name: string;
  blurb: string;
  /** Multiplier on the turn's normal move size. */
  size: number;
}

export interface TurnPlan {
  index: number;
  /** Clock label for the start of the turn, e.g. "9:30 am". */
  start: string;
  end: string;
  /** One standard deviation of this turn's move, as a fraction of price. Shown to the player. */
  sigma: number;
  event: MarketEvent | null;
}

export interface MarketDay {
  seed: string;
  ticker: Ticker;
  open: number;
  /** Implied volatility options are priced with (annualised). */
  iv: number;
  /** Implied volatility after the day's event, if any. */
  ivAfterEvent: number;
  mood: Mood;
  plan: TurnPlan[];
  /** Hidden: each turn's log return. Fixed up front so the player cannot influence the market. */
  returns: number[];
  /** Hidden: + for trend days, - for choppy days. */
  rho: number;
}

const INTRADAY_SHAPE = [1.45, 1.1, 0.9, 0.8, 0.8, 0.9, 1.0, 1.25];
const SHAPE_NORM = Math.sqrt(INTRADAY_SHAPE.reduce((s, w) => s + w * w, 0) / INTRADAY_SHAPE.length);
const REALISED_OVER_IMPLIED: Record<Mood, number> = { calm: 0.65, jittery: 0.8, wild: 1.05 };
const FAT_TAIL_P = 0.07;
/** Variance of a shock that is doubled with probability FAT_TAIL_P. */
const FAT_TAIL_VAR = 1 - FAT_TAIL_P + 4 * FAT_TAIL_P;

const EVENTS: readonly MarketEvent[] = [
  { name: 'Fed speech', blurb: 'The Central Reserve chair speaks. Rates could move, and so could everything else.', size: 3.8 },
  { name: 'CEO live stream', blurb: 'The CEO is going live. Nobody knows what will be said.', size: 4.2 },
  { name: 'Jobs report', blurb: 'The monthly jobs number drops. Good or bad, the market reacts.', size: 3.4 },
  { name: 'Analyst call', blurb: 'A famous analyst is about to publish a big call on the stock.', size: 3.2 },
  { name: 'Sector news', blurb: 'Big news is breaking for the whole sector.', size: 3.6 },
];

export function turnClock(index: number): string {
  const minutes = 9 * 60 + 30 + Math.round((index * 390) / TURNS_PER_DAY);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

export function createDay(seed: string, ticker?: Ticker): MarketDay {
  const r = rng(`${seed}:day`);
  const t = ticker ?? r.pick(TICKERS);
  const iv = Math.round(r.uniform(0.3, 0.55) * 100) / 100;
  const mood: Mood = r.pick(['calm', 'calm', 'jittery', 'jittery', 'wild']);
  const rho = r.next() < 0.65 ? r.uniform(0.35, 0.55) : r.uniform(-0.3, -0.1);
  const eventTurn = r.next() < 0.75 ? 2 + r.int(5) : -1;
  const event = eventTurn >= 0 ? r.pick(EVENTS) : null;

  // Correlated turns add up to a bigger (trend) or smaller (chop) day. Rescale so the whole
  // day's move stays in line with the mood, and fat tails don't inflate it either.
  const n = INTRADAY_SHAPE.length;
  let dayVar = n;
  for (let k = 1; k < n; k++) dayVar += 2 * (n - k) * rho ** k;
  const autocorrFix = Math.sqrt(n / dayVar) / Math.sqrt(FAT_TAIL_VAR);
  const ivTurn = expectedMove(iv, 1);
  const plan: TurnPlan[] = INTRADAY_SHAPE.map((w, i) => {
    const ev = i === eventTurn ? event : null;
    const sigma = ivTurn * (w / SHAPE_NORM) * REALISED_OVER_IMPLIED[mood] * autocorrFix * (ev ? ev.size : 1);
    return { index: i, start: turnClock(i), end: turnClock(i + 1), sigma, event: ev };
  });

  const shocks = rng(`${seed}:moves`);
  const returns: number[] = [];
  let e = 0;
  plan.forEach((p, i) => {
    let z = shocks.normal();
    if (shocks.next() < FAT_TAIL_P) z *= 2; // fat tails: markets jump more often than a bell curve says
    e = i === 0 ? z : rho * e + Math.sqrt(1 - rho * rho) * z;
    returns.push(p.sigma * e);
  });

  return { seed, ticker: t, open: t.price, iv, ivAfterEvent: Math.round(iv * 0.7 * 100) / 100, mood, plan, returns, rho };
}

/** Price path for turn `index` (TICKS + 1 points, from `start` to the turn's close). */
export const TICKS = 12;
export function turnPath(day: MarketDay, index: number, start: number): number[] {
  const r = rng(`${day.seed}:path:${index}`);
  const total = day.returns[index];
  const step = (day.plan[index].sigma / Math.sqrt(TICKS)) * 0.8;
  const walk = [0];
  for (let k = 1; k <= TICKS; k++) walk.push(walk[k - 1] + step * r.normal());
  // Brownian bridge: keep the wiggles but land exactly on the turn's return.
  return walk.map((w, k) => start * Math.exp(w - (k / TICKS) * walk[TICKS] + (k / TICKS) * total));
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
