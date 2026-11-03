import { Spell } from '../types/game';
import { COMBO_MAGIC_RECIPES } from './combos';

/** Level-1 base definitions for the four starter magics. Stats scale via applySpellLevel(). */
export const BASE_SPELLS: Record<string, Omit<Spell, 'level' | 'currentCooldown'>> = {
  thunderstorm: {
    id: 'thunderstorm', name: 'Lightning', maxLevel: 8, icon: 'Zap', color: '#60a5fa',
    description: 'Calls lightning bolts onto random demons. +1 bolt per level.',
    cooldown: 1.6, damage: 110, area: 70, count: 1,
  },
  frost_nova: {
    id: 'frost_nova', name: 'Frost', maxLevel: 8, icon: 'Snowflake', color: '#93c5fd',
    description: 'Fires a ring of freezing ice shards. +2 shards per level.',
    cooldown: 1.9, damage: 60, area: 90, count: 4,
  },
  cataclysm: {
    id: 'cataclysm', name: 'Fire', maxLevel: 8, icon: 'Flame', color: '#f97316',
    description: 'Fire bursts erupt on the densest pack. Bigger and more bursts per level.',
    cooldown: 2.6, damage: 140, area: 85, count: 1,
  },
  arcane_missiles: {
    id: 'arcane_missiles', name: 'Arcane Blades', maxLevel: 8, icon: 'Sparkles', color: '#38bdf8',
    description: 'Homing arcane blades seek the nearest demon. More blades per level.',
    cooldown: 1.0, damage: 70, area: 0, count: 1,
  },
};
export const BASE_SPELL_IDS = ['thunderstorm', 'frost_nova', 'cataclysm', 'arcane_missiles'];

/** Recompute a spell's output from its level (level 1 = base). */
export function applySpellLevel(sp: Spell): Spell {
  const b = BASE_SPELLS[sp.id];
  if (!b) return sp;
  const l = sp.level;
  sp.damage = Math.round(b.damage * (1 + 0.25 * (l - 1)));
  sp.cooldown = b.cooldown;
  switch (sp.id) {
    case 'thunderstorm': sp.count = l; sp.area = Math.round(b.area * (1 + 0.08 * (l - 1))); break;
    case 'frost_nova': sp.count = 2 + 2 * l; sp.area = Math.round(b.area * (1 + 0.15 * (l - 1))); break;
    case 'cataclysm': sp.count = 1 + Math.floor(l / 2); sp.area = Math.round(b.area * (1 + 0.1 * (l - 1))); break;
    case 'arcane_missiles': sp.count = 1 + Math.floor(l / 2); break;
  }
  sp.evolved = l >= sp.maxLevel;
  return sp;
}

export function makeSpell(id: string, level = 1): Spell {
  const b = BASE_SPELLS[id];
  return applySpellLevel({ ...b, level, currentCooldown: 0.4 } as Spell);
}

export function makeComboSpell(comboId: string): Spell {
  const c = COMBO_MAGIC_RECIPES.find((r) => r.id === comboId)!;
  return {
    id: c.id, name: c.name, level: 1, maxLevel: 1, description: c.description, icon: c.icon,
    color: c.color, cooldown: 5, currentCooldown: 1, damage: 0, area: 0, count: 0, isCombo: true,
  };
}

export interface UpgradeChoice {
  id: string; // new:<spell> | lvl:<spell> | fast_cast | pass_*
  kind: 'new' | 'level' | 'fast' | 'passive';
  title: string;
  desc: string;
  icon: string;
  color: string;
  level?: number; // resulting level
}

export const PASSIVES: Record<string, { title: string; desc: string; icon: string }> = {
  pass_power: { title: 'Arcane Power', desc: '+15% spell damage', icon: 'Sparkles' },
  pass_crit: { title: 'Keen Focus', desc: '+5% crit chance', icon: 'Crosshair' },
  pass_vitality: { title: 'Vitality', desc: '+100 max HP, heal 100', icon: 'Heart' },
  pass_magnet: { title: 'Magnetism', desc: '+50 pickup radius', icon: 'Magnet' },
  pass_swift: { title: 'Swiftness', desc: '+10% move speed', icon: 'Wind' },
};
