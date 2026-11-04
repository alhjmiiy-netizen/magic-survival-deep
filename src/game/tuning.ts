/** Gameplay tuning constants shared by the engine, the Encyclopedia (codex.ts) and tests. Pure data, no DOM. */
export const FLIGHT_LIFT = 70, HOVER_SPEED = 1.2, SOAR_SPEED = 1.45, HOVER_DMG = 1.15, SOAR_DMG = 1.25, SOAR_H = 1.9, WORLD_MUL = 2.6, CATA_CD = 150, CATA_SCENE = 65, CHARGE_MAX = 1.5, FUSION_WINDOW = 1.2, FUSION_CD = 4;
/** Cataclysm meter gains per event (meter fills at 100). */
export const CATA_GAIN = { fusion: 22, tripleFusion: 100, synergy: 15, steam: 8, combo: 6, chargeMin: 6, chargeMax: 18 };
export const ELITE_EVERY = 45, ELITE_RANDOM_CHANCE = 0.015, ELITE_HP = 5, ELITE_DMG = 1.5, PACK_EVERY_REGION = 20, PACK_EVERY_ENDLESS = 15;
/** All 10 element pairs (spirit included). Each has its own effect in GameEngine.pairEffect, its own sound (sfx pair_<key>) and its own FUSION_CD cooldown. */
export interface PairDef { name: string; color: string; desc: string; radius: number; dmgMul: number }
export const FUSIONS: Record<string, PairDef> = {
  'fire+ice': { name: 'Steam Burst', color: '#e2e8f0', radius: 170, dmgMul: 1.4, desc: 'Thermal shock on the densest pack, then a scalding steam cloud that keeps burning (fire on frozen demons also makes steam).' },
  'fire+lightning': { name: 'Plasma Nova', color: '#fb923c', radius: 260, dmgMul: 1.6, desc: 'A wide plasma nova; six burning patches ring the blast.' },
  'ice+lightning': { name: 'Frozen Spark', color: '#7dd3fc', radius: 220, dmgMul: 1.2, desc: 'Freezes the pack for 2 s, then six sparks chain between the frozen demons.' },
  'arcane+fire': { name: 'Hex Inferno', color: '#f472b6', radius: 90, dmgMul: 1.3, desc: 'Hexes the six densest demons: each erupts in its own fire pillar.' },
  'arcane+ice': { name: 'Prism Shatter', color: '#a5b4fc', radius: 340, dmgMul: 1.3, desc: 'Eight prism lances fan out from the pack, piercing everything along them and chilling it.' },
  'arcane+lightning': { name: 'Arc Storm', color: '#93c5fd', radius: 200, dmgMul: 1.0, desc: 'Nine arc bolts strike random demons around you.' },
  'fire+spirit': { name: 'Soulfire', color: '#5eead4', radius: 80, dmgMul: 1.2, desc: 'Every spirit dives and leaves a pillar of soulfire where it lands (one at the pack with no spirits).' },
  'ice+spirit': { name: 'Wraith Frost', color: '#99f6e4', radius: 200, dmgMul: 1.1, desc: 'A freezing wraith ring bursts out around you, freezing nearby demons for 1.5 s.' },
  'lightning+spirit': { name: 'Storm Wraiths', color: '#67e8f9', radius: 320, dmgMul: 1.0, desc: 'Each spirit (and you) arcs lightning into the two nearest demons.' },
  'arcane+spirit': { name: 'Astral Echo', color: '#c4b5fd', radius: 200, dmgMul: 1.0, desc: 'Echoes one of your magics for free and pulls nearby loot to you.' },
};
export const FUSION_TABLE = FUSIONS;
