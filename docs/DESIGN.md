# Regard Street: Game Design

A cozy life-sim trading roguelike. By day you trade at a Wall Street-style firm in card
battles against the market (Balatro + Slay the Spire). After work you live your life in a
small, charming city (Stardew Valley + Animal Crossing). Every company and person is fictional.

**The promise:** a fun game first, and players walk away understanding how real trading works:
what a stop loss is for, why option sellers get paid, what implied volatility means, why
risk limits exist, and how to spot a scam "guru".

---

## 1. Pillars

1. **Real mechanics, game feel.** Prices, option pricing (Black-Scholes), P&L, max loss and risk
   limits behave like the real thing. Scoring, combos and perks are the "game" layer on top.
2. **Mr. Market never reveals direction.** He shows how *big* the next move will be (like implied
   volatility), never which *way*. Nothing about a boss or event hints at up or down.
3. **Risk control is skill.** Defined risk earns bonus multiplier; the daily loss limit ends your
   day; promotions weigh your worst drop as much as your profit.
4. **Two looks, one world.** Cozy soft pixel art for the world; a clean, professional broker app on
   your in-game phone.
5. **Learning by doing.** Every card has a one-line real-world explanation, and every day ends with
   lessons drawn from what you actually did.

## 2. A day in Harbor City

| Time | Where | What happens |
|---|---|---|
| Morning | Home, Maple Hollow | Read the news on your phone; talk to neighbors |
| 8:40 am | Tram | Commute to Exchange Row |
| 8:52 am | Exchange Row | Coffee, street rumors, walk into Pemberton & Vale |
| 9:24 am | Trading floor | Sit at your desk; rank decides capital, decks, screens |
| 9:30 - 4:00 | **Card battle** | Trade against Mr. Market; hit the day's goal |
| Evening | Town, phone | Check holdings and news; spend money: barber, cars, dates, home |
| Night | Home | Sleep and save. Friday: performance review |

## 3. The trading day (card battle) — built in Step 1

- A day is **8 turns** from 9:30 am to 4:00 pm. Each turn: refill **Focus** (3), draw 5 cards,
  play cards, press **End Turn**. The market then moves along a path; stops trigger mid-path.
- **Mr. Market's intent** shows the size of the next move (±x%, one standard deviation) and any
  scheduled event (Fed speech, CEO live stream, jobs report...). Direction: always "???".
- **Scoring (Balatro layer):** each turn, *chips* = the turn's dollar P&L, *mult* = 1 + bonuses,
  and *score += chips × mult*. Bonuses:
  - **Defined risk** (+1): every open trade has a known worst case (stop, spread, or protective put).
  - **Full condor** (+1): sold premium on both sides.
  - Edges can add more (Theta Gang, Momentum Mike).
- **Win:** score ≥ the deck's goal by the 4:00 pm close (or lock it in and go home early).
- **Lose:** P&L hits the **daily loss limit** (risk desk shuts you down), or the bell rings first.
- **Risk budget:** the desk caps the money at risk at once ($6,000 for a Junior Trader).
- **At 4:00 pm** options expire and a day trader goes home flat.

