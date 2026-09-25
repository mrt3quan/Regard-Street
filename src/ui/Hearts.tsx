import { START_TRUST } from '../engine/run';

/** Boss trust: lose them all and you're fired. */
export function Hearts({ n }: { n: number }) {
  return (
    <span className="hearts" title="Boss trust. Missing a goal costs 1, hitting the loss limit costs 2. At zero you're fired.">
      {Array.from({ length: START_TRUST }, (_, i) => <span key={i} className={`heart ${i < n ? 'full' : ''}`} />)}
    </span>
  );
}
