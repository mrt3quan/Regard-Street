import { useState } from 'react';
import { Battle, type DaySetup } from './ui/Battle';
import { Setup } from './ui/Setup';
import { Stage } from './ui/Stage';

export function App() {
  const [setup, setSetup] = useState<DaySetup | null>(null);
  const [day, setDay] = useState(1);
  return (
    <Stage>
      {setup ? (
        <Battle
          key={`${setup.seed}`}
          setup={setup}
          onNewDay={() => { const d = day + 1; setDay(d); setSetup({ ...setup, seed: setup.seed.replace(/-\d+$/, `-${d}`) }); }}
          onExit={() => { setSetup(null); setDay(1); }}
        />
      ) : (
        <Setup onStart={(s) => { setDay(1); setSetup(s); }} />
      )}
    </Stage>
  );
}
