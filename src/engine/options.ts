// Black-Scholes pricing for the European options the game trades.
// A trading day is split into TURNS_PER_DAY turns; option time is counted in turns.

export type OptionType = 'call' | 'put';

export const TURNS_PER_DAY = 8;
export const TRADING_DAYS_PER_YEAR = 252;
const TURNS_PER_YEAR = TURNS_PER_DAY * TRADING_DAYS_PER_YEAR;

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export function intrinsic(type: OptionType, spot: number, strike: number): number {
  return type === 'call' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
}

/** Price per share of an option with `turnsLeft` turns to expiry at annualised volatility `vol`. */
export function optionPrice(type: OptionType, spot: number, strike: number, turnsLeft: number, vol: number): number {
  const t = turnsLeft / TURNS_PER_YEAR;
  if (t <= 0 || vol <= 0) return intrinsic(type, spot, strike);
  const sd = vol * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (sd * sd) / 2) / sd;
  const d2 = d1 - sd;
  return type === 'call'
    ? spot * normCdf(d1) - strike * normCdf(d2)
    : strike * normCdf(-d2) - spot * normCdf(-d1);
}

/** One standard deviation of the price move over `turns` turns, as a fraction of the price. */
export function expectedMove(vol: number, turns: number): number {
  return vol * Math.sqrt(turns / TURNS_PER_YEAR);
}
