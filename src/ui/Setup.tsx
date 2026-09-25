import { useEffect, useMemo, useRef, useState } from 'react';
import { paint } from '../art/px';
import { avatar, DEFAULT_LOOK } from '../art/sprites';
import { play as sfx, playMusic } from '../audio/sfx';
import { DECKS } from '../engine/cards';
import { EDGE_IDS, EDGES, type EdgeId } from '../engine/edges';
import { rng } from '../engine/rng';
import { WEEKDAYS, type RunState } from '../engine/run';
import { Hearts } from './Hearts';
import { Prop } from './Prop';
import { SoundButton } from './SoundButton';

const PAYOFF: Record<string, (v: number) => number> = {
  stock: (v) => v * 0.9,
  condor: (v) => Math.max(-0.7, Math.min(0.45, (0.6 - Math.abs(v)) * 1.8)),
  wheel: (v) => Math.min(0.45, v * 1.1 + 0.45),
  straddle: (v) => Math.abs(v) * 1.3 - 0.45,
};

/** Profit (green) or loss (red) at the close, for every possible closing price. */
function Payoff({ fn }: { fn: (v: number) => number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d')!, w = 58, h = 22, U = 3;
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, c.width, c.height);
    const mid = Math.round(h / 2);
    x.fillStyle = '#c8b8a8'; x.fillRect(0, mid * U, w * U, U);
    let prev: number | null = null;
    for (let i = 0; i < w; i++) {
      const v = fn(-1 + (2 * i) / (w - 1)), py = Math.round(mid - v * (h / 2 - 2));
      x.fillStyle = v >= 0 ? '#5aa84a55' : '#e8574a55';
      x.fillRect(i * U, Math.min(py, mid) * U, U, (Math.abs(py - mid) || 1) * U);
      const a = prev ?? py;
      x.fillStyle = v >= 0 ? '#3f8a3a' : '#c9463a';
      x.fillRect(i * U, Math.min(a, py) * U, U, (Math.abs(a - py) + 1) * U);
      prev = py;
    }
  }, [fn]);
  return <canvas ref={ref} width={58 * 3} height={22 * 3} className="payoff" />;
}

function Preview() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { paint(ref.current!); avatar(213, 200, DEFAULT_LOOK, 1.9); }, []);
  return <canvas ref={ref} className="preview" />;
}

interface Props {
  saved: RunState | null;
  onContinue: () => void;
  onStart: (seed: string, deckId: string, edge: EdgeId, name: string) => void;
}

export function Setup({ saved, onContinue, onStart }: Props) {
  const [deckId, setDeckId] = useState('stock');
  const [name, setName] = useState('Alex');
  const [runSeed] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase());
  const offered = useMemo(() => rng(`${runSeed}:edges`).shuffle(EDGE_IDS).slice(0, 3), [runSeed]);
  const [edge, setEdge] = useState<EdgeId>(offered[0]);
  useEffect(() => { playMusic('menu'); }, []);

  return (
    <div className="setup">
      <div className="setup-left">
        <div className="logo t60">Regard Street</div>
        <div className="t20 dim">A cozy trading roguelike. Every company is fictional. Not financial advice.</div>
        <Preview />
        <label className="t20 name-field">Your name <input className="t20" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} /></label>
        <div className="t20 dim">Junior Trader at Pemberton & Vale. Survive Monday to Friday.</div>
        <div className="shelf"><Prop name="bull" h={64} /><Prop name="coins_tall" h={34} /><Prop name="piggy" h={44} /><Prop name="cash_small" h={30} /><Prop name="bear" h={50} /></div>
        {saved && (
          <button className="btn t40 continue" onClick={() => { sfx('confirm'); onContinue(); }}>
            Continue {WEEKDAYS[saved.day]}
            <span className="row center t20"><Hearts n={saved.trust} /> ${saved.cash} · {saved.name}</span>
          </button>
        )}
        <button className="btn green t40 start" onClick={() => { sfx('confirm'); onStart(runSeed, deckId, edge, name.trim() || 'Alex'); }}>
          {saved ? 'New week' : 'Start the week'}
        </button>
      </div>
      <div className="setup-right">
        <div className="row"><span className="t40">Choose your strategy deck</span><SoundButton /></div>
        <div className="decks">
          {DECKS.map((d) => (
            <button key={d.id} className={`deck ${d.id === deckId ? 'sel' : ''} ${d.locked ? 'locked' : ''}`} disabled={d.locked} onClick={() => { sfx('click'); setDeckId(d.id); }}>
              <div className="row"><span className="t40">{d.name}</span><span className="t20 stars">{'●'.repeat(d.difficulty)}{'○'.repeat(4 - d.difficulty)}</span></div>
              <Payoff fn={PAYOFF[d.id]} />
              <div className="t20">{d.blurb}</div>
              <div className="t20"><span className="dim-d">Wins when</span> <span className="up-d">{d.winsWhen}</span></div>
              <div className="t20"><span className="dim-d">Max risk</span> {d.risk}{d.locked ? '' : ` · Mon goal ${d.goal}`}</div>
            </button>
          ))}
        </div>
        <div className="t40">Pick one Edge</div>
        <div className="edge-pick">
          {offered.map((id) => (
            <button key={id} className={`edge-card ${id === edge ? 'sel' : ''}`} onClick={() => { sfx('click'); setEdge(id); }}>
              <span className="edge t20" style={{ background: EDGES[id].color }}>{EDGES[id].glyph}</span>
              <span><span className="t20 b">{EDGES[id].name}</span><br /><span className="t20">{EDGES[id].text}</span></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
