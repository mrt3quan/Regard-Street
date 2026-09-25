# Sound effects

Drop audio files here (`.mp3`, `.ogg`, `.wav` or `.m4a`) named after the sound they replace.
The game picks them up automatically on the next build; anything missing uses a built-in sound.

| File name | When it plays |
|---|---|
| `card` | a card is played |
| `coin` | a turn makes money |
| `bigwin` | a big winning turn |
| `loss` | a turn loses money |
| `tick` | each tick of the price while the market moves (keep it very short and quiet) |
| `bell` | the opening and closing bell |
| `win` | the day's goal is reached |
| `lose` | the day ends without the goal |
| `buy` | buying something in the shop |
| `error` | a card can't be played |
| `turn` | End Turn is pressed |

Background music goes in `src/assets/music/` (the first file found loops quietly).
Check the license: CC0 or "free for commercial use" packs are safest.
