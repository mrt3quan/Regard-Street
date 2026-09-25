import { useEffect, useRef } from 'react';
import { ICON_COLORS } from './icons';

/** Draws a tiny pixel map crisply at `scale` screen pixels per pixel. */
export function PixelIcon({ rows, scale = 6 }: { rows: string[]; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.max(...rows.map((r) => r.length));
  useEffect(() => {
    const c = ref.current!;
    const x = c.getContext('2d')!;
    x.clearRect(0, 0, c.width, c.height);
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      const col = ICON_COLORS[ch];
      if (col) { x.fillStyle = col; x.fillRect(i * scale, j * scale, scale, scale); }
    }));
  }, [rows, scale]);
  return <canvas ref={ref} width={w * scale} height={rows.length * scale} style={{ imageRendering: 'pixelated' }} />;
}
