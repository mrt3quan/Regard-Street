// Characters and scenes drawn with the pixel kit.

import type { Mood } from '../engine/market';
import { alpha, clumps, disc, ell, OUT, P, R, rnd, rr, seed, shadeHex, shadow, W, type Pal } from './px';

// ---------------------------------------------------------------- avatar

export const SKIN = [['#fbe0c8', '#efc4a4'], ['#f6cfae', '#e4ae8c'], ['#e0aa80', '#c98e66'], ['#c68b5e', '#a8704a'], ['#95603e', '#7a4c30'], ['#6a4030', '#553226']];
export const HAIR_COLORS = [['#2b1d27', '#4a3a44'], ['#6b3f2a', '#9a6040'], ['#c98a3a', '#e8b060'], ['#f0d080', '#fff0b0'], ['#f28bb0', '#ffb3cd'], ['#6aa0e0', '#9ac8f5'], ['#d8d8e0', '#ffffff'], ['#b83a3a', '#e06060']];
const HAIR_TOP: Record<string, [number, number, number][]> = {
  curly: [[-16, -6, 8], [16, -6, 8], [-10, -16, 11], [10, -16, 11], [0, -19, 12], [-2, -11, 9], [8, -10, 7]],
  neat: [[-15, -8, 8], [15, -8, 8], [0, -15, 15], [-8, -12, 10], [10, -12, 8]],
  long: [[-15, -8, 9], [15, -8, 9], [0, -16, 14], [-8, -11, 10], [8, -11, 10]],
  bob: [[-15, -8, 9], [15, -8, 9], [0, -16, 14], [-8, -11, 10], [8, -11, 10]],
  bun: [[-14, -9, 8], [14, -9, 8], [0, -15, 14], [-7, -11, 9], [7, -11, 9]],
  buzz: [[-9, -13, 10], [9, -13, 10], [0, -15, 12]],
  pony: [[-14, -9, 8], [14, -9, 8], [0, -15, 14], [6, -11, 10], [-8, -12, 8]],
  spiky: [[-16, -12, 6], [-9, -20, 7], [0, -23, 7], [9, -20, 7], [16, -12, 6], [0, -14, 13], [-7, -10, 8], [7, -10, 8]],
};
export const HAIR_STYLES = Object.keys(HAIR_TOP);

export interface Look {
  skin: number;
  hair: string;
  hairColor: number;
  outfit: 'suit' | 'hoodie' | 'sweater' | 'dress';
  outfitColor: string;
  accessory: 'none' | 'glasses' | 'cap' | 'flower';
}

export const DEFAULT_LOOK: Look = { skin: 1, hair: 'curly', hairColor: 1, outfit: 'suit', outfitColor: '#3d5a8a', accessory: 'glasses' };

