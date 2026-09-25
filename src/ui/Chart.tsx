import { useEffect, useRef } from 'react';
import type { Candle } from '../engine/state';
import { TURNS_PER_DAY } from '../engine/options';

export interface ChartLine {
  price: number;
  color: string;
  label: string;
}

interface Props {
  candles: Candle[];
  /** Ticks of the turn currently being animated. */
  live: number[] | null;
  price: number;
  lines: ChartLine[];
  /** Size of the next move (fraction), drawn as a bracket with a question mark. */
  nextMove: number | null;
  width: number;
  height: number;
}

const U = 3; // screen pixels per chart pixel

/** The office TV: one candle per turn, your strikes as dashed lines, and the size (never the direction) of the next move. */
export function Chart({ candles, live, price, lines, nextMove, width, height }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const x = c.getContext('2d')!;
    const lw = Math.floor(width / U), lh = Math.floor(height / U);
    const r = (px: number, py: number, w: number, h: number, col: string) => {
      x.fillStyle = col;
      x.fillRect(Math.round(px) * U, Math.round(py) * U, Math.max(1, Math.round(w)) * U, Math.max(1, Math.round(h)) * U);
    };
    x.clearRect(0, 0, c.width, c.height);
    r(0, 0, lw, lh, '#27303e');

    const all = candles.flatMap((k) => [k.h, k.l]).concat(live ?? [], [price]);
    if (nextMove) all.push(price * (1 + nextMove), price * (1 - nextMove));
    let lo = Math.min(...all), hi = Math.max(...all);
    for (const l of lines) { if (l.price > lo - (hi - lo) && l.price < hi + (hi - lo)) { lo = Math.min(lo, l.price); hi = Math.max(hi, l.price); } }
    const pad = Math.max((hi - lo) * 0.12, price * 0.004);
    lo -= pad; hi += pad;
    const top = 11, bottom = lh - 3;
    const Y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    const plotW = lw - 26;
    const slot = plotW / TURNS_PER_DAY;

    for (let j = top; j < bottom; j += 10) r(2, j, lw - 4, 1, '#324050');

    for (const l of lines) {
      if (l.price < lo || l.price > hi) continue;
      for (let i = 2; i < plotW + 2; i += 3) r(i, Y(l.price), 2, 1, l.color);
    }

    const drawCandle = (k: Candle, i: number) => {
      const up = k.c >= k.o;
      const col = up ? '#7ee0a0' : '#f28b8b';
      const cx = 2 + i * slot + slot / 2;
      r(cx, Y(k.h), 1, Y(k.l) - Y(k.h) + 1, col);
      r(cx - 2, Y(Math.max(k.o, k.c)), 5, Math.max(1, Y(Math.min(k.o, k.c)) - Y(Math.max(k.o, k.c))), col);
    };
    candles.forEach(drawCandle);
    if (live && live.length) {
      drawCandle({ o: live[0], h: Math.max(...live), l: Math.min(...live), c: live[live.length - 1] }, candles.length);
    }

    const idx = candles.length;
    if (nextMove && !live && idx < TURNS_PER_DAY) {
      const cx = 2 + idx * slot + slot / 2;
      const a = Y(price * (1 + nextMove)), b = Y(price * (1 - nextMove));
      for (let j = a; j < b; j += 2) r(cx, j, 1, 1, '#ffd35a');
      r(cx - 2, a, 5, 1, '#ffd35a');
      r(cx - 2, b, 5, 1, '#ffd35a');
    }
    r(2, Y(price), plotW, 1, '#ffffff22');

    // crisp labels at screen resolution
    x.font = '20px J';
    x.textBaseline = 'middle';
    for (const l of lines) {
      if (l.price < lo || l.price > hi) continue;
      x.fillStyle = l.color;
      x.fillText(l.label, (plotW + 4) * U, Y(l.price) * U + U);
    }
    x.fillStyle = '#fffaf0';
    x.fillText(`$${price.toFixed(2)}`, (plotW + 4) * U, Y(price) * U + U);
    if (nextMove && !live && idx < TURNS_PER_DAY) {
      x.fillStyle = '#ffd35a';
      x.font = '40px J';
      x.fillText('?', (2 + idx * slot + slot / 2 + 3) * U, Y(price) * U);
    }
  }, [candles, live, price, lines, nextMove, width, height]);

  return <canvas ref={ref} width={width} height={height} style={{ display: 'block' }} />;
}
