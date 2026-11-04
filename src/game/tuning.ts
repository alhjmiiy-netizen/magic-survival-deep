/** Gameplay tuning constants shared by the engine, the Encyclopedia (codex.ts) and tests. Pure data, no DOM. */
export const FLIGHT_LIFT = 70, HOVER_SPEED = 1.2, SOAR_SPEED = 1.45, HOVER_DMG = 1.15, SOAR_DMG = 1.25, SOAR_H = 1.9, WORLD_MUL = 2.6, CATA_CD = 150, CATA_SCENE = 65, CHARGE_MAX = 1.5, FUSION_WINDOW = 1.2, FUSION_CD = 4;
/** Cataclysm meter gains per event (meter fills at 100). */
export const CATA_GAIN = { fusion: 22, tripleFusion: 100, synergy: 15, steam: 8, combo: 6, chargeMin: 6, chargeMax: 18 };
export const ELITE_EVERY = 45, ELITE_RANDOM_CHANCE = 0.015, ELITE_HP = 5, ELITE_DMG = 1.5, PACK_EVERY_REGION = 20, PACK_EVERY_ENDLESS = 15;
export const FUSIONS: Record<string, { name: string; color: string }> = {
  'fire+ice': { name: 'Steam Burst', color: '#e2e8f0' }, 'fire+lightning': { name: 'Plasma Nova', color: '#fb923c' }, 'ice+lightning': { name: 'Frozen Spark', color: '#7dd3fc' },
  'arcane+fire': { name: 'Hex Inferno', color: '#f472b6' }, 'arcane+ice': { name: 'Prism Shatter', color: '#a5b4fc' }, 'arcane+lightning': { name: 'Arc Storm', color: '#93c5fd' },
  'fire+spirit': { name: 'Soulfire', color: '#5eead4' }, 'ice+spirit': { name: 'Wraith Frost', color: '#99f6e4' }, 'lightning+spirit': { name: 'Storm Wraiths', color: '#67e8f9' }, 'arcane+spirit': { name: 'Astral Echo', color: '#c4b5fd' },
};
export const FUSION_TABLE = FUSIONS;
