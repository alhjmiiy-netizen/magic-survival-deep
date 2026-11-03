export type EnemyType = 'crawler' | 'shadow_fiend' | 'hellhound' | 'void_knight' | 'colossus_boss';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  crystalDropChance: number;
  goldValue: number;
  color: string;
  glowColor: string;
  isBoss?: boolean;
  frozenUntil?: number;
  burnUntil?: number;
  hitFlash?: number;
  attackCooldown?: number;
  name: string;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  trailColor: string;
  duration: number;
  life: number;
  pierce: number;
  hitEnemies: Set<string>;
  split?: boolean;
  type: 'arcane_missile' | 'frost_shard' | 'lightning_arc' | 'meteor' | 'fire_wave' | 'combo_singularity' | 'combo_superconductor' | 'combo_blizzard';
  homingTarget?: Enemy | null;
  areaOfEffect?: number;
  orbitAngle?: number;
  orbitRadius?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'rune' | 'shard';
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  damage: number;
  isCrit: boolean;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface LootItem {
  id: string;
  x: number;
  y: number;
  type: 'xp' | 'crystal' | 'gold' | 'potion' | 'magnet' | 'chest';
  value: number;
  color: string;
  bobOffset: number;
  magnetized?: boolean;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  description: string;
  icon: string;
  color: string;
  cooldown: number; // in seconds
  currentCooldown: number;
  damage: number;
  area: number;
  count: number;
  evolved?: boolean;
  evolutionName?: string;
  evolutionDesc?: string;
  isCombo?: boolean;
  /** 0 base, 1 = Lv5 evolution, 2 = Lv8 final form */
  tier?: number;
}

export interface ComboMagic {
  id: string;
  name: string;
  component1: string;
  component2: string;
  description: string;
  unlocked: boolean;
  icon: string;
  color: string;
  evolutionName: string;
}

export interface QuickBeltItem {
  id: string;
  name: string;
  count: number;
  icon: string;
  color: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
}

export interface CharacterHero {
  id: string;
  name: string;
  title: string;
  bio: string;
  portrait: string;
  primarySpellId: string;
  bonusHp: number;
  bonusMana: number;
  bonusPower: number;
  bonusSpeed: number;
  color: string;
  specialTrait: string;
  standImage?: string;
  classType?: string;
  starterMagicText?: string;
  passiveTraitText?: string;
}

export interface ArenaRealm {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  ambientColor: string;
  ringColor: string;
  sigilColor: string;
  primaryWeather: 'stardust' | 'snow' | 'embers' | 'blood_rain' | 'cataclysm';
  hazardDescription: string;
  unlocked: boolean;
}

export interface StoryChapter {
  id: number;
  title: string;
  actName: string;
  waveTarget: number;
  dialogue: {
    speaker: string;
    text: string;
  }[];
  unlocked: boolean;
}

export interface PlayerStats {
  level: number;
  xp: number;
  maxXp: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  speed: number;
  spellPower: number;
  critChance: number;
  critMultiplier: number;
  cooldownReduction: number;
  pickupRadius: number;
  crystals: number;
  gold: number;
  dashCooldown: number;
  dashCurrentCooldown: number;
  isDashing: boolean;
  dashDuration: number;
}

export interface GameQuest {
  id: string;
  title: string;
  target: number;
  current: number;
  completed: boolean;
  iconType: 'kill' | 'crystal' | 'survive';
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: 'weapon' | 'amulet' | 'ring' | 'armor' | 'grimoire' | 'boots';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  stats: {
    label: string;
    value: string;
  }[];
  icon: string;
}
