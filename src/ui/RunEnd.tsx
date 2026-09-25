import { useEffect } from 'react';
import { play as sfx, playMusic } from '../audio/sfx';
import { WEEKDAYS, type RunState } from '../engine/run';
import { fmtMoney } from '../engine/trades';
import { Hearts } from './Hearts';
import { Prop } from './Prop';

export function RunEnd({ run, onNewWeek }: { run: RunState; onNewWeek: () => void }) {
  const cleared = run.phase === 'cleared';
  const pnl = run.results.reduce((a, r) => a + r.pnl, 0);
  const blowUps = run.results.filter((r) => r.blewUp).length;
  useEffect(() => {
    if (cleared) { sfx('levelUp'); playMusic('victory'); } else { sfx('defeat'); playMusic('menu'); }
  }, [cleared]);
  return (
    <div className="overlay solid">
      <div className={`panel end ${cleared ? 'won' : 'lost'}`}>
        <div className="row center gap">{cleared ? <><Prop name="trophy" h={60} /><span className="t60">Week cleared!</span><Prop name="gold_bars" h={70} /></> : <><Prop name="briefcase" h={56} /><span className="t60">You're fired!</span><Prop name="cat_white" h={40} /></>}</div>
        <div className="t20 center dim-d">
          {cleared
            ? 'You survived the week and beat The Chair. The promotion committee is watching (careers arrive in a later update).'
            : 'The boss ran out of patience. HR walks you out with a cardboard box. (Good news: this is a roguelike. Try again!)'}
        </div>
        <table className="week-table t20">
          <thead><tr><th>Day</th><th>Score / goal</th><th>P&L</th><th>Bonus</th><th /></tr></thead>
          <tbody>
            {run.results.map((r) => (
              <tr key={r.day}>
                <td>{WEEKDAYS[r.day]}</td>
                <td>{r.score.toLocaleString('en-US')} / {r.goal.toLocaleString('en-US')}</td>
                <td className={r.pnl >= 0 ? 'up-d' : 'down-d'}>{fmtMoney(r.pnl, true)}</td>
                <td>+${r.bonus}</td>
                <td className={r.won ? 'up-d' : 'down-d'}>{r.won ? 'Goal hit' : r.blewUp ? 'Loss limit' : 'Missed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row center gap">
          <span className="t40">Week P&L <span className={pnl >= 0 ? 'up-d' : 'down-d'}>{fmtMoney(pnl, true)}</span></span>
          <Hearts n={run.trust} />
        </div>
        <div className="lessons">
          <div className="t20 gold-d">The big lesson</div>
          <div className="t20 lesson">
            {blowUps > 0
              ? 'A blow-up cost you two hearts. Real traders say it too: the goal is not to win every day, it is to never lose so much that you cannot come back tomorrow.'
              : cleared
                ? 'No blow-ups all week. Consistency beats big wins: pros size their trades so a bad day is just a bad day.'
                : 'Missing goals day after day adds up. Look for the setups that fit the day: sell premium on calm days, step aside before big news, follow a trend with a stop.'}
          </div>
        </div>
        <div className="row center"><button className="btn green t40" onClick={() => { sfx('confirm'); onNewWeek(); }}>New week</button></div>
      </div>
    </div>
  );
}