export function head(cx: number, cy: number, k: number, o: Look): void {
  const s = (v: number) => v * k;
  const [sk, skS] = SKIN[o.skin];
  const [hc, hh] = HAIR_COLORS[o.hairColor];
  const HP: Pal = { base: hc, o: OUT, shade: shadeHex(hc, -0.15), hi: hh, hd: Math.max(2, Math.round(3 * k)) };
  if (o.hair === 'long') rr(cx - s(21), cy - s(8), s(42), s(36), s(8), HP);
  if (o.hair === 'bob') rr(cx - s(23), cy - s(10), s(46), s(28), s(9), HP);
  if (o.hair === 'pony') { disc(cx + s(21), cy + s(2), s(8), HP); disc(cx + s(24), cy + s(13), s(6), HP); }
  if (o.hair === 'bun') disc(cx, cy - s(26), s(9), HP);
  disc(cx, cy, s(21), { base: sk, o: OUT, shade: skS });
  clumps(cx, cy, HAIR_TOP[o.hair].map(([a, b, r]) => [s(a), s(b), s(r)]), HP);
  const ew = Math.max(2, Math.round(s(5))), eh = Math.max(3, Math.round(s(8)));
  rr(cx - s(10), cy, ew, eh, Math.min(2, ew / 2), '#2b1d27');
  rr(cx + s(5), cy, ew, eh, Math.min(2, ew / 2), '#2b1d27');
  if (k > 0.6) { R(cx - s(9), cy + 1, 2, 2, '#fff'); R(cx + s(6), cy + 1, 2, 2, '#fff'); }
  alpha(0.55, () => {
    ell(cx - s(13), cy + s(12), Math.max(1.5, s(4)), Math.max(1, s(2)), '#f08a8a');
    ell(cx + s(13), cy + s(12), Math.max(1.5, s(4)), Math.max(1, s(2)), '#f08a8a');
  });
  if (k > 0.6) { R(cx - s(2), cy + s(13), s(5), 1, OUT); P(cx - s(3), cy + s(12), OUT); P(cx + s(3), cy + s(12), OUT); }
  else R(cx - 1, cy + s(13), 2, 1, OUT);
  if (o.accessory === 'glasses') {
    const gw = s(12), gh = s(11);
    alpha(0.3, () => { rr(cx - s(14), cy - s(2), gw, gh, 3, '#dff3ff'); rr(cx + s(2), cy - s(2), gw, gh, 3, '#dff3ff'); });
    rr(cx - s(14), cy - s(2), gw, gh, 3, { o: OUT }); rr(cx + s(2), cy - s(2), gw, gh, 3, { o: OUT });
    R(cx - s(2), cy + s(2), s(4), 1, OUT);
  }
  if (o.accessory === 'cap') {
    const cp: Pal = { base: o.outfitColor, o: OUT, shade: shadeHex(o.outfitColor, -0.15), hi: '#ffffff44' };
    ell(cx + s(8), cy - s(12), s(16), s(4), cp);
    rr(cx - s(19), cy - s(29), s(38), s(19), s(9), cp);
  }
  if (o.accessory === 'flower') { disc(cx + s(15), cy - s(14), s(5), { base: '#ffb3cd', o: OUT }); disc(cx + s(15), cy - s(14), s(2), '#ffd35a'); }
}

export function avatar(cx: number, fy: number, o: Look, k = 1): void {
  const s = (v: number) => Math.round(v * k);
  const [sk] = SKIN[o.skin];
  const oc = o.outfitColor;
  const OP: Pal = { base: oc, o: OUT, shade: shadeHex(oc, -0.2), sd: 4 };
  shadow(cx, fy, s(20), s(4), 0.28);
  const legC = o.outfit === 'dress' ? sk : '#4a4a5e';
  rr(cx - s(10), fy - s(22), s(8), s(20), 3, { base: legC, o: OUT });
  rr(cx + s(2), fy - s(22), s(8), s(20), 3, { base: legC, o: OUT });
  rr(cx - s(12), fy - s(5), s(11), s(6), 3, { base: '#3b2a36', o: OUT });
  rr(cx + s(1), fy - s(5), s(11), s(6), 3, { base: '#3b2a36', o: OUT });
  if (o.outfit === 'hoodie') ell(cx, fy - s(58), s(15), s(6), { base: shadeHex(oc, -0.2), o: OUT });
  rr(cx - s(17), fy - s(58), s(34), s(40), s(9), OP);
  if (o.outfit === 'suit') {
    for (let j = 0; j < s(14); j++) R(cx - s(7) + j / 2, fy - s(57) + j, Math.max(0, s(14) - j), 1, j < s(11) ? '#fffaf0' : oc);
    rr(cx - s(2), fy - s(52), s(5), s(18), 2, { base: '#e8715a', o: OUT });
  }
  if (o.outfit === 'hoodie') {
    rr(cx - s(10), fy - s(34), s(20), s(10), 3, { base: shadeHex(oc, -0.12), o: shadeHex(oc, -0.35) });
    R(cx - s(4), fy - s(55), 1, s(12), '#fffaf0'); R(cx + s(4), fy - s(55), 1, s(12), '#fffaf0');
  }
  if (o.outfit === 'sweater') {
    R(cx - s(16), fy - s(44), s(32), s(4), '#fffaf0'); R(cx - s(16), fy - s(34), s(32), s(4), '#fffaf0');
    rr(cx - s(7), fy - s(59), s(14), s(5), 2, { base: '#fffaf0', o: OUT });
  }
  if (o.outfit === 'dress') {
    for (let j = 0; j < s(16); j++) R(cx - s(17) - j / 2.5, fy - s(28) + j, s(34) + j / 1.25, 1, j === s(16) - 1 ? OUT : oc);
    disc(cx, fy - s(50), s(3), { base: '#fff', o: OUT });
  }
  rr(cx - s(24), fy - s(54), s(9), s(26), 4, OP);
  rr(cx + s(15), fy - s(54), s(9), s(26), 4, OP);
  disc(cx - s(20), fy - s(26), s(4.5), { base: sk, o: OUT });
  disc(cx + s(20), fy - s(26), s(4.5), { base: sk, o: OUT });
  head(cx, fy - s(76), k, o);
}

