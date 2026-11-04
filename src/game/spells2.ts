/** v7 "more magic": twelve new data-driven spells. Pure data — runtime lives in magic2.ts. */
import type { Spell } from '../types/game';
import type { AnyElement } from './elements';

export interface Spell2Def {
  id: string; name: string; el: AnyElement; color: string; icon: string; desc: string;
  cooldown: number; damage: number; area: number; count: number;
  /** count & area at level l (1..8) */
  scale: (l: number, b: Spell2Def) => { count: number; area: number; cooldown?: number };
  text: (sp: Spell) => string;
  evo: [{ name: string; desc: string; color: string; dmg: number; area: number; count: number }, { name: string; desc: string; color: string; dmg: number; area: number; count: number }];
  /** what it does per level, for the codex */
  scaling: string;
  /** glyph path data (48x48 viewBox) */
  glyph: string[];
}
const ar = (b: Spell2Def, l: number, k: number) => Math.round(b.area * (1 + k * (l - 1)));
const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const SPELLS2: Spell2Def[] = [
  { id: 'meteor_shower', name: 'Meteor Shower', el: 'fire', color: '#f97316', icon: 'Flame', cooldown: 3.0, damage: 120, area: 70, count: 3,
    desc: 'Meteors streak down from the sky onto demons and leave burning craters. +1 meteor per level.',
    scale: (l, b) => ({ count: 2 + l, area: ar(b, l, 0.08) }), text: (s) => `${pl(s.count, 'meteor')} per cast, ${s.area} blast radius`,
    scaling: '3→10 meteors, blast 70→109, +25% dmg/level',
    evo: [{ name: 'Starfall', desc: 'Meteors are bigger and split into burning shards', color: '#fb7185', dmg: 1.4, area: 1.3, count: 2 }, { name: 'Armageddon', desc: 'A storm of colossal meteors; craters burn longer', color: '#ef4444', dmg: 2.0, area: 1.6, count: 6 }],
    glyph: ['M34 8L20 22', 'M40 14L28 26', 'M18 32a8 8 0 1016 0 8 8 0 10-16 0z', 'M10 40h28'] },
  { id: 'chain_lightning', name: 'Chain Lightning', el: 'lightning', color: '#facc15', icon: 'Zap', cooldown: 1.8, damage: 80, area: 230, count: 4,
    desc: 'A bolt leaps from demon to demon. +1 jump per level.',
    scale: (l, b) => ({ count: 3 + l, area: ar(b, l, 0.04) }), text: (s) => `bolt jumps ${s.count} times (${s.area} range)`,
    scaling: '4→11 jumps, range 230→294, +25% dmg/level',
    evo: [{ name: 'Forked Chain', desc: 'Every jump forks to a second demon', color: '#fde047', dmg: 1.4, area: 1.2, count: 3 }, { name: 'Zeus Cascade', desc: 'Three chains at once; each hit stuns briefly', color: '#fef9c3', dmg: 1.9, area: 1.4, count: 8 }],
    glyph: ['M8 10l10 8-4 4 10 8-4 4 12 8', 'M8 10h.5M40 42h.5', 'M30 6l-4 8h6l-4 8'] },
  { id: 'electric_zone', name: 'Spark Field', el: 'lightning', color: '#fde047', icon: 'Zap', cooldown: 4.5, damage: 45, area: 180, count: 1,
    desc: 'An electric field around you zaps demons inside it for 3 s. More zaps per level.',
    scale: (l, b) => ({ count: 1 + Math.floor(l / 2), area: ar(b, l, 0.06) }), text: (s) => `zaps ${s.count} demon${s.count > 1 ? 's' : ''} every 0.35 s within ${s.area}`,
    scaling: '1→5 zaps per pulse, field 180→256, +25% dmg/level',
    evo: [{ name: 'Tesla Dome', desc: 'Field follows you and lasts 4.5 s', color: '#fef08a', dmg: 1.4, area: 1.25, count: 1 }, { name: 'Storm Sphere', desc: 'Huge field; zaps chain once more', color: '#fffbeb', dmg: 1.9, area: 1.5, count: 3 }],
    glyph: ['M24 24m-16 0a16 16 0 1032 0 16 16 0 10-32 0', 'M26 12l-6 12h8l-6 12'] },
  { id: 'satellite_orbs', name: 'Satellite Orbs', el: 'arcane', color: '#c084fc', icon: 'Sparkles', cooldown: 6.0, damage: 42, area: 115, count: 2,
    desc: 'Arcane orbs orbit you for 5 s, striking every demon they pass. More orbs per level.',
    scale: (l, b) => ({ count: 2 + Math.floor(l / 2), area: ar(b, l, 0.05) }), text: (s) => `${pl(s.count, 'orb')} orbit at ${s.area}`,
    scaling: '2→6 orbs, orbit 115→155, +25% dmg/level',
    evo: [{ name: 'Twin Rings', desc: 'A second counter-rotating ring of orbs', color: '#d8b4fe', dmg: 1.4, area: 1.1, count: 2 }, { name: 'Celestial Orrery', desc: 'Orbs grow, burn brighter and never stop', color: '#f0abfc', dmg: 1.9, area: 1.3, count: 4 }],
    glyph: ['M24 24m-4 0a4 4 0 108 0 4 4 0 10-8 0', 'M24 24m-15 0a15 15 0 1030 0 15 15 0 10-30 0', 'M39 24h.5M9 24h.5M24 9v.5'] },
  { id: 'poison_cloud', name: 'Poison Cloud', el: 'poison', color: '#84cc16', icon: 'Skull', cooldown: 3.2, damage: 30, area: 80, count: 1,
    desc: 'Toxic clouds settle on the pack, poisoning and slowing demons for 5 s.',
    scale: (l, b) => ({ count: 1 + Math.floor(l / 3), area: ar(b, l, 0.1) }), text: (s) => `${pl(s.count, 'cloud')} (${s.area} radius) poison for 5 s`,
    scaling: '1→3 clouds, radius 80→136, +25% dmg/level (ticks twice a second)',
    evo: [{ name: 'Plague Fog', desc: 'Clouds drift toward demons and spread', color: '#a3e635', dmg: 1.4, area: 1.3, count: 1 }, { name: 'Blight Tempest', desc: 'Poisoned demons burst into new clouds on death', color: '#bef264', dmg: 2.0, area: 1.6, count: 2 }],
    glyph: ['M12 30c-5 0-6-8 0-9 0-7 9-9 12-4 3-5 12-3 11 4 6 0 6 9 0 9z', 'M18 36v4M24 36v6M30 36v4'] },
  { id: 'cyclone', name: 'Cyclone', el: 'wind', color: '#a7f3d0', icon: 'Wind', cooldown: 3.5, damage: 36, area: 58, count: 1,
    desc: 'Whirling cyclones roam outward, sucking demons in and grinding them.',
    scale: (l, b) => ({ count: 1 + Math.floor(l / 3), area: ar(b, l, 0.08) }), text: (s) => `${pl(s.count, 'cyclone')} (${s.area} radius)`,
    scaling: '1→3 cyclones, radius 58→90, +25% dmg/level',
    evo: [{ name: 'Twister', desc: 'Cyclones grow as they travel and pull harder', color: '#6ee7b7', dmg: 1.4, area: 1.3, count: 1 }, { name: 'Maelstrom', desc: 'Cyclones merge into a giant storm', color: '#ecfdf5', dmg: 2.0, area: 1.7, count: 2 }],
    glyph: ['M10 12h28', 'M13 19h22', 'M16 26h16', 'M19 33h10', 'M22 40h4'] },
  { id: 'gale_scythe', name: 'Gale Scythe', el: 'wind', color: '#6ee7b7', icon: 'Wind', cooldown: 1.5, damage: 75, area: 46, count: 2,
    desc: 'Crescent blades of wind slice forward, piercing every demon in their path.',
    scale: (l, b) => ({ count: 1 + Math.ceil(l / 2), area: ar(b, l, 0.06) }), text: (s) => `${pl(s.count, 'wind blade')}, pierce all`,
    scaling: '2→5 blades, width 46→65, +25% dmg/level',
    evo: [{ name: 'Razor Wind', desc: 'Blades boomerang back to you', color: '#34d399', dmg: 1.4, area: 1.2, count: 2 }, { name: 'Sky Reaper', desc: 'A full ring of giant blades', color: '#d1fae5', dmg: 1.9, area: 1.5, count: 6 }],
    glyph: ['M10 36C14 18 28 10 40 10 30 16 22 26 20 40z', 'M14 34l4-4'] },
  { id: 'stone_spikes', name: 'Stone Spikes', el: 'earth', color: '#b45309', icon: 'Mountain', cooldown: 2.2, damage: 90, area: 40, count: 5,
    desc: 'A line of stone spikes erupts toward the nearest demon, stunning what it hits.',
    scale: (l, b) => ({ count: 4 + l, area: ar(b, l, 0.06) }), text: (s) => `${s.count} spikes in a line, stun 0.4 s`,
    scaling: '5→12 spikes, spike radius 40→57, +25% dmg/level',
    evo: [{ name: 'Fault Line', desc: 'Three lines of spikes at once', color: '#d97706', dmg: 1.4, area: 1.2, count: 2 }, { name: 'Tectonic Wrath', desc: 'Spikes erupt in a star around you', color: '#fbbf24', dmg: 1.9, area: 1.4, count: 4 }],
    glyph: ['M6 40l6-16 4 16', 'M16 40l8-28 8 28', 'M32 40l5-14 5 14', 'M4 40h40'] },
  { id: 'gravity_well', name: 'Gravity Well', el: 'earth', color: '#a16207', icon: 'Circle', cooldown: 5.0, damage: 200, area: 140, count: 1,
    desc: 'Opens a gravity well on the pack that drags demons in for 2 s, then crushes them.',
    scale: (l, b) => ({ count: 1 + Math.floor(l / 4), area: ar(b, l, 0.07) }), text: (s) => `${pl(s.count, 'well')}, ${s.area} pull radius`,
    scaling: '1→3 wells, pull 140→209, +25% dmg/level (crush on collapse)',
    evo: [{ name: 'Event Horizon', desc: 'Stronger pull, crush hits twice', color: '#ca8a04', dmg: 1.4, area: 1.3, count: 1 }, { name: 'Black Star', desc: 'Wells collapse into a shockwave', color: '#fde68a', dmg: 2.0, area: 1.6, count: 2 }],
    glyph: ['M24 24m-3 0a3 3 0 106 0 3 3 0 10-6 0', 'M24 10c10 0 14 8 14 14', 'M24 38c-10 0-14-8-14-14', 'M10 18c4-6 8-8 14-8', 'M38 30c-4 6-8 8-14 8'] },
  { id: 'tidal_wave', name: 'Tidal Wave', el: 'water', color: '#3b82f6', icon: 'Waves', cooldown: 3.0, damage: 90, area: 170, count: 1,
    desc: 'A crashing wave rolls out from you, knocking demons back and slowing them.',
    scale: (l, b) => ({ count: 1 + Math.floor(l / 3), area: ar(b, l, 0.08) }), text: (s) => `${pl(s.count, 'wave')}, ${s.area} wide, knockback + slow`,
    scaling: '1→3 waves, width 170→265, +25% dmg/level',
    evo: [{ name: 'Riptide', desc: 'Waves pull back and hit twice', color: '#60a5fa', dmg: 1.4, area: 1.25, count: 1 }, { name: 'Tsunami', desc: 'A full ring of colossal waves', color: '#bfdbfe', dmg: 2.0, area: 1.5, count: 4 }],
    glyph: ['M4 28q5-6 10 0t10 0 10 0 10 0', 'M4 36q5-6 10 0t10 0 10 0 10 0', 'M8 20q8-12 18-4'] },
  { id: 'holy_smite', name: 'Holy Smite', el: 'light', color: '#fde68a', icon: 'Sun', cooldown: 2.4, damage: 220, area: 62, count: 1,
    desc: 'Pillars of holy light smite the toughest demons. +1 pillar every 2 levels.',
    scale: (l, b) => ({ count: 1 + Math.floor(l / 2), area: ar(b, l, 0.07) }), text: (s) => `${pl(s.count, 'pillar')} on the toughest demons`,
    scaling: '1→5 pillars, radius 62→92, +25% dmg/level',
    evo: [{ name: 'Judgement', desc: 'Pillars blind (stun) and heal you 1 HP per hit', color: '#fef08a', dmg: 1.4, area: 1.25, count: 1 }, { name: 'Heaven\'s Gate', desc: 'A ring of pillars descends around the target', color: '#fffbeb', dmg: 2.0, area: 1.5, count: 4 }],
    glyph: ['M20 6h8v30h-8z', 'M12 40h24', 'M24 2v2M14 10l2 2M34 10l-2 2'] },
  { id: 'magic_circle', name: 'Magic Circle', el: 'light', color: '#fef3c7', icon: 'Circle', cooldown: 4.0, damage: 34, area: 120, count: 1,
    desc: 'A rune circle forms under you and pulses holy damage for 3 s.',
    scale: (l, b) => ({ count: 1 + Math.floor(l / 4), area: ar(b, l, 0.1) }), text: (s) => `${pl(s.count, 'circle')} (${s.area} radius) pulse 6×`,
    scaling: '1→3 circles, radius 120→204, +25% dmg/level',
    evo: [{ name: 'Sacred Seal', desc: 'Circles also slow demons', color: '#fde68a', dmg: 1.4, area: 1.2, count: 1 }, { name: 'Grand Sigil', desc: 'One vast sigil that heals you', color: '#fffbeb', dmg: 2.0, area: 1.6, count: 1 }],
    glyph: ['M24 24m-16 0a16 16 0 1032 0 16 16 0 10-32 0', 'M24 10l12 21H12z', 'M24 38L12 17h24z'] },
];
export const SPELL2_BY_ID: Record<string, Spell2Def> = Object.fromEntries(SPELLS2.map((d) => [d.id, d]));
export const SPELL2_IDS = SPELLS2.map((d) => d.id);
