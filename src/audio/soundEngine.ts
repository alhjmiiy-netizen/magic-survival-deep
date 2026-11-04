/**
 * v5 WebAudio sound system: synthesized layered SFX (see sfx.ts), master bus with fake reverb
 * (delay feedback send), compressor + limiter, polyphony cap, per-sound throttle, pitch variation,
 * persisted Master volume / SFX on-off, mobile unlock on first touch. play() only enqueues; the
 * queue is flushed on a macrotask so node graph building is off the game loop's critical path.
 */
import { SFX, SFX_LEN } from './sfx';
if (import.meta.env.DEV) (window as unknown as { __sfxm: unknown }).__sfxm = { SFX, SFX_LEN, buildChain: (ac: BaseAudioContext) => buildChain(ac), SFX_NAMES: Object.keys(SFX) };

export interface Chain { input: GainNode; master: GainNode; out: AudioNode }
/** Build the master chain on any (live or offline) context. */
export function buildChain(ac: BaseAudioContext, vol = 0.8): Chain {
  const input = ac.createGain();
  const master = ac.createGain(); master.gain.value = vol;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.25;
  const lim = ac.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
  const post = ac.createGain(); post.gain.value = 0.9;
  // fake reverb: two feedback delays, low-passed
  const send = ac.createGain(); send.gain.value = 0.28;
  const mk = (time: number, fb: number) => {
    const d = ac.createDelay(1); d.delayTime.value = time; const f = ac.createGain(); f.gain.value = fb;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    send.connect(d); d.connect(lp); lp.connect(f); f.connect(d); lp.connect(comp);
  };
  mk(0.083, 0.42); mk(0.131, 0.38); mk(0.197, 0.3);
  input.connect(comp); input.connect(send);
  comp.connect(lim); lim.connect(post); post.connect(master);
  return { input, master, out: master };
}

