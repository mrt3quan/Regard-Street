import { useState } from 'react';
import { cycleSoundMode, soundMode, SOUND_LABEL } from '../audio/sfx';

/** Cycles: everything on, effects only, all off. */
export function SoundButton({ className = 'icon-btn t20' }: { className?: string }) {
  const [mode, setMode] = useState(soundMode());
  return (
    <button className={className} onClick={() => setMode(cycleSoundMode())} title="Sound: all on, music off, or all off">
      {SOUND_LABEL[mode]}
    </button>
  );
}
