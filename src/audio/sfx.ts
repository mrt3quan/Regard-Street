// Audio: the "Cute Stock Market Game Audio Pack" (synthesized from scratch for this project).
//
// Sound effects are short WAVs in src/assets/sfx, music is MP3 in src/assets/music. Everything is
// played through Web Audio: effects start instantly, and music loops seamlessly on the exact
// bar length from the pack's manifest (MP3 encoders add a little silence that a plain <audio loop>
// would play as a gap).
//
// To swap a sound, replace the file with one of the same name.

/** Game events and the pack file each one plays. */
const SFX_FILE = {
  click: 'ui_click_soft',
  hover: 'ui_hover_tick',
  confirm: 'ui_confirm',
  cancel: 'ui_cancel',
  open: 'ui_open_panel',
  close: 'ui_close_panel',
  ping: 'notification_ping',
  buy: 'buy_order',
  sell: 'sell_order',
  filled: 'order_filled',
  profit: 'profit_small',
  bigProfit: 'profit_big',
  loss: 'loss_small',
  crit: 'critical_trade',
  warning: 'margin_warning',
  bellOpen: 'market_open_bell',
  bellClose: 'market_close_bell',
  keyboard: 'keyboard_short',
  tick: 'mouse_click',
  printer: 'printer_done',
  coffee: 'coffee_machine',
  phone: 'phone_buzz',
  light: 'trade_attack_light',
  heavy: 'trade_attack_heavy',
  shield: 'shield_risk_control',
  bossWarning: 'boss_warning',
  bossHit: 'boss_hit',
  victory: 'battle_victory',
  defeat: 'battle_defeat',
  levelUp: 'level_up',
  achievement: 'achievement',
} as const;
export type Sfx = keyof typeof SFX_FILE;

/** Per-sound volume, balanced against the pack's measured loudness (quiet office sounds get a boost). */
const SFX_VOLUME: Partial<Record<Sfx, number>> = {
  hover: 0.35, tick: 0.5, keyboard: 1.4, coffee: 1.6, phone: 1.2, printer: 1.1, bossWarning: 1.3, warning: 1.2,
};

export type Music = 'menu' | 'office' | 'afterhours' | 'battle' | 'boss' | 'victory';
/** Exact loop lengths (bars x beats at the track's tempo) from the pack manifest. */
const LOOP_SECONDS: Record<Music, number> = { menu: 46.83, office: 43.64, afterhours: 51.89, battle: 38.71, boss: 34.78, victory: 30.0 };
const MUSIC_VOLUME = 0.7;

const sfxUrls = import.meta.glob('../assets/sfx/*.{wav,mp3,ogg,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const musicUrls = import.meta.glob('../assets/music/*.{mp3,ogg,wav,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const byName = (urls: Record<string, string>) =>
  Object.fromEntries(Object.entries(urls).map(([p, u]) => [p.split('/').pop()!.replace(/\.[^.]+$/, ''), u]));
const SFX_URL = byName(sfxUrls);
const MUSIC_URL = byName(musicUrls);

export type SoundMode = 'all' | 'sfx' | 'off';
const MODE_KEY = 'regard-street:sound';
let mode: SoundMode = (() => {
  try { return (localStorage.getItem(MODE_KEY) as SoundMode) || 'all'; } catch { return 'all'; }
})();

let ctx: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
let current: { name: Music; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let wanted: Music | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  sfxBus = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus.connect(ctx.destination);
  musicBus.connect(ctx.destination);
  applyMode();
  return ctx;
}

function load(url: string): Promise<AudioBuffer | null> {
  const a = audio();
  if (!a) return Promise.resolve(null);
  if (!loading.has(url)) {
    loading.set(url, fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => a.decodeAudioData(b))
      .then((buf) => { buffers.set(url, buf); return buf; })
      .catch(() => null));
  }
  return loading.get(url)!;
}

function applyMode(): void {
  if (!ctx) return;
  sfxBus.gain.value = mode === 'off' ? 0 : 1;
  musicBus.gain.value = mode === 'all' ? MUSIC_VOLUME : 0;
}

/** Browsers only allow sound after the player touches the page. */
function unlock(): void {
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') void a.resume().then(() => { if (wanted && !current) playMusic(wanted); });
  else if (wanted && !current) playMusic(wanted);
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** Decode every sound effect up front so the first click is not silent. */
export function preloadAudio(): void {
  for (const file of Object.values(SFX_FILE)) if (SFX_URL[file]) void load(SFX_URL[file]);
}

/** Development builds record what played, so browser tests can check the wiring. */
function trace(what: string): void {
  if (import.meta.env.DEV) ((window as unknown as { __audioLog?: string[] }).__audioLog ??= []).push(what);
}

export function play(name: Sfx): void {
  if (mode === 'off') return;
  trace(name);
  const url = SFX_URL[SFX_FILE[name]];
  const a = audio();
  if (!url || !a || a.state !== 'running') return;
  const buf = buffers.get(url);
  if (!buf) { void load(url); return; }
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.value = SFX_VOLUME[name] ?? 1;
  src.connect(g).connect(sfxBus);
  src.start();
}

/** Cross-fade to a music track (or to silence with null). Safe to call repeatedly. */
export function playMusic(name: Music | null): void {
  wanted = name;
  const a = audio();
  if (!a) return;
  if (current?.name === name) return;
  const fade = 0.9;
  if (current) {
    const old = current;
    old.gain.gain.cancelScheduledValues(a.currentTime);
    old.gain.gain.setValueAtTime(old.gain.gain.value, a.currentTime);
    old.gain.gain.linearRampToValueAtTime(0, a.currentTime + fade);
    old.src.stop(a.currentTime + fade + 0.05);
    current = null;
  }
  if (!name || !MUSIC_URL[name] || a.state !== 'running') return;
  void load(MUSIC_URL[name]).then((buf) => {
    if (!buf || wanted !== name || current) return;
    const src = a.createBufferSource();
    src.buffer = buf;
    // Loop on the musical length; skip the encoder's leading silence if the decoder kept it.
    const extra = buf.duration - LOOP_SECONDS[name];
    const lead = extra > 0.01 ? Math.min(extra, 0.035) : 0;
    src.loop = true;
    src.loopStart = lead;
    src.loopEnd = lead + Math.min(LOOP_SECONDS[name], buf.duration - lead);
    const g = a.createGain();
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(1, a.currentTime + fade);
    src.connect(g).connect(musicBus);
    src.start(a.currentTime, lead);
    current = { name, src, gain: g };
    trace(`music:${name}`);
  });
}

export function soundMode(): SoundMode { return mode; }

export function cycleSoundMode(): SoundMode {
  mode = mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all';
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* storage unavailable */ }
  applyMode();
  return mode;
}

export const SOUND_LABEL: Record<SoundMode, string> = { all: 'Sound: on', sfx: 'Music: off', off: 'Sound: off' };
