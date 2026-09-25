import type { CardId } from './cards';
import type { EdgeId } from './edges';
import type { MarketDay, MarketEvent } from './market';

/** One piece of a trade. Stock: qty shares at entry price. Option: qty contracts (+ long, - short) at entry premium per share. */
export interface Leg {
  kind: 'stock' | 'call' | 'put';
  strike: number;
  qty: number;
  entry: number;
}

export type TradeKind = 'long' | 'short' | 'protected' | 'putSpread' | 'callSpread' | 'condor';

export interface Trade {
  id: number;
  label: string;
  kind: TradeKind;
  legs: Leg[];
  /** Close automatically if the trade's loss reaches this many dollars. */
  stop: number | null;
  openedTurn: number;
}

export interface CardInstance {
  uid: number;
  id: CardId;
}

export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface MultPart {
  name: string;
  value: number;
  why: string;
}

export interface LogLine {
  turn: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

export interface TurnResult {
  turn: number;
  path: number[];
  /** The move of the turn as a fraction of price. */
  move: number;
  /** Dollar P&L of the turn. */
  chips: number;
  mult: number;
  parts: MultPart[];
  /** chips x mult, added to the score. */
  gained: number;
  stopped: string[];
  event: MarketEvent | null;
}

export interface DayStats {
  tradesOpened: number;
  bestTurn: number;
  worstTurn: number;
  stopsHit: number;
  heldThroughEvent: boolean;
  premiumCollected: number;
}

export interface BattleState {
  seed: string;
  deckId: string;
  day: MarketDay;
  edges: EdgeId[];
  /** Index of the turn being played, 0..TURNS_PER_DAY. TURNS_PER_DAY means the market has closed. */
  turn: number;
  status: 'playing' | 'won' | 'lost';
  endReason: string | null;
  price: number;
  iv: number;
  candles: Candle[];
  focus: number;
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhausted: CardInstance[];
  shuffles: number;
  trades: Trade[];
  nextTradeId: number;
  /** Dollars locked in by closed trades today. */
  realized: number;
  score: number;
  goal: number;
  /** The risk desk shuts you down if the day's P&L falls to minus this. */
  lossLimit: number;
  /** Most money you may have at risk at once (grows with promotions). */
  riskBudget: number;
  log: LogLine[];
  lastTurn: TurnResult | null;
  stats: DayStats;
}
