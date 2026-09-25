# Audio

"Cute Stock Market Game Audio Pack": 31 sound effects and 6 music tracks, synthesized from scratch
for this project (no third-party samples). Originals are 16-bit PCM WAV at 32 kHz; the music is
stored here as 112 kbps MP3 to keep the web build light (31 MB → 3.4 MB). Effects stay WAV so they
play with no delay.

To change a sound, replace the file with one of the same name. The wiring lives in `src/audio/sfx.ts`.

## Music

| File | Plays |
|---|---|
| `menu.mp3` (Main Menu Chill) | title / deck select |
| `office.mp3` (Office Day Loop) | trading on a calm day |
| `battle.mp3` (Day Trading Battle) | trading on a jittery or wild day |
| `boss.mp3` (Boss: Market Crash) | Friday, The Chair |
| `afterhours.mp3` (After Hours Research) | the shop after work |
| `victory.mp3` (Victory After Close) | a won day, a cleared week |

## Sound effects

| File | Plays when |
|---|---|
| `market_open_bell` / `market_close_bell` | 9:30 am open / 4:00 pm close |
| `buy_order` | Buy 100, Buy Calls, Double Down (long) |
| `sell_order` | Short 100, Buy Puts, Cut Losses |
| `order_filled` | selling spreads, covered calls, buying in the shop |
| `trade_attack_heavy` | big plays: Iron Condor, Buy Straddle, Double Down |
| `trade_attack_light` | Roll Away |
| `shield_risk_control` | Stop Loss, Protective Put, Lock Gains, and when a stop saves you |
| `printer_done` | Read the Tape, shop reroll |
| `coffee_machine` | Double Espresso |
| `phone_buzz` | a news event is about to hit |
| `keyboard_short` | End Turn |
| `mouse_click` | the price ticking during a move |
| `profit_small` / `profit_big` / `critical_trade` | a winning turn (small / big / huge) |
| `loss_small` | a losing turn |
| `margin_warning` | the risk desk says no, or 75% of the loss limit is used |
| `boss_warning` / `boss_hit` | Friday's Fed decision approaches / lands |
| `achievement` | the day's goal is reached |
| `battle_victory` / `battle_defeat` | the day ends won / lost |
| `level_up` | the week is cleared |
| `ui_click_soft`, `ui_hover_tick`, `ui_confirm`, `ui_cancel`, `ui_open_panel`, `ui_close_panel`, `notification_ping` | menus and buttons |
