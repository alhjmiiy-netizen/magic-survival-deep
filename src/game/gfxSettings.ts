/** Persisted graphics options read live by the engine every frame. */
const KEY = 'msd.gfx.v1';
export interface GfxSettings { reducedEffects: boolean; interactiveBg: boolean }
function load(): GfxSettings {
  const d: GfxSettings = { reducedEffects: false, interactiveBg: true };
  try { const raw = localStorage.getItem(KEY); if (raw) Object.assign(d, JSON.parse(raw)); } catch { /* ignore */ }
  return d;
}
export const GFX: GfxSettings = load();
export function setGfx<K extends keyof GfxSettings>(k: K, v: GfxSettings[K]) {
  GFX[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(GFX)); } catch { /* ignore */ }
}
