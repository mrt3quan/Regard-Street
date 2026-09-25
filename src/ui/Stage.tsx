import { useEffect, useState, type ReactNode } from 'react';

export const STAGE_W = 1281;
export const STAGE_H = 720;

/** A fixed 16:9 stage, scaled to fit the window like a console game. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="viewport">
      <div className="stage" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>{children}</div>
      <div className="rotate-hint">
        <div className="phone-icon" />
        <div className="t40">Turn your phone sideways</div>
        <div className="t20">Regard Street plays in landscape.</div>
      </div>
    </div>
  );
}