// ---------------------------------------------------------------- Mr. Market

const MOOD_MASK: Record<Mood, { mask: string; suit: string }> = {
  calm: { mask: '#fffaf0', suit: '#5a6a88' },
  jittery: { mask: '#fff2b0', suit: '#5a4a78' },
  wild: { mask: '#ffd0d0', suit: '#7a3a5a' },
};

/** Mr. Market. His mask shows how jumpy the day is, never which way it will go. */
export function mrMarket(bx: number, by: number, mood: Mood, boss = false): void {
  const m = boss ? { mask: '#fffaf0', suit: '#2f3a5a' } : MOOD_MASK[mood];
  const SUIT: Pal = { base: m.suit, o: OUT, shade: shadeHex(m.suit, -0.18), sd: 4 };
  shadow(bx, by, 30, 5, 0.3);
  rr(bx - 12, by - 26, 10, 24, 3, { base: '#3b3050', o: OUT }); rr(bx + 2, by - 26, 10, 24, 3, { base: '#3b3050', o: OUT });
  rr(bx - 14, by - 5, 13, 6, 3, { base: '#2b1d27', o: OUT }); rr(bx + 1, by - 5, 13, 6, 3, { base: '#2b1d27', o: OUT });
  rr(bx - 22, by - 72, 44, 50, 11, SUIT);
  for (let j = 0; j < 18; j++) R(bx - 8 + j / 2, by - 71 + j, 16 - j, 1, '#fffaf0');
  disc(bx - 4, by - 66, 3.5, { base: '#ffc94a', o: OUT }); disc(bx + 4, by - 66, 3.5, { base: '#ffc94a', o: OUT }); disc(bx, by - 66, 2, { base: '#e0a020', o: OUT });
  rr(bx - 30, by - 68, 10, 30, 5, SUIT); rr(bx + 20, by - 68, 10, 30, 5, SUIT);
  disc(bx - 25, by - 36, 5, { base: '#f0d0b8', o: OUT }); disc(bx + 25, by - 36, 5, { base: '#f0d0b8', o: OUT });
  if (boss) {
    // The Chair holds a gavel instead of the die and coin.
    rr(bx + 24, by - 62, 4, 30, 1, { base: '#8a5a3c', o: OUT });
    rr(bx + 16, by - 70, 22, 12, 4, { base: '#a86a45', o: OUT, shade: '#8a5232', sd: 3 });
    rr(bx - 38, by - 50, 16, 20, 2, { base: '#fffaf0', o: OUT });
    for (let j = 0; j < 4; j++) R(bx - 35, by - 46 + j * 4, 10, 1, '#b8b0a8');
  } else {
    rr(bx + 20, by - 50, 16, 16, 4, { base: '#fffaf0', o: OUT, shade: '#e8dccb', sd: 2 });
    for (const [a, b] of [[24, -46], [30, -46], [27, -43], [24, -40], [30, -40]]) R(bx + a, by + b, 2, 2, OUT);
    disc(bx - 30, by - 44, 7, { base: '#ffc94a', o: OUT, shine: '#fff2b0' });
  }
  disc(bx, by - 92, 20, { base: '#f0d0b8', o: OUT, shade: '#e0b89c' });
  ell(bx, by - 95, 19, 9, { base: m.mask, o: OUT, shade: shadeHex(m.mask, -0.08), sd: 2 });
  ell(bx - 8, by - 95, 4, 3, '#2b1d27'); ell(bx + 8, by - 95, 4, 3, '#2b1d27');
  P(bx - 9, by - 96, '#fff'); P(bx + 7, by - 96, '#fff');
  R(bx - 5, by - 80, 10, 1, OUT);
  ell(bx, by - 110, 24, 4, { base: '#3b2a36', o: OUT });
  rr(bx - 14, by - 134, 28, 25, 6, { base: '#4a3a5a', o: OUT, hi: '#6a5a7a' });
  R(bx - 13, by - 116, 26, 4, boss ? '#e8574a' : '#ffc94a');
}

