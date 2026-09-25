import { useEffect, useState } from 'react';
import { DEFAULT_LOOK } from './art/sprites';
import { finishDay, newRun, type RunState } from './engine/run';
import { Battle } from './ui/Battle';
import { RunEnd } from './ui/RunEnd';
import { Setup } from './ui/Setup';
import { Shop } from './ui/Shop';
import { Stage } from './ui/Stage';

const SAVE_KEY = 'regard-street:run';

function loadRun(): RunState | null {
  try {
    const r = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as RunState | null;
    return r && r.version === 1 ? r : null;
  } catch {
    return null;
  }
}

export function App() {
  const [run, setRun] = useState<RunState | null>(loadRun);
  const [playing, setPlaying] = useState(false);

  // Save after every change so a refresh (or closing the tab) keeps the week.
  useEffect(() => {
    try {
      if (run) localStorage.setItem(SAVE_KEY, JSON.stringify(run));
      else localStorage.removeItem(SAVE_KEY);
    } catch { /* storage unavailable: play without saving */ }
  }, [run]);

  const resumable = run && (run.phase === 'day' || run.phase === 'shop') ? run : null;

  let screen;
  if (!playing || !run) {
    screen = (
      <Setup
        saved={resumable}
        onContinue={() => setPlaying(true)}
        onStart={(seed, deckId, edge, name) => { setRun(newRun(seed, deckId, edge, name)); setPlaying(true); }}
      />
    );
  } else if (run.phase === 'day') {
    screen = <Battle key={`${run.seed}:${run.day}`} run={run} look={DEFAULT_LOOK} onFinish={(b) => setRun(finishDay(run, b))} onMenu={() => setPlaying(false)} />;
  } else if (run.phase === 'shop') {
    screen = <Shop run={run} onChange={setRun} />;
  } else {
    screen = <RunEnd run={run} onNewWeek={() => { setRun(null); setPlaying(false); }} />;
  }
  return <Stage>{screen}</Stage>;
}
