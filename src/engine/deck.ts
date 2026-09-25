import { rng } from './rng';
import type { BattleState } from './state';

/** Draw n cards, shuffling the discard pile back in when the draw pile runs out. */
export function drawCards(s: BattleState, n: number): void {
  for (let i = 0; i < n; i++) {
    if (!s.drawPile.length) {
      if (!s.discardPile.length) return;
      s.drawPile = rng(`${s.seed}:shuffle:${s.shuffles++}`).shuffle(s.discardPile);
      s.discardPile = [];
    }
    s.hand.push(s.drawPile.shift()!);
  }
}
