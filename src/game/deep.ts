/** "Deep" systems: evolutions, synergies, artifacts, timed regions, endless scaling. */
import type { Enemy } from '../types/game';

export type Element = 'lightning' | 'ice' | 'fire' | 'arcane';
export const ELEMENT_OF: Record<string, Element> = {
  thunderstorm: 'lightning', frost_nova: 'ice', cataclysm: 'fire', arcane_missiles: 'arcane',
};

export interface Evolution { name: string; desc: string; color: string; dmg: number; area: number; count: number; }
/** [Lv5 evolution, Lv8 final form] per base spell */
export const EVOLUTIONS: Record<string, [Evolution, Evolution]> = {
  thunderstorm: [
    { name: 'Storm Lord', desc: 'Bolts chain to 2 nearby demons, +40% damage', color: '#67e8f9', dmg: 1.4, area: 1.25, count: 1 },
    { name: 'Judgement Tempest', desc: 'Golden bolts chain 4 times and stun', color: '#fde047', dmg: 2.0, area: 1.6, count: 3 },
  ],
  frost_nova: [
    { name: 'Glacial Lances', desc: 'Large shards pierce 3 demons, +40% damage', color: '#a5f3fc', dmg: 1.4, area: 1.3, count: 2 },
    { name: 'Absolute Zero', desc: 'Freezes every demon in a huge radius for 2.5s', color: '#e0f2fe', dmg: 2.0, area: 1.8, count: 6 },
  ],
  cataclysm: [
    { name: 'Meteor Fall', desc: 'Bursts leave burning ground for 3s', color: '#fb923c', dmg: 1.4, area: 1.3, count: 1 },
    { name: 'Inferno Apocalypse', desc: 'A rain of meteors; burning ground spreads', color: '#f43f5e', dmg: 2.0, area: 1.6, count: 3 },
  ],
  arcane_missiles: [
    { name: 'Phantom Blades', desc: 'Larger violet blades pierce 3 demons', color: '#c084fc', dmg: 1.4, area: 1, count: 1 },
    { name: 'Astral Swarm', desc: 'Blades split into 2 seekers on every hit', color: '#f0abfc', dmg: 1.9, area: 1, count: 3 },
  ],
};
export const evoUnlockLevel = (tier: number) => (tier === 0 ? 5 : 8);

export interface Synergy { id: string; name: string; a: Element; b: Element; desc: string; color: string; }
/** Active when both element spells are owned at Lv3+. */
export const SYNERGIES: Synergy[] = [
  { id: 'plasma', name: 'Plasma Overload', a: 'fire', b: 'lightning', desc: 'Lightning strikes ignite the ground (flames spread)', color: '#fb923c' },
  { id: 'chainfreeze', name: 'Chain Freeze', a: 'ice', b: 'lightning', desc: 'Lightning freezes its targets; +100% vs frozen', color: '#7dd3fc' },
  { id: 'thermal', name: 'Thermal Shock', a: 'fire', b: 'ice', desc: 'Fire deals +60% to frozen demons and shatters ice', color: '#fca5a5' },
  { id: 'hexflame', name: 'Hex Flames', a: 'arcane', b: 'fire', desc: 'Arcane blade hits leave small fire patches', color: '#f472b6' },
  { id: 'prism', name: 'Prism Frost', a: 'arcane', b: 'ice', desc: 'Arcane blades chill demons (0.6s freeze)', color: '#a5b4fc' },
  { id: 'conduit', name: 'Arc Conduit', a: 'arcane', b: 'lightning', desc: '25% of blade hits call a bonus lightning bolt', color: '#93c5fd' },
];
export const SYNERGY_MIN_LEVEL = 3;