### Hidden market model
Per-turn returns follow an intraday U-shape (busy open and close, quiet lunch). Each day has a
hidden character: **trend** (moves follow through) or **choppy** (moves reverse), revealed only in
the end-of-day lessons. Realised volatility is usually a bit below implied (the real "volatility
risk premium" option sellers earn), except on wild days. Scheduled events are big and followed by
an IV crush. The day's path is fixed from the seed at the open, so the player's actions can never
change the market.

### Decks

| Deck | Real strategy | Status |
|---|---|---|
| Stock Starter | Buy / short shares, stops, protective puts | **Built** |
| Iron Condor | Put and call credit spreads, condors, rolling, taking profit | **Built** |
| Put Credit / Call Credit | Bull put / bear call spreads | Planned |
| The Wheel | Sell puts, get assigned, sell covered calls | Planned |
| Straddle | Buy call + put: profit from big moves either way | Planned |

### Edges (jokers)
Coffee Addict, Theta Gang, Risk Desk Buddy, Tape Reader, Momentum Mike. More come from the life
sim later (a spouse who is an accountant, a mentor, a car...).

## 3b. The week (built in Step 2)

- Five days, goals rising Mon ×1.0 → Fri ×1.6 (Monday goal: Stock 220, Iron Condor 450).
- **Boss trust, 3 hearts:** a missed goal costs 1, the loss limit costs 2, zero hearts = fired.
  Chosen over "one loss ends the run" because a market day is partly luck; the design punishes
  blow-ups more than bad days, which is the real lesson.
- **Desk bonus:** $4 per won day, +$1 per half-goal beaten (max 4), +$1 interest per $5 saved (max 3),
  $1 for a missed day. **Shop:** 3 cards (common $3, uncommon $5, rare $7), 1 Edge ($6, max 4),
  reroll ($2 +1 each), remove one card ($3, deck minimum 8).
- Balance (bots, no shopping): skilled play clears the week about 2-2.5× as often as random play.

## 4. Enemies (planned)

Mr. Market is the face of every normal day; his mask shows the mood (calm, jittery, wild).
- **Elites:** The Whale (huge orders shove the price), The Algo Swarm (slippage), The Meme Mob,
  The Rumor Mill (fake headlines in your feed), Summer Friday (thin market: cards cost more).
- **Bosses:** The Chair (Fed day), Earnings Night (gap + IV crush), Quad Witching (price pinning),
  Flash Crash, Black Swan (unannounced).
- A **week map** like Slay the Spire: normal days, elites, events, shop, weekend rest, Friday boss.

## 5. Gurus (planned)

Strangers DM you: "90% win rate, join my VIP room, $499/month". Join and they fight beside you,
posting a signal each turn you may follow (costs Focus). Their claimed record is not their real
one; your phone slowly reveals the truth. Real skill is randomised per run.
Lambo Larry (pump and dump), Quiet Quant Priya (good, expensive), Chart Wizard Ken (good only in
trends), Doom Dan (broken clock), "Copy My Trades" Chad (a scammer who wants your login), and
Old Walt from the café: a real mentor earned through friendship, not money. Trading on a real
insider tip gets you investigated by the Harbor Securities Commission.

## 6. News and sectors (planned)

Fictional public figures post news that moves stocks and whole sectors (Tech, Oil, Gold, Health,
Banks, Autos). Each item carries a "why it moves" line. Rumor vs confirmed, reliability per
person, "buy the rumor, sell the news". A long-term portfolio side game lets you hold stocks for
weeks, earn dividends and learn diversification.

## 7. Career

Intern → Junior Trader → Trader → Senior Trader → Portfolio Manager → Fund Partner → Your Own Fund.
Each rank raises the risk budget and unlocks decks, desk upgrades and city districts. The Friday
review checks: daily goals hit, worst drop under 10%, boss trust, no rule breaks.

## 8. The world

Harbor City: Maple Hollow (home), Town Square (café, Snip & Stock barber, Sunny Motors),
Exchange Row (Harbor Exchange, Pemberton & Vale, Goldmark Capital "invite only", Grind & Dividend
coffee, the Daily Ledger newsstand), Bellwether Park, Hillside Estates (unlocks at Senior Trader),
Harborfront yacht club (unlocks at Fund Partner). A tram links home to work.

Character creator at the start and at the barber: skin, 8 hair styles and colors, outfits,
accessories, pronouns.

## 9. Roadmap

| Step | Playable result |
|---|---|
| **1. Trading day** | One card-battle day on the real simulator, 2 decks, Edges, lessons. **Done.** |
| **2. Trading week** | Mon-Fri run, Friday boss (The Chair), boss trust hearts, shop, new cards and Edges. **Done.** Still to come: week map with elite days |
| 3. The world | Walkable Harbor City (Phaser): home, Exchange Row, trading floor, tram |
| 4. Phone and life | Broker app, news feed, sectors, character creator, barber |
| 5. Career and gurus | Promotions, guru allies and scams, relationships, house and car |
| 6. Polish | Saves, sound, animation, balance, tutorial, Steam/mobile packaging |
