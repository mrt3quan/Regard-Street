import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { paint } from '../art/px';
import { avatar, mrMarket, office, type Look } from '../art/sprites';
import { isMuted, play as sfx, setMuted, startMusic } from '../audio/sfx';
import { canPlay, endTurn, goHomeEarly, multiplier, playCard } from '../engine/battle';
import { CARDS, DECKS } from '../engine/cards';
import { EDGES } from '../engine/edges';
import { TICKS } from '../engine/market';
import { TURNS_PER_DAY } from '../engine/options';
import { battleFor, WEEKDAYS, type RunState } from '../engine/run';
import type { BattleState, Trade, TurnResult } from '../engine/state';
import { fmtMoney, maxLoss, totalRisk, tradePnl, turnsLeft } from '../engine/trades';
import { CardView } from './CardView';
import { Chart, type ChartLine } from './Chart';
import { EndOfDay } from './EndOfDay';
import { HowToPlay, howToSeen } from './HowToPlay';
import { Hearts } from './Hearts';
import { useCountUp } from './useCountUp';

interface Anim {
  result: TurnResult;
  next: BattleState;
  tick: number;
}

const L = 3; // logical scene pixel -> stage pixel

function Scene({ look, mood, boss }: { look: Look; mood: BattleState['day']['mood']; boss: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    paint(ref.current!);
    office();
    avatar(120, 148, look);
    mrMarket(350, 152, mood, boss);
  }, [look, mood, boss]);
  return <canvas ref={ref} className="scene" />;
}

function tradeLines(trades: Trade[]): ChartLine[] {
  const lines: ChartLine[] = [];
  for (const t of trades) {
    for (const l of t.legs) {
      if (l.kind === 'stock') lines.push({ price: l.entry, color: '#9ac8f5', label: l.qty > 0 ? 'buy' : 'short' });
      else if (l.qty < 0) lines.push({ price: l.strike, color: '#7ee0a0', label: `${l.strike}` });
      else if (!t.legs.some((x) => x.kind === 'stock')) lines.push({ price: l.strike, color: '#f5a8c8', label: `${l.strike}` });
    }
  }
  return lines;
}

function maxLossText(t: Trade) {
  const ml = maxLoss(t);
  if (ml == null) return <span className="down-d">No max loss!</span>;
  if (ml < 0) return <span className="up-d">Locked at least {fmtMoney(-ml, true)}</span>;
  return <>Max loss {fmtMoney(ml)}</>;
}

interface Props {
  run: RunState;
  look: Look;
  onFinish: (b: BattleState) => void;
  onMenu: () => void;
}