export type Rarity = 'normal' | 'rare' | 'epic';
export const RARITY_COLOR: Record<Rarity, string> = { normal: '#cbd5e1', rare: '#38bdf8', epic: '#c084fc' };
export const RARITY_WEIGHT: Record<Rarity, number> = { normal: 60, rare: 30, epic: 10 };
export interface Artifact { id: string; name: string; icon: string; color: string; max: number; rarity: Rarity; tags?: string[]; desc: (lv: number) => string; }
const A = (rarity: Rarity, id: string, name: string, color: string, max: number, desc: (l: number) => string, tags?: string[]): Artifact => ({ id, name, icon: id, color, max, rarity, desc, tags });
export const ARTIFACTS: Artifact[] = [
  // ---- Normal ----
  A('normal', 'eye', 'Eye of Ruin', '#f87171', 3, (l) => `+${8 * l}% critical chance`),
  A('normal', 'lodestone', 'Lodestone Heart', '#38bdf8', 3, (l) => `+${60 * l} pickup (magnet) range`),
  A('normal', 'titan', "Titan's Blood", '#ef4444', 3, (l) => `+${150 * l} max HP`),
  A('normal', 'firefly', 'Firefly', '#a3e635', 3, (l) => `+${2 * l} Spirits orbiting you`, ['spirit']),
  A('normal', 'hermes', 'Hermes Sandal', '#fde68a', 3, (l) => `+${10 * l}% move speed`),
  A('normal', 'amber', 'Amber Heart', '#f59e0b', 3, (l) => `Regenerate ${3 * l} HP per second`),
  A('normal', 'wing_feather', 'Wing Feather', '#e0f2fe', 3, (l) => `+${12 * l}% flight speed`, ['flight']),
  A('normal', 'storm_rod', 'Storm Rod', '#fde047', 3, (l) => `Thunder: +${l} extra strike`, ['thunder']),
  A('normal', 'frost_ring', 'Frost Ring', '#a5f3fc', 3, (l) => `Frost Nova: +${20 * l}% area`, ['ice']),
  A('normal', 'ember_seed', 'Ember Seed', '#fb923c', 3, (l) => `Meteor: +${15 * l}% damage`, ['fire']),
  A('normal', 'whetstone', 'Whetstone', '#c4b5fd', 3, (l) => `Arcane Blades: +${l} blade`, ['arcane']),
  A('normal', 'golden_idol', 'Golden Idol', '#facc15', 3, (l) => `+${30 * l}% gold gained`),
  A('normal', 'scholar_lens', "Scholar's Lens", '#5eead4', 3, (l) => `+${15 * l}% experience gained`),
  // ---- Rare ----
  A('rare', 'hourglass', 'Hourglass of Ages', '#facc15', 3, (l) => `-${7 * l}% spell cooldowns`),
  A('rare', 'prism', 'Split Prism', '#a78bfa', 2, (l) => `+${l} projectile/bolt per cast`),
  A('rare', 'sigil', "Giant's Sigil", '#34d399', 3, (l) => `+${15 * l}% spell area`),
  A('rare', 'slayer', "Slayer's Brand", '#e879f9', 3, (l) => `+${35 * l}% damage vs elites & bosses`),
  A('rare', 'crown', 'Ember Crown', '#fbbf24', 3, (l) => `+${12 * l}% spell damage`),
  A('rare', 'storm_heart', 'Storm Heart', '#f472b6', 2, (l) => `Cataclysm meter fills ${30 * l}% faster`, ['cataclysm']),
  A('rare', 'sky_talon', 'Sky Talon', '#7dd3fc', 3, (l) => `+${20 * l}% damage while soaring`, ['flight']),
  A('rare', 'gale_wings', 'Gale Wings', '#bae6fd', 1, () => 'Takeoff releases a knockback shockwave', ['flight']),
  A('rare', 'thermal_coil', 'Thermal Coil', '#fdba74', 2, (l) => `Steam clouds +${50 * l}% damage`),
  A('rare', 'fusion_core', 'Fusion Core', '#f0abfc', 2, (l) => `Fusions: -${l}s cooldown, +${25 * l}% damage`),
  A('rare', 'charge_battery', 'Charge Battery', '#fef08a', 2, (l) => `Charged blasts charge ${30 * l}% faster`),
  A('rare', 'vampire_fang', 'Vampire Fang', '#dc2626', 3, (l) => `Heal ${2 * l} HP per kill`),
  A('rare', 'iron_skin', 'Iron Skin', '#94a3b8', 3, (l) => `-${10 * l}% damage taken`),
  // ---- Epic ----
  A('epic', 'phoenix', 'Phoenix Feather', '#fb923c', 1, () => 'Revive once at 60% HP'),
  A('epic', 'second_heart', 'Second Heart', '#fb7185', 1, () => 'Revive 1 more time, +50% max HP'),
  A('epic', 'ether_arrow', 'Ether Arrow', '#67e8f9', 1, () => '-20% Arcane Blades (magic bolt) & Spirit cooldown', ['arcane', 'spirit']),
  A('epic', 'cataclysm_shard', 'Cataclysm Shard', '#f43f5e', 1, () => 'Cataclysm scenes +15s and drop an extra chest', ['cataclysm']),
  A('epic', 'archmage_tome', "Archmage's Tome", '#818cf8', 1, () => '+25% spell damage, +10% area'),
  A('epic', 'eye_of_storm', 'Eye of the Storm', '#fde047', 1, () => 'While flying, call lightning every 8s', ['flight']),
  A('epic', 'twin_soul', 'Twin Soul', '#2dd4bf', 1, () => '+4 Spirits, +30% Spirit damage', ['spirit']),
];
export const artifactById = (id: string) => ARTIFACTS.find((a) => a.id === id)!;