// ---------------------------------------------------------------- office

export function office(): void {
  seed(5);
  R(0, 0, W, 150, '#f0dcb8');
  for (let x = 0; x < W; x += 10) R(x, 0, 4, 112, '#ead2aa');
  R(0, 110, W, 42, '#b7784a'); R(0, 110, W, 3, '#d89a68'); R(0, 150, W, 2, '#6e4430');
  for (let x = 6; x < W; x += 36) rr(x, 117, 28, 28, 2, { base: '#a86a45', o: '#8a5232' });
  R(0, 152, W, 88, '#c98a58');
  for (let y = 152; y < 240; y += 8) { R(0, y, W, 1, '#a86a45'); for (let x = ((y / 8) % 2) * 20; x < W; x += 40) R(x, y, 1, 8, '#a86a45'); }
  for (let i = 0; i < 200; i++) P(Math.floor(rnd() * W), 152 + Math.floor(rnd() * 88), '#d49a68');
  ell(214, 186, 150, 30, { base: '#c9665a', o: '#8a4a3e', shade: '#b0564a', sd: 3 });
  ell(214, 186, 138, 24, { base: '#e8a070', o: '#b0564a' });
  ell(214, 186, 126, 18, '#c9665a');
  // bookshelf
  rr(372, 56, 50, 58, 3, { base: '#8a5a3c', o: OUT });
  for (let sh = 0; sh < 2; sh++) {
    R(375, 60 + sh * 26, 44, 22, '#5a3a2a'); R(375, 82 + sh * 26, 44, 3, '#a86a45');
    for (let b = 0; b < 8; b++) {
      const c = ['#e8715a', '#6aa0e0', '#ffd35a', '#8fd6c4', '#b58af0', '#f07a8a'][Math.floor(rnd() * 6)];
      const h = 14 + Math.floor(rnd() * 7);
      rr(377 + b * 5, 82 + sh * 26 - h, 5, h, 1, { base: c, o: OUT });
    }
  }
  // plant
  rr(146, 126, 16, 16, 3, { base: '#e8715a', o: OUT, shade: '#c95a46' });
  clumps(154, 122, [[-7, -6, 6], [7, -8, 6], [0, -14, 7], [-3, -3, 5], [4, -2, 5]], { base: '#5fa653', o: '#2f5a3e', shade: '#4d8f48', hi: '#80c465' });
  // wall TV frame (the chart is drawn by its own canvas on top)
  rr(150, 18, 132, 70, 5, { base: '#3b2a36', o: OUT });
  rr(154, 22, 124, 62, 3, '#27303e');
  // clipboard board
  rr(6, 32, 88, 76, 5, { base: '#a86a45', o: OUT, shade: '#8a5232', sd: 3 });
  rr(38, 29, 24, 8, 3, { base: '#c8c0c8', o: OUT });
}