export function Battle({ run, look, onFinish, onMenu }: Props) {
  const [s, setS] = useState<BattleState>(() => battleFor(run));
  const [anim, setAnim] = useState<Anim | null>(null);
  const [popup, setPopup] = useState<TurnResult | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'good' | 'bad' | 'info' } | null>(null);
  const [shake, setShake] = useState(false);
  const [help, setHelp] = useState(() => !howToSeen());
  const [muted, setMutedState] = useState(isMuted());
  const deck = DECKS.find((d) => d.id === run.deckId)!;

  useEffect(() => { sfx('bell'); startMusic(); }, []);

  // ---- derived view values (during the animation we show the live price over the old positions)
  const price = anim ? anim.result.path[anim.tick] : s.price;
  const tl = anim ? turnsLeft(s) - anim.tick / TICKS : turnsLeft(s);
  const livePnl = (t: Trade) => tradePnl(t, price, s.iv, tl);
  const dayPnl = s.realized + s.trades.reduce((a, t) => a + livePnl(t), 0);
  const mult = useMemo(() => multiplier(s), [s]);
  const plan = s.turn < TURNS_PER_DAY ? s.day.plan[s.turn] : null;
  const change = price / s.day.open - 1;
  const score = useCountUp(s.score);

  const flash = useCallback((text: string, tone: 'good' | 'bad' | 'info' = 'bad') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 3200);
  }, []);

  const play = useCallback((uid: number) => {
    if (anim || help) return;
    const r = playCard(s, uid);
    if (r.error) { sfx('error'); flash(r.error); return; }
    sfx('card');
    const newLines = r.state.log.slice(s.log.length);
    if (newLines.length) flash(newLines[newLines.length - 1].text, newLines[newLines.length - 1].tone);
    setS(r.state);
    setHover(null);
    setSelected(null);
  }, [anim, help, s, flash]);

  const finishTurn = useCallback(() => {
    if (anim || help || s.status !== 'playing') return;
    const { state: next, result } = endTurn(s);
    if (!result) return;
    sfx('turn');
    setPopup(null);
    setSelected(null);
    setAnim({ result, next, tick: 0 });
  }, [anim, help, s]);

  // animate the market move tick by tick
  useEffect(() => {
    if (!anim) return;
    if (anim.tick >= TICKS) {
      const id = window.setTimeout(() => {
        const { result, next } = anim;
        setS(next);
        setPopup(result);
        setAnim(null);
        const last = next.log.slice(s.log.length).pop();
        if (last) flash(last.text, last.tone);
        if (next.status === 'won') sfx('win');
        else if (next.status === 'lost') sfx('lose');
        else if (result.gained > s.goal * 0.3) sfx('bigwin');
        else if (result.gained > 0) sfx('coin');
        else if (result.gained < 0) sfx('loss');
        if (next.turn >= TURNS_PER_DAY) sfx('bell');
        if (result.gained < -s.goal * 0.25) { setShake(true); window.setTimeout(() => setShake(false), 450); }
      }, 250);
      return () => window.clearTimeout(id);
    }
    if (anim.tick % 2 === 0) sfx('tick');
    const id = window.setTimeout(() => setAnim({ ...anim, tick: anim.tick + 1 }), 85);
    return () => window.clearTimeout(id);
  }, [anim, s.log.length, s.goal, flash]);

  useEffect(() => {
    if (!popup) return;
    const id = window.setTimeout(() => setPopup(null), 2600);
    return () => window.clearTimeout(id);
  }, [popup]);

  // keyboard: 1-9 play a card, space / E ends the turn
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (s.status !== 'playing' || help) return;
      if (e.key === ' ' || e.key === 'e' || e.key === 'E') { e.preventDefault(); finishTurn(); }
      const n = Number(e.key);
      if (n >= 1 && n <= s.hand.length) play(s.hand[n - 1].uid);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finishTurn, play, s.hand, s.status, help]);

  // Mouse: hover to read, click to play. Touch: tap to read, tap again to play.
  const onCardPointer = (e: React.PointerEvent, uid: number) => {
    if (e.pointerType === 'mouse') { play(uid); return; }
    if (selected === uid) play(uid);
    else setSelected(uid);
  };

  // ---- hand layout: a gentle fan
  const n = s.hand.length;
  const spacing = n > 1 ? Math.min(156, 620 / (n - 1)) : 0;
  const x0 = 645 - ((n - 1) * spacing) / 2 - 84;
  const focusId = selected ?? hover;
  const focused = s.hand.find((c) => c.uid === focusId);
  const riskUsed = totalRisk(s);
  const shown = popup ?? null;
  const maxFocus = 3 + (s.edges.includes('coffee') ? 1 : 0);

  return (
    <div className={`battle ${shake ? 'shake' : ''}`} onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('.card')) setSelected(null); }}>
      <Scene look={look} mood={s.day.mood} boss={s.boss} />

      {/* ---------- top bar ---------- */}
      <div className="topbar">
        <span className="t40">{run.name}</span>
        <span className="t20 dim">{WEEKDAYS[run.day]} · {deck.name}</span>
        <Hearts n={run.trust} />
        <span className="t20 cash" title="Desk bonus cash, spent in the shop">${run.cash}</span>
        <span className="t20 grow center">
          {s.day.ticker.symbol} <b className="t20">${price.toFixed(2)}</b>{' '}
          <span className={change >= 0 ? 'up' : 'down'}>{change >= 0 ? '+' : ''}{(change * 100).toFixed(2)}%</span>
          <span className="dim"> · IV {Math.round(s.iv * 100)}%</span>
        </span>
        <span className="t20">{s.turn < TURNS_PER_DAY ? `${plan!.start} · turn ${s.turn + 1}/${TURNS_PER_DAY}` : 'Closed · 4:00 pm'}</span>
        <button className="icon-btn t20" onClick={() => setHelp(true)} title="How to play">?</button>
        <button className="icon-btn t20" onClick={() => { setMuted(!muted); setMutedState(!muted); }} title="Sound on/off">{muted ? 'Sound off' : 'Sound on'}</button>
        <button className="icon-btn t20" onClick={onMenu} title="Back to the menu (this day restarts)">Menu</button>
      </div>
      <div className="edges">
        {s.edges.map((id) => (
          <div key={id} className="edge t20" style={{ background: EDGES[id].color }} title={`${EDGES[id].name}: ${EDGES[id].text}`}>{EDGES[id].glyph}</div>
        ))}
      </div>
      {s.boss && <div className="boss-banner t40">BOSS · THE CHAIR</div>}

      {/* ---------- clipboard: open trades ---------- */}
      <div className="clipboard">
        <div className="t20 brown">Open trades</div>
        {s.trades.length === 0 && <div className="t20 dim2">None yet. Play a card!</div>}
        {s.trades.slice(0, s.trades.length > 2 ? 4 : 2).map((t) => {
          const p = livePnl(t);
          const compact = s.trades.length > 2;
          return (
            <div key={t.id} className={`trade ${compact ? 'compact' : ''}`}>
              <div className="row"><span className="t20">{t.label}</span><span className={`t20 ${p >= 0 ? 'up-d' : 'down-d'}`}>{fmtMoney(p, true)}</span></div>
              {!compact && <div className="t20 small">{maxLossText(t)}{t.stop != null && t.stop > 0 && ' · stop on'}</div>}
            </div>
          );
        })}
        {s.trades.length > 4 && <div className="t20 dim2">+{s.trades.length - 4} more</div>}
        <div className="clip-foot t20">
          <div className="row"><span>Locked in</span><span className={s.realized >= 0 ? 'up-d' : 'down-d'}>{fmtMoney(s.realized, true)}</span></div>
          <div className="row"><span>Risk used</span><span className={riskUsed > s.riskBudget * 0.85 ? 'down-d' : ''}>{fmtMoney(riskUsed)} / {fmtMoney(s.riskBudget)}</span></div>
        </div>
      </div>
      <div className="bar pnl" title="If your P&L falls to the loss limit, the risk desk ends your day">
        <div className={`fill ${dayPnl >= 0 ? 'green' : 'red'}`} style={{ width: `${Math.min(1, Math.abs(dayPnl) / s.lossLimit) * 100}%` }} />
        <span className="t20">P&L {fmtMoney(dayPnl, true)} · limit -{fmtMoney(s.lossLimit)}</span>
      </div>

      {/* ---------- TV chart ---------- */}
      <div className="tv">
        <div className="tv-head t20">{s.day.ticker.symbol} · {s.day.ticker.name} · {s.day.ticker.sector}</div>
        <Chart
          candles={s.candles}
          live={anim ? anim.result.path.slice(0, anim.tick + 1) : null}
          price={price}
          lines={tradeLines(s.trades)}
          nextMove={plan && !anim ? plan.sigma : null}
          width={124 * L}
          height={62 * L}
        />
      </div>

      {/* ---------- Mr. Market's intent: size, never direction ---------- */}
      <div className="intent">
        {plan ? (
          <>
            {plan.event && <div className="t20 event">{plan.event.name}!</div>}
            <div className="row center"><span className="die" /><span className="t40 move">±{(plan.sigma * 100).toFixed(1)}%</span></div>
            <div className="t20">about ±${(price * plan.sigma).toFixed(2)}</div>
            <div className="t20 purple">Which way? ???</div>
          </>
        ) : <div className="t20">Market closed</div>}
      </div>
      <div className="bar goal" title="Score needed to win the day">
        <div className="fill" style={{ width: `${Math.max(0, Math.min(1, score / s.goal)) * 100}%` }} />
        <span className="t20">{Math.round(score).toLocaleString('en-US')} / {s.goal.toLocaleString('en-US')}</span>
      </div>
      <div className="boss-name t20">{s.day.mood[0].toUpperCase() + s.day.mood.slice(1)} day</div>

      {/* ---------- Balatro-style scoring ---------- */}
      <div className="combo">
        <div className="t20 combo-title">{(shown ? shown.parts : mult.parts).filter((p) => p.name !== 'Base').map((p) => p.name).join(' · ') || 'No bonus yet'}</div>
        <div className="row center">
          <div className="pill chips t40">{shown ? fmtMoney(shown.chips, true) : anim ? fmtMoney(dayPnl - (s.realized + s.trades.reduce((a, t) => a + tradePnl(t, s.price, s.iv, turnsLeft(s)), 0)), true) : '$ ?'}</div>
          <span className="t40 times">×</span>
          <div key={mult.total} className="pill mult t40 bump">{shown ? shown.mult : mult.total}</div>
        </div>
        {shown && shown.gained !== 0 && <div className={`gained t40 ${shown.gained >= 0 ? 'up' : 'down'}`}>{shown.gained >= 0 ? '+' : ''}{shown.gained.toLocaleString('en-US')}</div>}
      </div>
      {toast && <div className={`toast t20 ${toast.tone}`}>{toast.text}</div>}

      {/* ---------- teaching tooltip ---------- */}
      {focused && (
        <div className="tooltip">
          <div className="t20 gold">{CARDS[focused.id].learn.term}</div>
          <div className="t20">{CARDS[focused.id].learn.text}</div>
          {canPlay(s, focused.uid) && <div className="t20 down-d">{canPlay(s, focused.uid)}</div>}
          {selected === focused.uid && !canPlay(s, focused.uid) && <div className="t20 purple">Tap the card again to play it.</div>}
        </div>
      )}

      {/* ---------- hand ---------- */}
      {s.hand.map((c, i) => {
        const mid = (n - 1) / 2;
        const up = focusId === c.uid;
        return (
          <CardView
            key={c.uid}
            def={CARDS[c.id]}
            playable={!canPlay(s, c.uid) && !anim}
            onPointerUp={(e) => onCardPointer(e, c.uid)}
            onHover={(h) => setHover(h ? c.uid : null)}
            style={{
              left: x0 + i * spacing,
              top: up ? 420 : 466 + Math.abs(i - mid) * 7,
              transform: up ? 'none' : `rotate(${(i - mid) * 2.5}deg)`,
              zIndex: up ? 50 : 10 + i,
            }}
          />
        );
      })}

      {/* ---------- focus, piles, end turn ---------- */}
      <div className="focus"><span className="t40">{s.focus}/{maxFocus}</span></div>
      <div className="focus-label t20">FOCUS</div>
      <div className="pile draw t20" title="Draw pile">{s.drawPile.length}</div>
      <div className="pile discard t20" title="Discard pile">{s.discardPile.length}</div>
      <button className="end-turn t40" disabled={!!anim || s.status !== 'playing'} onClick={finishTurn}>End Turn</button>
      {s.status === 'playing' && s.score >= s.goal && !anim && (
        <button className="go-home t20" onClick={() => { sfx('win'); setS(goHomeEarly(s)); }}>Lock it in & go home</button>
      )}

      {s.status !== 'playing' && !anim && <EndOfDay s={s} run={run} onContinue={() => onFinish(s)} />}
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </div>
  );
}
