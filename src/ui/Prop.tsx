// Painted props cut from the office art sheet (src/assets/props). Used on menus and panels,
// not in the pixel-art scenes, where the two styles would clash.
const urls = import.meta.glob('../assets/props/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const PROPS = Object.fromEntries(Object.entries(urls).map(([p, u]) => [p.split('/').pop()!.replace('.png', ''), u]));

export type PropName =
  | 'bull' | 'bear' | 'coin' | 'coins' | 'coins_tall' | 'piggy' | 'briefcase' | 'newspaper' | 'cash' | 'cash_small'
  | 'gold_bars' | 'clock' | 'desk_clock' | 'globe' | 'trophy' | 'cat_white' | 'cat_orange' | 'plant_big' | 'plant_small'
  | 'snake_plant' | 'hanging_plant' | 'bush' | 'flowers' | 'coffee_machine' | 'desk_phone' | 'printer' | 'water_cooler'
  | 'laptop' | 'monitors';

export function Prop({ name, h, className, style }: { name: PropName; h: number; className?: string; style?: React.CSSProperties }) {
  return <img src={PROPS[name]} alt="" draggable={false} className={`prop ${className ?? ''}`} style={{ height: h, ...style }} />;
}
