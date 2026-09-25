import { useEffect, useState } from 'react';
import { play as sfx, playMusic, type Sfx } from '../audio/sfx';
import { CARDS, type CardId } from '../engine/cards';
import { EDGES } from '../engine/edges';
import { buyCard, buyEdge, dayGoal, EDGE_PRICE, isBossDay, nextDay, REMOVE_PRICE, removeCard, reroll, rerollPrice, WEEKDAYS, type RunState } from '../engine/run';
import { CardView } from './CardView';
import { Hearts } from './Hearts';
import { TYPE_COLORS } from './icons';
import { Prop } from './Prop';
import { SoundButton } from './SoundButton';

/** Between trading days: spend the desk bonus on cards, Edges and deck trimming. */
export function Shop({ run, onChange }: { run: RunState; onChange: (r: RunState) => void }) {
  const [removing, setRemoving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const shop = run.shop!;
  const tomorrow = nextDay(run);
  useEffect(() => { playMusic('afterhours'); }, []);

  const apply = (r: RunState | string, sound: Sfx = 'filled') => {
    if (typeof r === 'string') { sfx('cancel'); setMsg(r); return; }
    sfx(sound);
    setMsg(null);
    onChange(r);
  };

  const counts = new Map<CardId, number>();
  run.cards.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));

  return (
    <div className="shop">
      <div className="shop-head">
        <div>
          <div className="t60 gold">After hours</div>
          <div className="t20 dim">Grind & Dividend café. Spend your desk bonus before tomorrow.</div>
        </div>
        <div className="shop-decor">
          <Prop name="hanging_plant" h={96} className="hang" />
          <Prop name="coffee_machine" h={76} />
          <Prop name="cat_orange" h={40} />
          <Prop name="flowers" h={52} />
        </div>
        <div className="shop-status">
          <SoundButton />
          <Hearts n={run.trust} />
          <span className="t60 cash-big">${run.cash}</span>
        </div>
      </div>

      <div className="shop-body">
        <div className="shop-left">
          <div className="t40">New cards</div>
          <div className="offers">
            {shop.offers.map((o, i) => (
              <div key={`${o.card}-${i}`} className={`offer ${o.sold ? 'sold' : ''}`}>
                <CardView def={CARDS[o.card]} playable={!o.sold} small />
                <div className="t20 offer-learn"><span className="gold">{CARDS[o.card].learn.term}.</span> {CARDS[o.card].learn.text}</div>
                <button className="btn t40 small-btn" disabled={o.sold || run.cash < o.price} onClick={() => apply(buyCard(run, i))}>
                  {o.sold ? 'Sold' : `Buy $${o.price}`}
                </button>
              </div>
            ))}
          </div>
          <div className="shop-row">
            {shop.edge && (
              <div className={`edge-offer ${shop.edgeSold ? 'sold' : ''}`}>
                <span className="edge t20" style={{ background: EDGES[shop.edge].color }}>{EDGES[shop.edge].glyph}</span>
                <span className="grow"><span className="t20 b">Edge: {EDGES[shop.edge].name}</span><br /><span className="t20">{EDGES[shop.edge].text}</span></span>
                <button className="btn t20" disabled={shop.edgeSold || run.cash < EDGE_PRICE} onClick={() => apply(buyEdge(run))}>{shop.edgeSold ? 'Sold' : `Buy $${EDGE_PRICE}`}</button>
              </div>
            )}
            <button className="btn t20" disabled={run.cash < rerollPrice(shop)} onClick={() => apply(reroll(run), 'printer')}>Reroll cards ${rerollPrice(shop)}</button>
            <button className={`btn t20 ${removing ? 'danger' : ''}`} disabled={shop.removed} onClick={() => { sfx('click'); setRemoving(!removing); }}>
              {shop.removed ? 'Card removed' : removing ? 'Pick a card on the right…' : `Remove a card $${REMOVE_PRICE}`}
            </button>
          </div>
          {msg && <div className="t20 down shop-msg">{msg}</div>}
        </div>

        <div className="shop-right">
          <div className="t40">Your deck ({run.cards.length})</div>
          <div className="deck-list">
            {[...counts.entries()].map(([id, count]) => {
              const [base, dark] = TYPE_COLORS[CARDS[id].type];
              return (
                <button key={id} className={`deck-row ${removing ? 'removable' : ''}`} disabled={!removing}
                  onClick={() => { apply(removeCard(run, run.cards.indexOf(id)), 'close'); setRemoving(false); }}
                  style={{ ['--c' as string]: base, ['--d' as string]: dark }}>
                  <span className="dot t20">{CARDS[id].cost}</span>
                  <span className="t20 grow">{CARDS[id].name}</span>
                  <span className="t20">×{count}</span>
                </button>
              );
            })}
          </div>
          <div className="t20 dim">Edges: {run.edges.map((e) => EDGES[e].name).join(', ')}</div>
          <button className="btn green t40 next-day" onClick={() => { sfx('confirm'); onChange(tomorrow); }}>
        Start {WEEKDAYS[tomorrow.day]} · goal {dayGoal(tomorrow)}{isBossDay(tomorrow) ? ' · BOSS' : ''}
      </button>
        </div>
      </div>

    </div>
  );
}
