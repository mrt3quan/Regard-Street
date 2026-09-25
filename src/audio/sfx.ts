// Sound effects and music.
//
// Drop audio files into src/assets/sfx/ named after a sound below (e.g. coin.mp3, bell.ogg)
// and they replace the built-in synthesized sound automatically. Any file in src/assets/music/
// plays as looping background music. Missing files fall back to the synth, so the game always
// has sound.

export type Sfx = 'card' | 'coin' | 'loss' | 'tick' | 'bell' | 'win' | 'lose' | 'buy' | 'error' | 'turn' | 'bigwin';

export const SFX_NAMES: Sfx[] = ['card', 'coin', 'loss', 'tick', 'bell', 'win', 'lose', 'buy', 'error', 'turn', 'bigwin'];

const sfxFiles = import.meta.glob('../assets/sfx/*.{mp3,ogg,wav,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const musicFiles = import.meta.glob('../assets/music/*.{mp3,ogg,wav,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const fileFor: Partial<Record<Sfx, string>> = {};
for (const [path, url] of Object.entries(sfxFiles)) {
  const name = path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase() as Sfx;
  if (SFX_NAMES.includes(name)) fileFor[name] = url;
}
const musicUrl = Object.values(musicFiles)[0] ?? null;

const MUTE_KEY = 'regard-street:muted';
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } })();
let ctx: AudioContext | null = null;
let music: HTMLAudioElement | null = null;

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted(): boolean { return muted; }

export function setMuted(m: boolean): void {
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* storage unavailable */ }
  if (m) music?.pause();
  else startMusic();
}

export function startMusic(): void {
  if (muted || !musicUrl) return;
  if (!music) { music = new Audio(musicUrl); music.loop = true; music.volume = 0.25; }
  void music.play().catch(() => undefined);
}

/** A short enveloped tone. */
function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number): void {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

/** A soft filtered noise burst (paper, whoosh). */
function noise(a: AudioContext, start: number, dur: number, freq: number, vol = 0.12): void {
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

const SYNTH: Record<Sfx, (a: AudioContext) => void> = {
  card: (a) => { noise(a, 0, 0.09, 2400, 0.16); tone(a, 660, 0.02, 0.06, 'triangle', 0.06); },
  coin: (a) => { tone(a, 988, 0, 0.08, 'square', 0.07); tone(a, 1319, 0.07, 0.22, 'square', 0.07); },
  bigwin: (a) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, i * 0.06, 0.2, 'square', 0.06)); },
  loss: (a) => { tone(a, 220, 0, 0.28, 'triangle', 0.16, 110); },
  tick: (a) => { tone(a, 1800, 0, 0.018, 'square', 0.02); },
  bell: (a) => { [880, 1320, 1760, 2640].forEach((f, i) => tone(a, f, 0, 1.4 - i * 0.25, 'sine', 0.09 / (i + 1))); },
  win: (a) => { [523, 659, 784, 1047].forEach((f, i) => tone(a, f, i * 0.11, 0.3, 'triangle', 0.14)); },
  lose: (a) => { tone(a, 392, 0, 0.3, 'triangle', 0.14); tone(a, 330, 0.25, 0.3, 'triangle', 0.14); tone(a, 262, 0.5, 0.5, 'triangle', 0.14); },
  buy: (a) => { noise(a, 0, 0.05, 5000, 0.2); tone(a, 1568, 0.04, 0.12, 'square', 0.06); tone(a, 2093, 0.12, 0.25, 'square', 0.06); },
  error: (a) => { tone(a, 150, 0, 0.14, 'square', 0.08); },
  turn: (a) => { noise(a, 0, 0.25, 900, 0.12); },
};

const cache: Partial<Record<Sfx, HTMLAudioElement>> = {};

export function play(name: Sfx): void {
  if (muted) return;
  const url = fileFor[name];
  if (url) {
    const el = (cache[name] ??= new Audio(url));
    const inst = el.cloneNode(true) as HTMLAudioElement;
    inst.volume = name === 'tick' ? 0.3 : 0.7;
    void inst.play().catch(() => undefined);
    return;
  }
  const a = audio();
  if (a) SYNTH[name](a);
}
