/**
 * v5 synthesized SFX recipes. Pure functions of (BaseAudioContext, destination, startTime, size)
 * so the same code runs live and inside OfflineAudioContext for automated checks.
 * Building blocks: filtered noise bursts, sub-bass sines with pitch drops, detuned oscillators,
 * crackle clicks. Reverb is added by the live engine's delay-feedback send (not here).
 */
export type Ctx = BaseAudioContext;
const noiseCache = new WeakMap<Ctx, AudioBuffer>();
function noiseBuf(ac: Ctx): AudioBuffer {
  let b = noiseCache.get(ac);
  if (!b) {
    const n = Math.floor(ac.sampleRate * 2.5);
    b = ac.createBuffer(1, n, ac.sampleRate);
    const d = b.getChannelData(0);
    let br = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; br = (br + 0.02 * w) / 1.02; d[i] = i % 2 ? w : w * 0.6 + br * 3; }
    noiseCache.set(ac, b);
  }
  return b;
}
const R = (a: number, b: number) => a + Math.random() * (b - a);

interface NoiseOpt { dur: number; type?: BiquadFilterType; f0: number; f1?: number; q?: number; gain: number; attack?: number; curve?: number; rate?: number; delay?: number }
function noise(ac: Ctx, out: AudioNode, t: number, o: NoiseOpt) {
  const t0 = t + (o.delay ?? 0);
  const src = ac.createBufferSource(); src.buffer = noiseBuf(ac); src.loop = true; src.playbackRate.value = o.rate ?? 1;
  const f = ac.createBiquadFilter(); f.type = o.type ?? 'lowpass'; f.Q.value = o.q ?? 0.7;
  f.frequency.setValueAtTime(o.f0, t0);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
  const g = ac.createGain(); const a = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain, t0 + a);
  g.gain.setTargetAtTime(0.0001, t0 + a, (o.dur - a) / (o.curve ?? 4));
  src.connect(f); f.connect(g); g.connect(out);
  src.start(t0, Math.random() * 1.5); src.stop(t0 + o.dur + 0.05);
  return t0 + o.dur;
}
interface ToneOpt { dur: number; type?: OscillatorType; f0: number; f1?: number; gain: number; attack?: number; curve?: number; delay?: number; detune?: number; drop?: number }
function tone(ac: Ctx, out: AudioNode, t: number, o: ToneOpt) {
  const t0 = t + (o.delay ?? 0);
  const os = ac.createOscillator(); os.type = o.type ?? 'sine'; os.detune.value = o.detune ?? 0;
  os.frequency.setValueAtTime(o.f0, t0);
  if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(10, o.f1), t0 + (o.drop ?? o.dur));
  const g = ac.createGain(); const a = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain, t0 + a);
  g.gain.setTargetAtTime(0.0001, t0 + a, (o.dur - a) / (o.curve ?? 4));
  os.connect(g); g.connect(out); os.start(t0); os.stop(t0 + o.dur + 0.05);
  return t0 + o.dur;
}
function crackle(ac: Ctx, out: AudioNode, t: number, dur: number, n: number, gain: number) {
  for (let i = 0; i < n; i++) noise(ac, out, t, { delay: Math.pow(Math.random(), 1.6) * dur, dur: R(0.01, 0.04), type: 'bandpass', f0: R(1500, 5000), q: 2, gain: gain * R(0.4, 1), curve: 2 });
}
/** Generic big boom: sub sine pitch drop + low noise body + transient click. */
function boom(ac: Ctx, out: AudioNode, t: number, s: number, delay = 0, f0 = 95) {
  tone(ac, out, t, { delay, dur: 1.1 + 0.8 * s, f0: f0 * R(0.92, 1.08), f1: 28, drop: 0.5 + 0.3 * s, gain: 0.95 * s, curve: 3.5 });
  tone(ac, out, t, { delay, dur: 0.35, type: 'triangle', f0: 180, f1: 50, gain: 0.45 * s, curve: 3 });
  noise(ac, out, t, { delay, dur: 1.4 + 1.2 * s, type: 'lowpass', f0: 900, f1: 90, gain: 0.75 * s, curve: 3.5 });
  noise(ac, out, t, { delay, dur: 0.06, type: 'highpass', f0: 1800, gain: 0.5 * s, curve: 2 });
}
function rumble(ac: Ctx, out: AudioNode, t: number, s: number, delay: number, dur: number) {
  noise(ac, out, t, { delay, dur, type: 'lowpass', f0: 260, f1: 70, q: 1.2, gain: 0.7 * s, attack: 0.12, curve: 3, rate: 0.6 });
  tone(ac, out, t, { delay, dur: dur * 0.8, f0: 48, f1: 32, gain: 0.55 * s, attack: 0.1, curve: 3 });
}
function chord(ac: Ctx, out: AudioNode, t: number, freqs: number[], step: number, gain: number, dur: number, type: OscillatorType = 'triangle') {
  freqs.forEach((f, i) => { tone(ac, out, t, { delay: i * step, dur, type, f0: f, gain, curve: 4 }); tone(ac, out, t, { delay: i * step, dur: dur * 0.7, f0: f * 2.01, gain: gain * 0.35, curve: 4 }); });
}

