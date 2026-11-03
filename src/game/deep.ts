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

export interface Artifact { id: string; name: string; icon: string; color: string; max: number; desc: (lv: number) => string; }
export const ARTIFACTS: Artifact[] = [
  { id: 'eye', name: 'Eye of Ruin', icon: 'Eye', color: '#f87171', max: 3, desc: (l) => `+${8 * l}% critical chance` },
  { id: 'hourglass', name: 'Hourglass of Ages', icon: 'Hourglass', color: '#facc15', max: 3, desc: (l) => `-${7 * l}% spell cooldowns` },
  { id: 'lodestone', name: 'Lodestone Heart', icon: 'Magnet', color: '#38bdf8', max: 3, desc: (l) => `+${60 * l} pickup (magnet) range` },
  { id: 'titan', name: "Titan's Blood", icon: 'Heart', color: '#ef4444', max: 3, desc: (l) => `+${150 * l} max HP` },
  { id: 'phoenix', name: 'Phoenix Feather', icon: 'Feather', color: '#fb923c', max: 1, desc: () => 'Revive once at 60% HP' },
  { id: 'prism', name: 'Split Prism', icon: 'Triangle', color: '#a78bfa', max: 2, desc: (l) => `+${l} projectile/bolt per cast` },
  { id: 'sigil', name: "Giant's Sigil", icon: 'Hexagon', color: '#34d399', max: 3, desc: (l) => `+${15 * l}% spell area` },
  { id: 'slayer', name: "Slayer's Brand", icon: 'Sword', color: '#e879f9', max: 3, desc: (l) => `+${35 * l}% damage vs elites & bosses` },
  { id: 'crown', name: 'Ember Crown', icon: 'Crown', color: '#fbbf24', max: 3, desc: (l) => `+${12 * l}% spell damage` },
];
export const artifactById = (id: string) => ARTIFACTS.find((a) => a.id === id)!;

export type EnemyType = Enemy['type'];
export interface Region {
  id: string; name: string; arena: string; duration: number; color: string;
  roster: [EnemyType, number][]; hp: number; dmg: number; spawn: number;
  hazard: { name: string; every: number; radius: number; dmg: number; color: string; slow?: boolean };
  boss: { name: string; hp: number };
}
export const REGION_DURATION = 180;
export const REGIONS: Region[] = [
  { id: 'r1', name: 'Astral Sanctuary', arena: 'astral_sanctuary', duration: REGION_DURATION, color: '#38bdf8',
    roster: [['crawler', 0.75], ['shadow_fiend', 0.25]], hp: 0.45, dmg: 0.35, spawn: 0.8,
    hazard: { name: 'Void Rifts', every: 14, radius: 110, dmg: 60, color: '80,200,255' }, boss: { name: 'Rift Warden', hp: 9000 } },
  { id: 'r2', name: 'Glacial Citadel', arena: 'glacial_citadel', duration: REGION_DURATION, color: '#7dd3fc',
    roster: [['crawler', 0.4], ['shadow_fiend', 0.4], ['hellhound', 0.2]], hp: 0.8, dmg: 0.5, spawn: 0.65,
    hazard: { name: 'Frost Fields (slow)', every: 11, radius: 130, dmg: 50, color: '170,230,255', slow: true }, boss: { name: 'Frost Behemoth', hp: 20000 } },
  { id: 'r3', name: 'Infernal Abyss', arena: 'infernal_abyss', duration: REGION_DURATION, color: '#f97316',
    roster: [['shadow_fiend', 0.35], ['hellhound', 0.5], ['void_knight', 0.15]], hp: 1.25, dmg: 0.7, spawn: 0.55,
    hazard: { name: 'Magma Eruptions', every: 8, radius: 120, dmg: 110, color: '255,110,30' }, boss: { name: 'Magma Tyrant', hp: 38000 } },
  { id: 'r4', name: 'Void Crypt', arena: 'void_crypt', duration: REGION_DURATION, color: '#c084fc',
    roster: [['crawler', 0.3], ['hellhound', 0.35], ['void_knight', 0.35]], hp: 1.8, dmg: 0.85, spawn: 0.48,
    hazard: { name: 'Blood Rain Sigils', every: 7, radius: 125, dmg: 140, color: '200,80,255' }, boss: { name: 'Crypt Lich', hp: 60000 } },
  { id: 'r5', name: 'Celestial Throne', arena: 'celestial_throne', duration: REGION_DURATION, color: '#facc15',
    roster: [['shadow_fiend', 0.3], ['hellhound', 0.3], ['void_knight', 0.4]], hp: 2.5, dmg: 1.0, spawn: 0.42,
    hazard: { name: 'Solar Flares', every: 6, radius: 130, dmg: 170, color: '255,210,80' }, boss: { name: 'Void Colossus Titan', hp: 95000 } },
];

export const ENDLESS_BOSS_EVERY = 120;
/** Endless difficulty at t seconds into endless. */
export function endlessScale(t: number) {
  const m = t / 60;
  return { hp: 0.5 * (1 + 0.45 * m + 0.02 * m * m), dmg: 0.4 + 0.1 * m, speed: Math.min(1.6, 1 + 0.04 * m), spawn: Math.max(0.12, 0.8 / (1 + 0.3 * m)), cap: Math.min(160, 70 + 8 * m) };
}

export interface BestRecord { endless: { time: number; kills: number; score: number }; regions: { best: number; time: number; cleared: number } }
const KEY = 'msdeep_best_v1';
export function loadBest(): BestRecord {
  try { const r = JSON.parse(localStorage.getItem(KEY) || ''); if (r && r.endless && r.regions) return r; } catch { /* none */ }
  return { endless: { time: 0, kills: 0, score: 0 }, regions: { best: 0, time: 0, cleared: 0 } };
}
export function saveBest(b: BestRecord) { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* ignore */ } }
