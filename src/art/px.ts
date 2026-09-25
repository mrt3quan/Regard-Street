// Soft pixel-art kit. Everything is drawn on a 427x240 grid and scaled 3x by the canvas.
// Shapes are built from masks so they get a dark outline, a bottom shade and a top highlight.

export const W = 427;
export const H = 240;
export const SCALE = 3;
export const OUT = '#3b2a36';

export interface Pal {
  base?: string;
  o?: string;
  shade?: string;
  hi?: string;
  /** Rows from the bottom edge that get the shade colour. */
  sd?: number;
  /** Rows from the top edge that get the highlight colour. */
  hd?: number;
  shine?: string;
}

let X: CanvasRenderingContext2D;

/** Point the kit at a canvas. Sets up the 3x pixel scale. */
export function paint(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  X = canvas.getContext('2d')!;
  X.imageSmoothingEnabled = false;
  X.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  X.clearRect(0, 0, W, H);
  return X;
}

export function R(x: number, y: number, w: number, h: number, c: string): void {
  X.fillStyle = c;
  X.fillRect(Math.round(x), Math.round(y), w, h);
}
export const P = (x: number, y: number, c: string) => R(x, y, 1, 1, c);
export function alpha(a: number, fn: () => void): void {
  const prev = X.globalAlpha;
  X.globalAlpha = a;
  fn();
  X.globalAlpha = prev;
}

interface Mask { w: number; h: number; at(x: number, y: number): boolean }
function mask(w: number, h: number, fn: (x: number, y: number) => boolean): Mask {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = fn(x, y) ? 1 : 0;
  return { w, h, at: (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1 };
}

function shape(ax: number, ay: number, m: Mask, pal: Pal): void {
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!m.at(x, y)) continue;
    let c = pal.base;
    if (pal.shade && !m.at(x, y + (pal.sd ?? 3))) c = pal.shade;
    if (pal.hi && !m.at(x, y - (pal.hd ?? 2)) && m.at(x, y + 3)) c = pal.hi;
    if (pal.o && (!m.at(x - 1, y) || !m.at(x + 1, y) || !m.at(x, y - 1) || !m.at(x, y + 1))) c = pal.o;
    if (c) P(ax + x, ay + y, c);
  }
}

const asPal = (p: Pal | string): Pal => (typeof p === 'string' ? { base: p } : p);

export function disc(cx: number, cy: number, r: number, pal: Pal | string): void {
  const p = asPal(pal);
  const x0 = Math.floor(cx - r), y0 = Math.floor(cy - r), n = Math.ceil(r * 2) + 1;
  shape(x0, y0, mask(n, n, (x, y) => { const dx = x0 + x + 0.5 - cx, dy = y0 + y + 0.5 - cy; return dx * dx + dy * dy <= r * r; }), p);
  if (p.shine) {
    const hx = cx - r * 0.35, hy = cy - r * 0.4, hr = r * 0.38;
    for (let y = Math.floor(hy - hr); y <= hy + hr; y++) for (let x = Math.floor(hx - hr); x <= hx + hr; x++) {
      const dx = x + 0.5 - hx, dy = y + 0.5 - hy;
      if (dx * dx + dy * dy <= hr * hr) P(x, y, p.shine);
    }
  }
}

export function ell(cx: number, cy: number, rx: number, ry: number, pal: Pal | string): void {
  const x0 = Math.floor(cx - rx), y0 = Math.floor(cy - ry);
  shape(x0, y0, mask(Math.ceil(rx * 2) + 1, Math.ceil(ry * 2) + 1, (x, y) => { const dx = (x0 + x + 0.5 - cx) / rx, dy = (y0 + y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; }), asPal(pal));
}

export function rr(x: number, y: number, w: number, h: number, r: number, pal: Pal | string): void {
  w = Math.round(w); h = Math.round(h);
  shape(Math.round(x), Math.round(y), mask(w, h, (i, j) => {
    const cx = Math.min(Math.max(i + 0.5, r), w - r), cy = Math.min(Math.max(j + 0.5, r), h - r);
    const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
    return dx * dx + dy * dy <= r * r + 0.3;
  }), asPal(pal));
}

/** Layered clumps (trees, hair, fur): each disc outlined so edges scallop. */
export function clumps(ax: number, ay: number, discs: [number, number, number][], pal: Pal): void {
  for (const [cx, cy, r] of discs) disc(ax + cx, ay + cy, r, pal);
}

export function shadow(cx: number, cy: number, rx: number, ry: number, a = 0.22): void {
  alpha(a, () => ell(cx, cy, rx, ry, '#2a1a22'));
}

export function spr(rows: string[], pal: Record<string, string>, x: number, y: number): void {
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.' && pal[ch]) P(x + i, y + j, pal[ch]); }));
}

export function shadeHex(h: string, a: number): string {
  const n = parseInt(h.slice(1, 7), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(a < 0 ? c * (1 + a) : c + (255 - c) * a)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('');
}

let seedState = 1;
export const seed = (n: number) => { seedState = n; };
export const rnd = () => (seedState = (seedState * 16807) % 2147483647) / 2147483647;
