# Regard Street

A cozy trading roguelike: card battles against the market by day (Balatro meets Slay the Spire),
life in a charming pixel city after work. Real trading mechanics, fictional companies.
**Not financial advice.**

The full game design is in [`docs/DESIGN.md`](docs/DESIGN.md).

## Play it

Requires Node 22 or newer.

```bash
npm install
npm run dev        # open http://localhost:5173
```

Controls: click a card to play it (or press 1-9), hover a card to learn the real concept behind
it, press **End Turn** (or Space / E) to let the market move.

Other scripts: `npm test` (engine tests + balance simulation), `npm run typecheck`,
`npm run build` (static site in `dist/`, ready for itch.io or any static host).

## What's in Step 1: the trading day

- **8 turns** from 9:30 am to 4:00 pm on a fictional stock (NOVX, VOLT, PTRL, AURM, MEDX).
- **Mr. Market** shows how big the next move will be, never which way. Scheduled events
  (Fed speech, CEO live stream...) bring big moves and an IV crush.
- **Two decks:** Stock Starter (buy, short, stops, protective puts) and Iron Condor (credit
  spreads priced with Black-Scholes, rolling, taking profit).
- **Balatro scoring:** each turn scores *P&L × mult*; trading with defined risk raises the mult.
- **Real risk rules:** a daily loss limit, a risk budget, stop losses that trigger mid-move,
  options that expire at the close.
- **Edges** (the game's jokers) and an **end-of-day review** that reveals the day's hidden
  character and teaches from what you did.

## Code layout

```
src/
  engine/     pure, tested game logic (no UI)
    market.ts   seeded market model: intraday volatility, events, trend/chop days
    options.ts  Black-Scholes pricing, time measured in turns
    trades.ts   legs, P&L, max loss, risk, credit spreads
    cards.ts    every card, what it does and the real concept it teaches; decks
    battle.ts   the turn loop, scoring, stops, loss limit, the close
    edges.ts    passive perks
  art/        soft pixel-art kit and sprites drawn in code (office, avatar, Mr. Market)
  ui/         React screens: setup, battle, chart, cards, end of day
tests/        engine tests and a balance simulation that plays hundreds of days with bots
```

The balance test prints win rates for random play versus simple skilled strategies; skilled
play should win clearly more often. Run `npm test` after changing any numbers in the engine.

## Credits

Font: Jersey 10 by The Soft Type Project, SIL Open Font License (`src/assets/Jersey10-OFL.txt`).
