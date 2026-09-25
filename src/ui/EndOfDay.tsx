import type { BattleState } from '../engine/state';
import { fmtMoney } from '../engine/trades';

/** Lessons drawn from what actually happened today. */
export function lessons(s: BattleState): string[] {
  const out: string[] = [];
  const ev = s.day.plan.find((p) => p.event)?.event;
  const trend = s.day.rho > 0;
  out.push(
    trend
      ? 'Today was a TREND day: moves tended to keep going. Riding the direction of the last move (with a stop) paid off.'
      : 'Today was a CHOPPY day: moves tended to reverse. Chasing the last move got punished; patience and selling premium did better.',
  );
  if (s.endReason?.includes('loss limit')) {
    out.push('Every real trading desk has a daily loss limit. Size your trades so one bad hour cannot end your day.');
  }
  if (ev && s.stats.heldThroughEvent) {
    out.push(`You held sold options through the ${ev.name}. Many option sellers close before big scheduled news, because that is when prices jump.`);
  } else if (ev && s.deckId === 'condor') {
    out.push(`You were flat for the ${ev.name}. Stepping aside for scheduled news is a real pro habit.`);
  }
  if (s.stats.stopsHit > 0) {
    out.push(`Your stops closed ${s.stats.stopsHit} trade${s.stats.stopsHit > 1 ? 's' : ''} early. Small planned losses keep you in the game.`);
  } else if (s.deckId === 'stock' && s.stats.tradesOpened > 0) {
    out.push('Tip: Stop Loss costs 0 Focus and gives the Defined Risk bonus (+1 mult). Pros decide where they are wrong before they enter.');
  }
  if (s.stats.premiumCollected > 0) {
    out.push(`You collected ${fmtMoney(s.stats.premiumCollected)} in option premium. Options lose value as the day passes (theta), and sellers keep that decay.`);
  }
  if (s.day.mood === 'wild') out.push('Mr. Market was WILD today: real moves were bigger than option prices expected. Bad weather for sellers.');
  return out.slice(0, 4);
}

export function EndOfDay({ s, onNewDay, onExit }: { s: BattleState; onNewDay: () => void; onExit: () => void }) {
  const won = s.status === 'won';
  return (
    <div className="overlay">
      <div className={`panel end ${won ? 'won' : 'lost'}`}>
        <div className="t60 center">{won ? 'Great day!' : 'Tough day.'}</div>
        <div className="t20 center dim-d">{s.endReason}</div>
        <div className="end-stats">
          <div><span className="t20 dim-d">Score (goal {s.goal.toLocaleString('en-US')})</span><span className={`t40 ${won ? 'up-d' : 'down-d'}`}>{s.score.toLocaleString('en-US')}</span></div>
          <div><span className="t20 dim-d">Day P&L</span><span className={`t40 ${s.realized >= 0 ? 'up-d' : 'down-d'}`}>{fmtMoney(s.realized, true)}</span></div>
          <div><span className="t20 dim-d">Trades</span><span className="t40">{s.stats.tradesOpened}</span></div>
          <div><span className="t20 dim-d">Close</span><span className="t40">${s.price.toFixed(2)}</span></div>
        </div>
        <div className="lessons">
          <div className="t20 gold-d">What today teaches</div>
          {lessons(s).map((l) => <div key={l} className="t20 lesson">• {l}</div>)}
        </div>
        <div className="row center gap">
          <button className="btn green t40" onClick={onNewDay}>Next day</button>
          <button className="btn t40" onClick={onExit}>Change deck</button>
        </div>
      </div>
    </div>
  );
}