/** name -> (ctx, out, t, size 0.3..2) ; returns approximate end time */
export const SFX: Record<string, (ac: Ctx, out: AudioNode, t: number, s: number) => void> = {
  thunder(ac, o, t, s) {
    noise(ac, o, t, { dur: 0.09, type: 'highpass', f0: 2500, gain: 0.9 * s, curve: 2 });
    noise(ac, o, t, { dur: 0.25, type: 'bandpass', f0: 3200, f1: 900, q: 0.8, gain: 0.8 * s, curve: 3 });
    tone(ac, o, t, { dur: 0.12, type: 'square', f0: 900, f1: 120, gain: 0.3 * s, curve: 2 });
    noise(ac, o, t, { delay: 0.05, dur: 0.5, type: 'lowpass', f0: 1400, f1: 200, gain: 0.8 * s, curve: 3 });
    rumble(ac, o, t, 1.15 * s, 0.12, 2.4 + 0.8 * s);
    tone(ac, o, t, { delay: 0.03, dur: 1.8, f0: 70, f1: 30, drop: 1.2, gain: 0.8 * s, curve: 3 });
  },
  fire(ac, o, t, s) {
    noise(ac, o, t, { dur: 0.42, type: 'bandpass', f0: 280, f1: 2200, q: 1.4, gain: 0.55 * s, attack: 0.3, curve: 1.5 });
    boom(ac, o, t, 1.1 * s, 0.34, 85);
    crackle(ac, o, t + 0.36, 1.3, 26, 0.35 * s);
    noise(ac, o, t, { delay: 0.36, dur: 1.2, type: 'bandpass', f0: 700, f1: 250, q: 0.6, gain: 0.35 * s, curve: 3 });
  },
  ice(ac, o, t, s) {
    tone(ac, o, t, { dur: 0.6, f0: 150, f1: 48, drop: 0.25, gain: 0.85 * s, curve: 3 });
    noise(ac, o, t, { dur: 0.3, type: 'lowpass', f0: 600, f1: 120, gain: 0.5 * s, curve: 3 });
    for (let i = 0; i < 9; i++) {
      const d = 0.02 + Math.random() * 0.22, f = R(2500, 7500);
      noise(ac, o, t, { delay: d, dur: R(0.05, 0.16), type: 'bandpass', f0: f, q: 6, gain: 0.45 * s, curve: 2.5 });
      tone(ac, o, t, { delay: d, dur: R(0.25, 0.7), type: 'sine', f0: f * 0.5, gain: 0.12 * s, curve: 4 });
    }
    noise(ac, o, t, { dur: 0.5, type: 'highpass', f0: 5000, gain: 0.35 * s, curve: 3 });
  },
  arcane(ac, o, t, s) {
    noise(ac, o, t, { dur: 0.35, type: 'bandpass', f0: 2600, f1: 500, q: 2, gain: 0.5 * s, attack: 0.05, curve: 2 });
    for (const [f, g] of [[620, 0.3], [933, 0.22], [1478, 0.18], [2210, 0.12], [3160, 0.08]] as const) tone(ac, o, t, { delay: 0.04, dur: 1.4, f0: f * R(0.98, 1.02), gain: g * s, curve: 5, attack: 0.003 });
    tone(ac, o, t, { dur: 0.5, f0: 110, f1: 55, gain: 0.5 * s, curve: 3 });
  },
  void(ac, o, t, s) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(120, t); lp.frequency.linearRampToValueAtTime(420, t + 0.9); lp.frequency.linearRampToValueAtTime(90, t + 2.2); lp.connect(o);
    for (const d of [-14, 0, 9]) tone(ac, lp, t, { dur: 2.3, type: 'sawtooth', f0: 41, f1: 62, drop: 1.0, gain: 0.45 * s, attack: 0.7, curve: 2.5, detune: d });
    tone(ac, o, t, { dur: 2.2, f0: 36, f1: 55, drop: 1.2, gain: 0.8 * s, attack: 0.6, curve: 2.5 });
    noise(ac, o, t, { dur: 2, type: 'bandpass', f0: 200, f1: 900, q: 3, gain: 0.25 * s, attack: 0.8, curve: 2 });
  },
  spirit(ac, o, t, s) {
    const notes = [440, 554, 659, 880];
    const bp1 = ac.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 800; bp1.Q.value = 3; bp1.connect(o);
    const bp2 = ac.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1150; bp2.Q.value = 4; bp2.connect(o);
    for (const f of notes) for (const d of [-9, 8]) { tone(ac, bp1, t, { dur: 1.3, type: 'sawtooth', f0: f, gain: 0.22 * s, attack: 0.12, curve: 3.5, detune: d }); tone(ac, bp2, t, { dur: 1.2, type: 'sawtooth', f0: f, gain: 0.16 * s, attack: 0.15, curve: 3.5, detune: -d }); }
    for (let i = 0; i < 6; i++) tone(ac, o, t, { delay: i * 0.05, dur: 0.6, f0: R(2000, 4000), gain: 0.06 * s, curve: 4 });
    tone(ac, o, t, { delay: 0.05, dur: 0.35, f0: 220, f1: 70, gain: 0.6 * s, curve: 3 });
    noise(ac, o, t, { delay: 0.05, dur: 0.18, type: 'lowpass', f0: 1200, f1: 200, gain: 0.4 * s, curve: 3 });
  },
  fusion(ac, o, t, s) {
    noise(ac, o, t, { dur: 0.08, type: 'highpass', f0: 2000, gain: 0.8 * s, curve: 2 });
    boom(ac, o, t, 0.9 * s, 0, 100); boom(ac, o, t, 0.8 * s, 0.09, 75); boom(ac, o, t, 0.7 * s, 0.22, 60);
    crackle(ac, o, t, 0.8, 18, 0.3 * s);
    rumble(ac, o, t, 0.9 * s, 0.2, 2.5 + s);
  },
  steam(ac, o, t, s) {
    noise(ac, o, t, { dur: 1.2, type: 'highpass', f0: 2500, f1: 6000, gain: 0.5 * s, attack: 0.02, curve: 3 });
    boom(ac, o, t, 0.7 * s, 0, 80);
    noise(ac, o, t, { dur: 1.6, type: 'bandpass', f0: 900, f1: 3000, q: 0.6, gain: 0.3 * s, attack: 0.05, curve: 3 });
  },
  charge_release(ac, o, t, s) {
    tone(ac, o, t, { dur: 0.5, type: 'sawtooth', f0: 180, f1: 1800, gain: 0.18 * s, attack: 0.4, curve: 1 });
    noise(ac, o, t, { dur: 0.5, type: 'bandpass', f0: 400, f1: 4000, q: 3, gain: 0.25 * s, attack: 0.45, curve: 1 });
    boom(ac, o, t, 1.25 * s, 0.48, 110);
    noise(ac, o, t, { delay: 0.48, dur: 0.12, type: 'highpass', f0: 1500, gain: 0.8 * s, curve: 2 });
    rumble(ac, o, t, 0.8 * s, 0.6, 1.8);
  },
  kill(ac, o, t, s) {
    tone(ac, o, t, { dur: 0.22, f0: R(130, 190), f1: 42, drop: 0.12, gain: 0.7 * s, curve: 3 });
    noise(ac, o, t, { dur: 0.14, type: 'lowpass', f0: R(700, 1300), f1: 150, gain: 0.5 * s, curve: 3 });
    noise(ac, o, t, { dur: 0.03, type: 'bandpass', f0: R(1500, 3000), q: 1.5, gain: 0.3 * s, curve: 2 });
  },
  boss_hit(ac, o, t, s) { boom(ac, o, t, 1.0 * s, 0, 70); noise(ac, o, t, { dur: 0.1, type: 'bandpass', f0: 1200, q: 1, gain: 0.6 * s, curve: 2 }); },
  boss_death(ac, o, t, s) {
    boom(ac, o, t, 1.3 * s, 0, 80); boom(ac, o, t, 1.1 * s, 0.25, 60); boom(ac, o, t, 1.0 * s, 0.6, 45);
    crackle(ac, o, t, 2, 40, 0.35 * s); rumble(ac, o, t, 1.2 * s, 0.3, 4);
  },
  boss_roar(ac, o, t, s) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 4; lp.connect(o);
    for (const d of [-20, 0, 15]) tone(ac, lp, t, { dur: 1.6, type: 'sawtooth', f0: 95, f1: 60, gain: 0.4 * s, attack: 0.15, curve: 2.5, detune: d });
    noise(ac, o, t, { dur: 1.5, type: 'bandpass', f0: 500, f1: 250, q: 2, gain: 0.4 * s, attack: 0.15, curve: 2.5 });
    tone(ac, o, t, { dur: 1.6, f0: 45, gain: 0.6 * s, attack: 0.2, curve: 3 });
  },
  levelup(ac, o, t, s) { chord(ac, o, t, [523, 659, 784, 1047, 1319], 0.07, 0.22 * s, 1.2); tone(ac, o, t, { dur: 0.6, f0: 130, gain: 0.3 * s, curve: 3 }); },
  chest(ac, o, t, s) {
    noise(ac, o, t, { dur: 0.15, type: 'lowpass', f0: 600, gain: 0.5 * s, curve: 3 });
    tone(ac, o, t, { dur: 0.3, f0: 140, f1: 70, gain: 0.5 * s, curve: 3 });
    chord(ac, o, t + 0.12, [784, 988, 1175, 1568, 1976, 2349], 0.06, 0.16 * s, 1.5, 'sine');
    for (let i = 0; i < 10; i++) tone(ac, o, t, { delay: 0.3 + i * 0.04, dur: 0.5, f0: R(3000, 6000), gain: 0.05 * s, curve: 4 });
  },
  artifact(ac, o, t, s) { chord(ac, o, t, [392, 494, 587, 784], 0, 0.22 * s, 2.0); chord(ac, o, t, [1175, 1568], 0.15, 0.12 * s, 1.6, 'sine'); tone(ac, o, t, { dur: 1.2, f0: 98, gain: 0.35 * s, attack: 0.02, curve: 3 }); },
  wings(ac, o, t, s) {
    for (let i = 0; i < 2; i++) noise(ac, o, t, { delay: i * 0.22, dur: 0.3, type: 'bandpass', f0: 300, f1: 1400, q: 1.2, gain: 0.6 * s, attack: 0.08, curve: 2 });
    tone(ac, o, t, { dur: 0.5, f0: 90, f1: 50, gain: 0.35 * s, attack: 0.04, curve: 3 });
  },
  dash(ac, o, t, s) { noise(ac, o, t, { dur: 0.28, type: 'bandpass', f0: 1800, f1: 400, q: 1.5, gain: 0.6 * s, attack: 0.02, curve: 2 }); },
  hurt(ac, o, t, s) { tone(ac, o, t, { dur: 0.25, type: 'triangle', f0: 220, f1: 80, gain: 0.5 * s, curve: 3 }); noise(ac, o, t, { dur: 0.12, type: 'lowpass', f0: 1500, gain: 0.4 * s, curve: 3 }); },
  pickup(ac, o, t, s) { tone(ac, o, t, { dur: 0.12, f0: R(1300, 1600), f1: 2200, gain: 0.12 * s, curve: 3 }); },
  coin(ac, o, t, s) { tone(ac, o, t, { dur: 0.15, type: 'square', f0: 1700, gain: 0.05 * s, curve: 3 }); tone(ac, o, t, { delay: 0.05, dur: 0.2, type: 'square', f0: 2250, gain: 0.05 * s, curve: 3 }); },
  click(ac, o, t, s) { tone(ac, o, t, { dur: 0.08, f0: 900, f1: 600, gain: 0.12 * s, curve: 3 }); },
  crack(ac, o, t, s) {
    for (let i = 0; i < 6; i++) { noise(ac, o, t, { delay: i * R(0.12, 0.3), dur: 0.12, type: 'highpass', f0: 1200, gain: 0.7 * s, curve: 2 }); tone(ac, o, t, { delay: i * 0.25, dur: 0.4, f0: 120, f1: 40, gain: 0.5 * s, curve: 3 }); }
    // grinding stone: noise amplitude-modulated by a fast LFO
    const g = ac.createGain(); g.gain.value = 0; g.connect(o);
    const lfo = ac.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.setValueAtTime(14, t); lfo.frequency.linearRampToValueAtTime(30, t + 2.2);
    const lg = ac.createGain(); lg.gain.value = 0.35 * s; lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + 2.6);
    noise(ac, g, t, { dur: 2.4, type: 'bandpass', f0: 350, f1: 180, q: 1.5, gain: 1, attack: 0.3, curve: 2 });
    rumble(ac, o, t, 1.2 * s, 0, 2.6);
  },
  collapse(ac, o, t, s) {
    boom(ac, o, t, 1.5 * s, 0, 70); boom(ac, o, t, 1.2 * s, 0.18, 50); boom(ac, o, t, 1.0 * s, 0.5, 40);
    noise(ac, o, t, { dur: 0.2, type: 'highpass', f0: 1200, gain: 0.9 * s, curve: 2 });
    crackle(ac, o, t, 2.5, 50, 0.4 * s);
    for (let i = 0; i < 8; i++) noise(ac, o, t, { delay: 0.3 + Math.random() * 2, dur: R(0.1, 0.3), type: 'bandpass', f0: R(300, 1200), q: 2, gain: 0.4 * s, curve: 3 });
    rumble(ac, o, t, 1.4 * s, 0.1, 4.5);
  },
};
export const SFX_NAMES = Object.keys(SFX);
/** Nominal tail length per sound (for offline render + voice accounting). */
export const SFX_LEN: Record<string, number> = { thunder: 3.6, fire: 2.6, ice: 1.2, arcane: 1.6, void: 2.6, spirit: 1.5, fusion: 4.2, steam: 2.2, charge_release: 2.8, kill: 0.35, boss_hit: 2.2, boss_death: 5, boss_roar: 1.9, levelup: 1.6, chest: 1.9, artifact: 2.3, wings: 0.7, dash: 0.4, hurt: 0.4, pickup: 0.2, coin: 0.3, click: 0.15, crack: 2.9, collapse: 5 };
