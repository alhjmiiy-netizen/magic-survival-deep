import { ComboMagic, Spell } from '../types/game';

export const COMBO_MAGIC_RECIPES: ComboMagic[] = [
  {
    id: 'combo_blizzard',
    name: 'Celestial Blizzard',
    component1: 'arcane_missiles',
    component2: 'frost_nova',
    evolutionName: 'Astral Permafrost',
    description: 'Fuses Arcane Missiles and Frost Nova. Unleashes an orbiting ring of 8 crystalline star spears that continuously freeze and shatter all surrounding enemies.',
    unlocked: true,
    icon: 'Snowflake',
    color: '#38bdf8',
  },
  {
    id: 'combo_superconductor',
    name: 'Superconductor Frost',
    component1: 'frost_nova',
    component2: 'thunderstorm',
    evolutionName: 'Cryo-Electric Singularity',
    description: 'Fuses Frost Nova and Thunderstorm. Frozen enemies become living lightning conductors, discharging 800V chain lightning arcs to all nearby demons when hit.',
    unlocked: true,
    icon: 'Zap',
    color: '#60a5fa',
  },
  {
    id: 'combo_thunderfall',
    name: 'Thunderfall Holocaust',
    component1: 'thunderstorm',
    component2: 'cataclysm',
    evolutionName: 'Plasma Apocalypse',
    description: 'Fuses Thunderstorm and Cataclysm. Meteors explode into plasma lightning tornadoes upon impact, setting half the battlefield ablaze.',
    unlocked: true,
    icon: 'Flame',
    color: '#f97316',
  },
  {
    id: 'combo_singularity',
    name: 'Astral Singularity',
    component1: 'cataclysm',
    component2: 'arcane_missiles',
    evolutionName: 'Event Horizon',
    description: 'Fuses Cataclysm and Arcane Missiles. Spawns an imploding dark matter black hole that pulls all demonic fiends toward its crushing core.',
    unlocked: true,
    icon: 'Sparkles',
    color: '#a855f7',
  },
];

export function canFormCombo(spell1: Spell, spell2: Spell): ComboMagic | null {
  for (const combo of COMBO_MAGIC_RECIPES) {
    if (
      (combo.component1 === spell1.id && combo.component2 === spell2.id) ||
      (combo.component1 === spell2.id && combo.component2 === spell1.id)
    ) {
      if (spell1.level >= 6 && spell2.level >= 6) {
        return combo;
      }
    }
  }
  return null;
}
