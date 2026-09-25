const KEY = 'regard-street:howto-seen';

export function howToSeen(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const close = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
    onClose();
  };
  return (
    <div className="overlay" onPointerUp={(e) => e.stopPropagation()}>
      <div className="panel howto">
        <div className="t60 center">How to play</div>
        <ol className="t20">
          <li><b>Play cards</b> to open and close real trades. Each card costs Focus (the gold orb). Hover a card (or tap it once on a phone) to learn the real idea behind it.</li>
          <li><b>End Turn</b> and the market moves. Mr. Market tells you how BIG the next move is, never which way.</li>
          <li>Each turn scores <b>your P&L × mult</b>. Trades with a known worst case (stops, spreads, protective puts) raise the mult.</li>
          <li>Reach the <b>goal</b> before the 4:00 pm bell. Missing it costs a heart; hitting the loss limit costs two. Lose all three hearts and you're fired.</li>
          <li>Survive <b>Monday to Friday</b>. Spend your bonus in the shop between days. Friday is the boss: the Fed decision.</li>
        </ol>
        <button className="btn green t40 center-self" onClick={close}>Let's trade</button>
      </div>
    </div>
  );
}
