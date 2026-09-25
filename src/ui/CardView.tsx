import type { CardDef } from '../engine/cards';
import { ICONS, TYPE_COLORS } from './icons';
import { PixelIcon } from './PixelIcon';

interface Props {
  def: CardDef;
  playable: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
}

export function CardView({ def, playable, style, onClick, onHover }: Props) {
  const [base, dark, art] = TYPE_COLORS[def.type];
  return (
    <div
      className={`card ${playable ? 'playable' : 'blocked'}`}
      style={{ ...style, ['--c' as string]: base, ['--d' as string]: dark, ['--a' as string]: art }}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <div className="card-name">{def.name}</div>
      <div className="card-art"><PixelIcon rows={ICONS[def.id]} scale={6} /></div>
      <div className="card-type">{def.type}</div>
      <div className="card-text">{def.text}</div>
      <div className="card-cost">{def.cost}</div>
    </div>
  );
}
