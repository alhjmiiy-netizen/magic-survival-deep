/** Gameplay tuning constants shared by the engine, the Encyclopedia (codex.ts) and tests. Pure data, no DOM. */
export const FLIGHT_LIFT = 70, HOVER_SPEED = 1.2, SOAR_SPEED = 1.45, HOVER_DMG = 1.15, SOAR_DMG = 1.25, SOAR_H = 1.9, WORLD_MUL = 2.6, CATA_CD = 150, CATA_SCENE = 65, CHARGE_MAX = 1.5, FUSION_WINDOW = 1.2, FUSION_CD = 4;
/** Cataclysm meter gains per event (meter fills at 100). */
export const CATA_GAIN = { fusion: 22, tripleFusion: 100, synergy: 15, steam: 8, combo: 6, chargeMin: 6, chargeMax: 18 };
export const ELITE_EVERY = 45, ELITE_RANDOM_CHANCE = 0.015, ELITE_HP = 5, ELITE_DMG = 1.5, PACK_EVERY_REGION = 20, PACK_EVERY_ENDLESS = 15;
/** All 45 element pairs (10 hand-made + 35 generated below) (spirit included). Each has its own effect in GameEngine.pairEffect, its own sound (sfx pair_<key>) and its own FUSION_CD cooldown. */
export type PairPrim = 'nova' | 'pillars' | 'lances' | 'chain' | 'zone' | 'vortex' | 'rain' | 'wave' | 'ring';
export type PairStatus = 'freeze' | 'slow' | 'poison' | 'knock' | 'pull' | 'heal' | 'steam' | 'burn' | 'none';
export interface PairDef { name: string; color: string; desc: string; radius: number; dmgMul: number; prim?: PairPrim; st?: PairStatus; n?: number }
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

