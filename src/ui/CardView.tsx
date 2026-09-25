import type { CardDef } from '../engine/cards';
import { ICONS, TYPE_COLORS } from './icons';
import { PixelIcon } from './PixelIcon';

interface Props {
  def: CardDef;
  playable: boolean;
  style?: React.CSSProperties;
  onPointerUp?: (e: React.PointerEvent) => void;
  onHover?: (hovering: boolean) => void;
  small?: boolean;
}

export function CardView({ def, playable, style, onPointerUp, onHover, small }: Props) {
  const [base, dark, art] = TYPE_COLORS[def.type];
  return (
    <div
      className={`card ${playable ? 'playable' : 'blocked'} ${small ? 'static' : ''}`}
      style={{ ...style, ['--c' as string]: base, ['--d' as string]: dark, ['--a' as string]: art }}
      onPointerUp={onPointerUp}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover?.(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') onHover?.(false); }}
    >
      <div className="card-name">{def.name}</div>
      <div className="card-art"><PixelIcon rows={ICONS[def.id]} scale={6} /></div>
      <div className="card-type">{def.type}</div>
      <div className="card-text">{def.text}</div>
      <div className="card-cost">{def.cost}</div>
    </div>
  );
}