const THROTTLE: Record<string, number> = { kill: 45, pickup: 50, coin: 70, hurt: 120, arcane: 90, ice: 120, thunder: 110, fire: 140, spirit: 160, boss_hit: 160, click: 40, dash: 120, chime: 90, shatter: 80 };
const MAX_VOICES = 18;
const STORE = 'msdeep_audio_v1';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private chain: Chain | null = null;
  private music: GainNode | null = null;
  private amb: { stop: () => void } | null = null;
  private last: Record<string, number> = {};
  private voices: number[] = [];
  private queue: [string, number][] = [];
  private flushing = false;
  public masterVolume = 0.8;
  public sfxOn = true;
  private musicVolume = 0.4;
  private isMuted = false;
  public log: { name: string; t: number }[] = [];
  public errors: string[] = [];
  public unlocked = false;

  constructor() {
    try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); if (typeof s.vol === 'number') this.masterVolume = s.vol; if (typeof s.sfx === 'boolean') this.sfxOn = s.sfx; } catch { /* default */ }
    if (typeof window !== 'undefined') {
      const unlock = () => { this.unlock(); };
      for (const ev of ['pointerdown', 'touchstart', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
    }
  }
  private save() { try { localStorage.setItem(STORE, JSON.stringify({ vol: this.masterVolume, sfx: this.sfxOn })); } catch { /* ignore */ } }
  /** Create/resume the context inside a user gesture (iOS/Android unlock). */
  public unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.chain = buildChain(this.ctx, this.masterVolume);
        this.chain.out.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (!this.unlocked) { const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0); this.unlocked = true; }
    } catch (e) { this.errors.push(String(e)); }
  }
  public state() { return { ctx: this.ctx?.state ?? 'none', unlocked: this.unlocked, vol: this.masterVolume, sfx: this.sfxOn, voices: this.voices.length, errors: this.errors.slice(-5), played: this.log.length }; }
  public setMasterVolume(v: number) { this.masterVolume = Math.max(0, Math.min(1, v)); if (this.chain) this.chain.master.gain.value = this.isMuted ? 0 : this.masterVolume; this.save(); }
  public setSfxEnabled(on: boolean) { this.sfxOn = on; this.save(); }
  public setMuted(m: boolean) { this.isMuted = m; if (this.chain) this.chain.master.gain.value = m ? 0 : this.masterVolume; }
  public setSfxVolume(v: number) { this.setMasterVolume(v); }
  public setMusicVolume(v: number) { this.musicVolume = Math.max(0, Math.min(1, v)); if (this.music) this.music.gain.value = this.musicVolume * 0.12; }

  /** Enqueue a sound. size ~0.3 (small) .. 2 (huge) scales loudness/length. */
  public play(name: string, size = 1) {
    if (!this.sfxOn || this.isMuted || !SFX[name]) return;
    const now = performance.now();
    if (now - (this.last[name] ?? -1e9) < (THROTTLE[name] ?? 30)) return;
    this.last[name] = now;
    this.queue.push([name, size]);
    if (!this.flushing) { this.flushing = true; setTimeout(this.flush, 0); }
  }
  private flush = () => {
    this.flushing = false;
    const q = this.queue; this.queue = [];
    if (!this.ctx || !this.chain || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    this.voices = this.voices.filter((e) => e > t);
    for (const [name, size] of q) {
      const big = size >= 1.2 || /fusion|collapse|crack|boss|charge|chest|artifact|levelup/.test(name);
      if (this.voices.length >= MAX_VOICES && !big) continue;
      try {
        const v = this.ctx.createGain(); v.gain.value = Math.min(1.6, 0.55 + 0.45 * size);
        v.connect(this.chain.input);
        SFX[name](this.ctx, v, t, Math.max(0.3, Math.min(2, size)) * (0.92 + Math.random() * 0.16));
        const end = t + (SFX_LEN[name] ?? 1);
        this.voices.push(end);
        setTimeout(() => { try { v.disconnect(); } catch { /* */ } }, (SFX_LEN[name] ?? 1) * 1000 + 600);
        this.log.push({ name, t: performance.now() }); if (this.log.length > 300) this.log.shift();
      } catch (e) { this.errors.push(String(e)); }
    }
  };
  /** Scene ambience (no music): wind / rumble / shimmer bed. */
  public startAmbience(kind: 'sky' | 'abyss' | 'rift' | null) {
    this.amb?.stop(); this.amb = null;
    if (!kind || !this.ctx || !this.chain || !this.sfxOn) return;
    try {
      const ac = this.ctx, t = ac.currentTime;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'abyss' ? 0.35 : 0.25, t + 2); g.connect(this.chain.input);
      const n = ac.createBufferSource(); const len = ac.sampleRate * 3; const b = ac.createBuffer(1, len, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      n.buffer = b; n.loop = true;
      const f = ac.createBiquadFilter(); f.type = kind === 'abyss' ? 'lowpass' : 'bandpass'; f.frequency.value = kind === 'abyss' ? 140 : kind === 'sky' ? 500 : 1400; f.Q.value = kind === 'rift' ? 6 : 0.8;
      const lfo = ac.createOscillator(); lfo.frequency.value = kind === 'sky' ? 0.15 : 0.08; const lg = ac.createGain(); lg.gain.value = f.frequency.value * 0.6; lfo.connect(lg); lg.connect(f.frequency);
      n.connect(f); f.connect(g); n.start(); lfo.start();
      const o2 = ac.createOscillator(); o2.frequency.value = kind === 'abyss' ? 38 : kind === 'rift' ? 220 : 55; o2.type = kind === 'rift' ? 'triangle' : 'sine'; const g2 = ac.createGain(); g2.gain.value = kind === 'rift' ? 0.05 : 0.18; o2.connect(g2); g2.connect(g); o2.start();
      this.amb = { stop: () => { try { const t2 = ac.currentTime; g.gain.setTargetAtTime(0.0001, t2, 0.4); setTimeout(() => { n.stop(); lfo.stop(); o2.stop(); g.disconnect(); }, 1500); } catch { /* */ } } };
    } catch (e) { this.errors.push(String(e)); }
  }

  // ---- legacy API mapped to v5 sounds ----
  public playArcaneCast() { this.play('arcane', 0.9); }
  public playFrostNova() { this.play('ice', 1); }
  public playLightning() { this.play('thunder', 1); }
  public playMeteorExplosion() { this.play('fire', 1.1); }
  public playHit() { this.play('hurt', 0.8); }
  public playPickup(type: 'xp' | 'crystal' | 'gold') { this.play(type === 'gold' ? 'coin' : 'pickup', type === 'crystal' ? 0.9 : 0.6); }
  public playLevelUp() { this.play('levelup', 1); }
  public playDash() { this.play('dash', 1); }
  public playBossRoar() { this.play('boss_roar', 1.3); }
  public playItemUse() { this.play('click', 1); }
  public startAtmosphereMusic() {
    if (this.music || !this.ctx || !this.chain) return;
    try {
      const t = this.ctx.currentTime; this.music = this.ctx.createGain(); this.music.gain.setValueAtTime(this.musicVolume * 0.12, t); this.music.connect(this.chain.master);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.connect(this.music);
      const a = this.ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 55; a.connect(lp); a.start();
      const b = this.ctx.createOscillator(); b.frequency.value = 82.4; b.connect(this.music); b.start();
      (this.music as GainNode & { _o?: OscillatorNode[] })._o = [a, b];
    } catch (e) { this.errors.push(String(e)); }
  }
  public stopAtmosphereMusic() {
    const m = this.music as (GainNode & { _o?: OscillatorNode[] }) | null; if (!m) return;
    try { m._o?.forEach((o) => o.stop()); m.disconnect(); } catch { /* */ }
    this.music = null;
  }
}

export const sound = new SoundEngine();
(globalThis as unknown as { __sound: SoundEngine }).__sound = sound;