/** v7: 35 more pairs for the new elements (poison, wind, earth, water, light). Data-driven: each is a primitive shape + a status. */
const G = (a: string, b: string, name: string, color: string, prim: PairPrim, st: PairStatus, radius: number, dmgMul: number, n: number, desc: string): [string, PairDef] => [[a, b].sort().join('+'), { name, color, prim, st, radius, dmgMul, n, desc }];
const GEN_PAIRS: [string, PairDef][] = [
  G('fire', 'poison', 'Toxic Blaze', '#bef264', 'zone', 'burn', 120, 1.3, 4, 'Four clouds of burning venom smoulder on the pack.'),
  G('fire', 'wind', 'Firestorm', '#fb923c', 'vortex', 'burn', 150, 1.4, 2, 'Two fire tornados spin through the horde, dragging demons in.'),
  G('fire', 'earth', 'Magma Eruption', '#ea580c', 'pillars', 'burn', 85, 1.5, 7, 'Seven magma pillars burst from the ground under the nearest demons.'),
  G('fire', 'water', 'Scald Geyser', '#e2e8f0', 'rain', 'steam', 70, 1.3, 8, 'Eight boiling geysers erupt and leave scalding steam.'),
  G('fire', 'light', 'Solar Flare', '#fde047', 'nova', 'burn', 300, 1.6, 1, 'A blinding solar nova scorches everything on screen-centre.'),
  G('ice', 'poison', 'Venom Frost', '#a3e635', 'lances', 'poison', 320, 1.2, 10, 'Ten poisoned icicles fan out, piercing and envenoming.'),
  G('ice', 'wind', 'Blizzard Gale', '#e0f2fe', 'wave', 'freeze', 380, 1.2, 1, 'A freezing gale sweeps forward, freezing every demon it touches.'),
  G('earth', 'ice', 'Permafrost Spikes', '#bae6fd', 'pillars', 'freeze', 80, 1.3, 8, 'Frozen spikes impale eight demons and lock them in ice.'),
  G('ice', 'water', 'Glacier Tide', '#93c5fd', 'wave', 'slow', 420, 1.3, 1, 'A rolling wall of glacial water crushes and slows the pack.'),
  G('ice', 'light', 'Diamond Dust', '#f0f9ff', 'rain', 'freeze', 60, 1.1, 14, 'Fourteen glittering diamond shards rain down and freeze.'),
  G('lightning', 'poison', 'Neurotoxin Arc', '#d9f99d', 'chain', 'poison', 300, 1.1, 10, 'A toxic arc leaps between ten demons, envenoming each.'),
  G('lightning', 'wind', 'Thunder Squall', '#fef08a', 'vortex', 'none', 170, 1.3, 1, 'A huge squall vortex pulls demons together under rolling bolts.'),
  G('earth', 'lightning', 'Magnet Quake', '#fbbf24', 'ring', 'pull', 260, 1.3, 1, 'A magnetic quake yanks nearby demons toward you, then shocks them.'),
  G('lightning', 'water', 'Electrified Tide', '#60a5fa', 'chain', 'slow', 360, 1.2, 14, 'A charged tide chains fourteen times and leaves demons sluggish.'),
  G('light', 'lightning', 'Divine Thunder', '#fffbeb', 'rain', 'none', 75, 1.4, 10, 'Ten holy thunderbolts smite the strongest demons.'),
  G('arcane', 'poison', 'Hex Miasma', '#c084fc', 'zone', 'poison', 140, 1.2, 3, 'Three cursed miasma clouds hex and poison the pack.'),
  G('arcane', 'wind', 'Astral Gust', '#ddd6fe', 'lances', 'knock', 360, 1.1, 8, 'Eight astral gusts slice outward and blow demons back.'),
  G('arcane', 'earth', 'Runic Monolith', '#d6d3d1', 'pillars', 'knock', 110, 1.4, 4, 'Four runic monoliths slam down and shove demons away.'),
  G('arcane', 'water', 'Mana Tide', '#818cf8', 'ring', 'heal', 240, 1.1, 1, 'A tide of mana ripples out from you, healing you as it hits.'),
  G('arcane', 'light', 'Prismatic Ray', '#f5d0fe', 'lances', 'none', 460, 1.3, 6, 'Six prismatic rays split light across the battlefield.'),
  G('poison', 'spirit', 'Plague Wraiths', '#86efac', 'chain', 'poison', 280, 1.0, 12, 'Wraiths carry a plague that jumps between twelve demons.'),
  G('spirit', 'wind', 'Spirit Gale', '#ccfbf1', 'vortex', 'knock', 140, 1.2, 3, 'Three spirit whirlwinds roam, flinging demons aside.'),
  G('earth', 'spirit', 'Golem Stomp', '#a8a29e', 'nova', 'knock', 240, 1.4, 1, 'A spectral golem stomps the pack, shaking demons loose.'),
  G('spirit', 'water', 'Spirit Spring', '#5eead4', 'ring', 'heal', 220, 1.0, 1, 'A spirit spring wells up around you, healing and cleansing.'),
  G('light', 'spirit', 'Ascension', '#fef9c3', 'rain', 'heal', 80, 1.2, 8, 'Eight beams of ascension fall; each heals you a little.'),
  G('poison', 'wind', 'Toxic Cyclone', '#a3e635', 'vortex', 'poison', 150, 1.2, 2, 'Two venom cyclones wander, poisoning all they catch.'),
  G('earth', 'poison', 'Blight Fissure', '#65a30d', 'lances', 'poison', 340, 1.2, 5, 'Five blighted fissures crack open, poisoning along their length.'),
  G('poison', 'water', 'Swamp Mire', '#4d7c0f', 'zone', 'slow', 170, 1.0, 3, 'Three bubbling mires slow and poison demons who wade in.'),
  G('light', 'poison', 'Purge', '#ecfccb', 'nova', 'heal', 230, 1.3, 1, 'A purifying blast burns the corrupt and restores your health.'),
  G('earth', 'wind', 'Sandstorm', '#d6a35c', 'vortex', 'slow', 190, 1.2, 1, 'A blinding sandstorm grinds and slows everything inside it.'),
  G('water', 'wind', 'Typhoon', '#38bdf8', 'vortex', 'pull', 220, 1.4, 1, 'A colossal typhoon drags the whole pack into its eye.'),
  G('light', 'wind', 'Halo Gust', '#fefce8', 'ring', 'knock', 230, 1.1, 1, 'A ring of radiant wind blasts every nearby demon away.'),
  G('earth', 'water', 'Mudslide', '#92400e', 'wave', 'slow', 400, 1.3, 1, 'A mudslide surges forward, burying and slowing demons.'),
  G('earth', 'light', 'Crystal Bastion', '#fde68a', 'ring', 'none', 200, 1.4, 1, 'Crystal walls erupt in a ring around you, crushing what stands there.'),
  G('light', 'water', 'Rainbow Torrent', '#7dd3fc', 'lances', 'slow', 420, 1.2, 7, 'Seven rainbow torrents spray across the pack.'),
];
for (const [k, d] of GEN_PAIRS) FUSIONS[k] = d;
export const FUSION_TABLE = FUSIONS;
