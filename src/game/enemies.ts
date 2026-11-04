/** Enemy roster definitions (base stats before region/endless scaling). */
export type Behavior = 'chase' | 'swarm' | 'ranged' | 'lobber' | 'exploder' | 'charger' | 'teleport' | 'summoner' | 'splitter' | 'armored';
export interface EnemyDef {
  name: string; r: number; hp: number; speed: number; dmg: number; xp: number; gold: number;
  color: string; glow: string; behavior: Behavior; flying?: boolean; armor?: number;
  /** ranged: shot every s, projectile speed, dmg, colour; ground = lobbed ground shot (misses a flying hero) */
  shot?: { every: number; speed: number; dmg: number; color: string; ground?: boolean; slow?: boolean };
  region: string; desc: string; isNew?: boolean;
}
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  crawler: { name: 'Void Crawler', r: 14, hp: 320, speed: 3.0, dmg: 30, xp: 25, gold: 15, color: '#c084fc', glow: '#a855f7', behavior: 'chase', region: 'All', desc: 'Fast scuttling ground demon.' },
  shadow_fiend: { name: 'Shadow Fiend', r: 18, hp: 640, speed: 2.0, dmg: 65, xp: 45, gold: 35, color: '#ef4444', glow: '#b91c1c', behavior: 'chase', region: 'All', desc: 'Horned melee demon.' },
  hellhound: { name: 'Hellhound', r: 20, hp: 880, speed: 2.6, dmg: 80, xp: 60, gold: 50, color: '#f97316', glow: '#ea580c', behavior: 'chase', region: 'R2-R5', desc: 'Burning hound.' },
  void_knight: { name: 'Void Knight', r: 26, hp: 1900, speed: 1.5, dmg: 120, xp: 160, gold: 130, color: '#6366f1', glow: '#4f46e5', behavior: 'chase', region: 'R3-R5', desc: 'Armoured greatsword knight; 7% chest drop.' },
  // ---- v4 new enemies ----
  astral_wisp: { isNew: true, name: 'Astral Wisp', r: 10, hp: 160, speed: 3.7, dmg: 18, xp: 14, gold: 8, color: '#7dd3fc', glow: '#38bdf8', behavior: 'swarm', flying: true, region: 'Astral Sanctuary', desc: 'FLYING swarm that weaves in fast packs; reaches a flying hero.' },
  star_archer: { isNew: true, name: 'Star Archer', r: 15, hp: 380, speed: 2.0, dmg: 20, xp: 30, gold: 20, color: '#fde68a', glow: '#facc15', behavior: 'ranged', shot: { every: 2.6, speed: 280, dmg: 40, color: '#fde047' }, region: 'Astral Sanctuary', desc: 'Keeps distance and fires star arrows (hit flying heroes).' },
  ice_golem: { isNew: true, name: 'Ice Golem', r: 30, hp: 2600, speed: 1.1, dmg: 110, xp: 150, gold: 110, color: '#bae6fd', glow: '#7dd3fc', behavior: 'armored', armor: 0.4, region: 'Glacial Citadel', desc: 'Slow tank; ice armour blocks 40% damage.' },
  frost_spitter: { isNew: true, name: 'Frost Spitter', r: 17, hp: 520, speed: 1.8, dmg: 30, xp: 40, gold: 30, color: '#67e8f9', glow: '#22d3ee', behavior: 'lobber', shot: { every: 3.0, speed: 220, dmg: 45, color: '#a5f3fc', ground: true, slow: true }, region: 'Glacial Citadel', desc: 'Lobs slowing ice globs along the ground (miss a flying hero).' },
  magma_bomber: { isNew: true, name: 'Magma Bomber', r: 16, hp: 420, speed: 3.4, dmg: 30, xp: 35, gold: 25, color: '#fb923c', glow: '#f97316', behavior: 'exploder', region: 'Infernal Abyss', desc: 'Rushes in, fuses 0.6 s, then detonates (r110 ground blast).' },
  fire_imp: { isNew: true, name: 'Fire Imp', r: 14, hp: 360, speed: 2.8, dmg: 30, xp: 32, gold: 22, color: '#f87171', glow: '#ef4444', behavior: 'ranged', flying: true, shot: { every: 2.2, speed: 300, dmg: 45, color: '#fb923c' }, region: 'Infernal Abyss', desc: 'FLYING caster that hurls fireballs.' },
  lava_charger: { isNew: true, name: 'Lava Charger', r: 24, hp: 1500, speed: 1.6, dmg: 100, xp: 110, gold: 80, color: '#ea580c', glow: '#c2410c', behavior: 'charger', region: 'Infernal Abyss / Celestial Throne', desc: 'Telegraphs a line for 0.8 s, then dashes (x2 contact damage).' },
  crypt_phantom: { isNew: true, name: 'Crypt Phantom', r: 17, hp: 700, speed: 2.2, dmg: 70, xp: 55, gold: 40, color: '#d8b4fe', glow: '#a855f7', behavior: 'teleport', flying: true, region: 'Void Crypt', desc: 'FLYING ghost that phases and blinks next to you every 3 s.' },
  bone_summoner: { isNew: true, name: 'Bone Summoner', r: 19, hp: 1100, speed: 1.4, dmg: 40, xp: 90, gold: 70, color: '#e7e5e4', glow: '#a3e635', behavior: 'summoner', region: 'Void Crypt', desc: 'Keeps back and raises 3 crawlers every 6 s.' },
  void_ooze: { isNew: true, name: 'Void Ooze', r: 22, hp: 1200, speed: 1.9, dmg: 70, xp: 60, gold: 40, color: '#a78bfa', glow: '#7c3aed', behavior: 'splitter', region: 'Void Crypt / Celestial Throne', desc: 'Splits into 2 small oozes on death.' },
  sun_seraph: { isNew: true, name: 'Sun Seraph', r: 18, hp: 900, speed: 2.4, dmg: 50, xp: 70, gold: 55, color: '#fef08a', glow: '#facc15', behavior: 'ranged', flying: true, shot: { every: 2.4, speed: 340, dmg: 60, color: '#fef9c3' }, region: 'Celestial Throne', desc: 'FLYING angel that throws light lances.' },
  radiant_sentinel: { isNew: true, name: 'Radiant Sentinel', r: 28, hp: 3200, speed: 1.2, dmg: 130, xp: 180, gold: 140, color: '#fcd34d', glow: '#f59e0b', behavior: 'armored', armor: 0.5, region: 'Celestial Throne', desc: 'Shield-bearer; blocks 50% damage.' },
};
export const NEW_ENEMY_TYPES = Object.keys(ENEMY_DEFS).filter((k) => ENEMY_DEFS[k].isNew);
/** Flying packs injected regularly per region (type, base pack size). Pack every 20 s, +2 per region index. */
export const REGION_PACKS: string[][] = [['astral_wisp'], ['astral_wisp', 'frost_spitter'], ['fire_imp', 'magma_bomber'], ['crypt_phantom', 'astral_wisp'], ['sun_seraph', 'fire_imp']];
export const ELITE_AURA = ['#38bdf8', '#7dd3fc', '#f97316', '#c084fc', '#facc15'];