export type EnemyType = Enemy['type'];
export interface Region {
  id: string; name: string; arena: string; duration: number; color: string;
  roster: [EnemyType, number][]; hp: number; dmg: number; spawn: number;
  hazard: { name: string; every: number; radius: number; dmg: number; color: string; slow?: boolean; air?: boolean };
  boss: { name: string; hp: number };
}
export const REGION_DURATION = 180;
export const REGIONS: Region[] = [
  { id: 'r1', name: 'Astral Sanctuary', arena: 'astral_sanctuary', duration: REGION_DURATION, color: '#38bdf8',
    roster: [['crawler', 0.5], ['shadow_fiend', 0.18], ['astral_wisp', 0.2], ['star_archer', 0.12]], hp: 0.45, dmg: 0.35, spawn: 0.8,
    hazard: { name: 'Void Rifts', every: 14, radius: 110, dmg: 60, color: '80,200,255' }, boss: { name: 'Rift Warden', hp: 9000 } },
  { id: 'r2', name: 'Glacial Citadel', arena: 'glacial_citadel', duration: REGION_DURATION, color: '#7dd3fc',
    roster: [['crawler', 0.25], ['shadow_fiend', 0.25], ['hellhound', 0.15], ['ice_golem', 0.1], ['frost_spitter', 0.15], ['astral_wisp', 0.1]], hp: 0.8, dmg: 0.5, spawn: 0.65,
    hazard: { name: 'Frost Fields (slow)', every: 11, radius: 130, dmg: 50, color: '170,230,255', slow: true }, boss: { name: 'Frost Behemoth', hp: 20000 } },
  { id: 'r3', name: 'Infernal Abyss', arena: 'infernal_abyss', duration: REGION_DURATION, color: '#f97316',
    roster: [['shadow_fiend', 0.2], ['hellhound', 0.3], ['void_knight', 0.1], ['magma_bomber', 0.17], ['fire_imp', 0.13], ['lava_charger', 0.1]], hp: 1.25, dmg: 0.7, spawn: 0.55,
    hazard: { name: 'Magma Eruptions', every: 8, radius: 120, dmg: 110, color: '255,110,30' }, boss: { name: 'Magma Tyrant', hp: 38000 } },
  { id: 'r4', name: 'Void Crypt', arena: 'void_crypt', duration: REGION_DURATION, color: '#c084fc',
    roster: [['crawler', 0.2], ['hellhound', 0.2], ['void_knight', 0.2], ['crypt_phantom', 0.15], ['bone_summoner', 0.1], ['void_ooze', 0.15]], hp: 1.8, dmg: 0.85, spawn: 0.48,
    hazard: { name: 'Blood Rain Sigils', every: 7, radius: 125, dmg: 140, color: '200,80,255', air: true }, boss: { name: 'Crypt Lich', hp: 60000 } },
  { id: 'r5', name: 'Celestial Throne', arena: 'celestial_throne', duration: REGION_DURATION, color: '#facc15',
    roster: [['shadow_fiend', 0.15], ['hellhound', 0.15], ['void_knight', 0.2], ['sun_seraph', 0.17], ['radiant_sentinel', 0.13], ['lava_charger', 0.1], ['void_ooze', 0.1]], hp: 2.5, dmg: 1.0, spawn: 0.42,
    hazard: { name: 'Solar Flares', every: 6, radius: 130, dmg: 170, color: '255,210,80', air: true }, boss: { name: 'Void Colossus Titan', hp: 95000 } },
];

export const ENDLESS_BOSS_EVERY = 120;
/** Endless difficulty at t seconds into endless. */
/** Endless crowd cap (hard-enforced in spawnEnemyAt with +10 slack for splits/scene events). */
export const ENDLESS_CAP = 150;
export function endlessScale(t: number) {
  const m = t / 60;
  return { hp: 0.5 * (1 + 0.45 * m + 0.02 * m * m), dmg: 0.4 + 0.1 * m, speed: Math.min(1.6, 1 + 0.04 * m), spawn: Math.max(0.12, 0.8 / (1 + 0.3 * m)), cap: Math.min(ENDLESS_CAP, 75 + 9 * m) };
}

export interface BestRecord { endless: { time: number; kills: number; score: number }; regions: { best: number; time: number; cleared: number } }
const KEY = 'msdeep_best_v1';
export function loadBest(): BestRecord {
  try { const r = JSON.parse(localStorage.getItem(KEY) || ''); if (r && r.endless && r.regions) return r; } catch { /* none */ }
  return { endless: { time: 0, kills: 0, score: 0 }, regions: { best: 0, time: 0, cleared: 0 } };
}
export function saveBest(b: BestRecord) { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* ignore */ } }
