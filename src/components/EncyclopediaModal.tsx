import React, { useState } from 'react';
import {
  X,
  Flame,
  Sparkles,
  Zap,
  Snowflake,
  Wind,
  Shield,
  CircleDot,
  Radio,
  Sun,
  Eye,
  Crosshair,
  Heart,
  Magnet,
  Clock,
  BookOpen,
  Gem,
  Circle,
  Skull,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface EncyclopediaModalProps {
  gold: number;
  crystals: number;
  onClose: () => void;
}

type TabType = 'magics' | 'fusions' | 'passives' | 'artifacts' | 'runes' | 'chronicles';

interface PowerEntry {
  id: string;
  name: string;
  category: TabType;
  iconType: string;
  element: string;
  level: number;
  maxLevel: number;
  damage?: number | string;
  cooldown?: number | string;
  area?: number | string;
  count?: number | string;
  description: string;
  fusionRecipe?: {
    partner: string;
    result: string;
  };
  flavorLore?: string;
}

export const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({
  gold,
  crystals,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('magics');
  const [selectedPowerId, setSelectedPowerId] = useState<string>('arcane_missiles');

  const powersList: PowerEntry[] = [
    // --- 1. ACTIVE MAGICS (20 Magics matching Magic Survival) ---
    {
      id: 'arcane_missiles',
      name: 'Spirit Darts',
      category: 'magics',
      iconType: 'darts',
      element: 'Arcane',
      level: 8,
      maxLevel: 8,
      damage: 340,
      cooldown: '0.45s',
      count: 4,
      description: 'Fires tracking homing bolts of condensed starlight seeking out the nearest demonic vessels.',
      fusionRecipe: { partner: 'Frost Nova', result: 'Celestial Blizzard' },
      flavorLore: 'The foundational distillation of spirit magic taught to every novice of the Astral Academy.',
    },
    {
      id: 'fireball',
      name: 'Fireball',
      category: 'magics',
      iconType: 'fireball',
      element: 'Fire',
      level: 8,
      maxLevel: 8,
      damage: 520,
      cooldown: '1.8s',
      area: '140px',
      description: 'Hurls an explosive sphere of concentrated brimstone that detonates on impact.',
      fusionRecipe: { partner: 'Thunderstorm', result: 'Thunderfall Holocaust' },
      flavorLore: 'Condensed from the molten rivers flowing beneath the fractured sanctuary.',
    },
    {
      id: 'thunderstorm',
      name: 'Thunderstorm',
      category: 'magics',
      iconType: 'lightning',
      element: 'Lightning',
      level: 8,
      maxLevel: 8,
      damage: 650,
      cooldown: '2.4s',
      count: 5,
      description: 'Strikes random enemies with devastating vertical lightning that chains across adjacent foes.',
      fusionRecipe: { partner: 'Frost Nova', result: 'Superconductor Frost' },
      flavorLore: 'Taps into the atmospheric ionic storms that perpetually rage in the high void.',
    },
    {
      id: 'comet_meteor',
      name: 'Meteor Swarm',
      category: 'magics',
      iconType: 'meteor',
      element: 'Cosmic',
      level: 8,
      maxLevel: 8,
      damage: 920,
      cooldown: '4.8s',
      area: '260px',
      description: 'Summons cosmic meteorites from deep space that crush hordes and incinerate terrain.',
      fusionRecipe: { partner: 'Cataclysm', result: 'Astral Singularity' },
      flavorLore: 'Remnants of destroyed celestial bodies hurled across the void by gravity wells.',
    },
    {
      id: 'cyclone',
      name: 'Cyclone',
      category: 'magics',
      iconType: 'vortex',
      element: 'Wind',
      level: 8,
      maxLevel: 8,
      damage: 280,
      cooldown: '3.0s',
      area: '190px',
      description: 'Spawns whirling vortex tempests that drag demons together and continuously shred them.',
      fusionRecipe: { partner: 'Satellite', result: 'Plasma Maelstrom' },
      flavorLore: 'A localized atmospheric vacuum that compresses matter into razor-thin whirlwinds.',
    },
    {
      id: 'electric_shock',
      name: 'Electric Shock',
      category: 'magics',
      iconType: 'shock',
      element: 'Lightning',
      level: 8,
      maxLevel: 8,
      damage: 410,
      cooldown: '1.2s',
      count: 6,
      description: 'Discharges sudden high-voltage electrostatic arcs that instantaneously paralyze enemies.',
      fusionRecipe: { partner: 'Spirit Darts', result: 'Voltaic Needles' },
      flavorLore: 'Raw static energy harvested from the collision of arcane dimensional barriers.',
    },
    {
      id: 'energy_satellites',
      name: 'Satellite Orbit',
      category: 'magics',
      iconType: 'satellite',
      element: 'Energy',
      level: 8,
      maxLevel: 8,
      damage: 380,
      cooldown: 'Continuous',
      count: 3,
      description: 'Manifests revolving energy spheres orbiting the Archmage that incinerate touching demons.',
      fusionRecipe: { partner: 'Cyclone', result: 'Orbital Black Hole' },
      flavorLore: 'Permanent micro-stars held in synchronous orbit by the sorcerer magnetic soul.',
    },
    {
      id: 'incineration',
      name: 'Incineration',
      category: 'magics',
      iconType: 'flame_wall',
      element: 'Fire',
      level: 8,
      maxLevel: 8,
      damage: 720,
      cooldown: '3.6s',
      area: '240px',
      description: 'Erupts a conical wave of white-hot hellfire in the direction of the largest horde.',
      fusionRecipe: { partner: 'Blizzard', result: 'Thermal Shockwave' },
      flavorLore: 'The unbridled release of core thermal mana through runic focus lenses.',
    },
    {
      id: 'blizzard_storm',
      name: 'Blizzard',
      category: 'magics',
      iconType: 'rain',
      element: 'Frost',
      level: 8,
      maxLevel: 8,
      damage: 310,
      cooldown: '4.5s',
      area: 'Screen-Wide',
      description: 'Descends a catastrophic blizzard that chills all enemies on screen and drops piercing icicles.',
      fusionRecipe: { partner: 'Spirit Darts', result: 'Celestial Blizzard' },
      flavorLore: 'The absolute hoarfrost of the Glacial Citadel brought into physical reality.',
    },
    {
      id: 'tidal_wave',
      name: 'Tsunami Wave',
      category: 'magics',
      iconType: 'wave',
      element: 'Aether',
      level: 8,
      maxLevel: 8,
      damage: 840,
      cooldown: '5.2s',
      area: '320px',
      description: 'Crushes across the battlefield with a surging wall of aetheric force, knocking back hordes.',
      fusionRecipe: { partner: 'Meteor Swarm', result: 'Cosmic Deluge' },
      flavorLore: 'A kinetic shockwave propagated across the dimensional fabric of the sanctuary dais.',
    },
    {
      id: 'magic_circle',
      name: 'Arcane Sigil',
      category: 'magics',
      iconType: 'ring',
      element: 'Runic',
      level: 8,
      maxLevel: 8,
      damage: 'Buff +40%',
      cooldown: '12.0s',
      area: '180px',
      description: 'Carves a glowing celestial circle on the dais. Standing inside amplifies Spell Power by 50%.',
      fusionRecipe: { partner: 'Armageddon', result: 'Seal of Eternity' },
      flavorLore: 'Ancient geometrical seals carved by the first titan architects of the astral planes.',
    },
    {
      id: 'frost_nova',
      name: 'Frost Nova',
      category: 'magics',
      iconType: 'snowflake',
      element: 'Frost',
      level: 8,
      maxLevel: 8,
      damage: 480,
      cooldown: '3.2s',
      area: '220px',
      description: 'Unleashes an expanding cryo ring that freezes demons solid for 2.5 seconds.',
      fusionRecipe: { partner: 'Spirit Darts', result: 'Celestial Blizzard' },
      flavorLore: 'Instantaneous cryogenic crystallization of atmospheric moisture.',
    },
    {
      id: 'flash_shock',
      name: 'Flash Shock',
      category: 'magics',
      iconType: 'beam',
      element: 'Light',
      level: 8,
      maxLevel: 8,
      damage: 890,
      cooldown: '2.8s',
      count: 2,
      description: 'Fires high-speed piercing photon lances that slice through entire columns of demonic fiends.',
      fusionRecipe: { partner: 'Electric Shock', result: 'Photonic Railgun' },
      flavorLore: 'Coherent starlight channeled through diamond prisms embedded in the staff.',
    },
    {
      id: 'shield_barrier',
      name: 'Aegis Shield',
      category: 'magics',
      iconType: 'shield_circle',
      element: 'Divine',
      level: 8,
      maxLevel: 8,
      damage: 'Absorbs 450 HP',
      cooldown: '14.0s',
      description: 'Forms a translucent protective aura absorbing lethal attacks and repelling nearby enemies.',
      fusionRecipe: { partner: 'Satellite Orbit', result: 'Reflective Aegis' },
      flavorLore: 'A manifestation of unyielding willpower woven into an impenetrable crystal barrier.',
    },
    {
      id: 'armageddon',
      name: 'Armageddon',
      category: 'magics',
      iconType: 'nuke',
      element: 'Cataclysm',
      level: 5,
      maxLevel: 5,
      damage: 5500,
      cooldown: '45.0s',
      area: 'Entire Battlefield',
      description: 'Channels catastrophic cosmic judgment that wipes all non-boss demonic entities from existence.',
      fusionRecipe: { partner: 'Cataclysm', result: 'Apocalyptic Holocaust' },
      flavorLore: 'The forbidden incantation that shattered the heavens during the Great Void Incursion.',
    },

    // --- 2. FUSION COMBINATIONS (Magic Fusions) ---
    {
      id: 'fuse_celestial_blizzard',
      name: 'Celestial Blizzard',
      category: 'fusions',
      iconType: 'snowflake',
      element: 'Astral Frost',
      level: 5,
      maxLevel: 5,
      damage: 1650,
      cooldown: '2.8s',
      area: 'Screen-Wide',
      description: 'Frost Nova + Spirit Darts. Freezes the entire battlefield while firing dozens of tracking ice spears.',
      flavorLore: 'The absolute fusion of cold starlight and crystallization.',
    },
    {
      id: 'fuse_superconductor',
      name: 'Superconductor Frost',
      category: 'fusions',
      iconType: 'shock',
      element: 'Cryo-Lightning',
      level: 5,
      maxLevel: 5,
      damage: 1980,
      cooldown: '2.2s',
      count: 8,
      description: 'Frost Nova + Thunderstorm. Every frozen demon becomes an electrical conduit chaining lightning arcs.',
      flavorLore: 'Zero electrical resistance achieved through absolute zero freezing.',
    },
    {
      id: 'fuse_thunderfall',
      name: 'Thunderfall Holocaust',
      category: 'fusions',
      iconType: 'meteor',
      element: 'Plasma Fire',
      level: 5,
      maxLevel: 5,
      damage: 2450,
      cooldown: '3.5s',
      area: '340px',
      description: 'Thunderstorm + Cataclysm. Apocalyptic thunder meteors rain down, leaving molten ionized craters.',
      flavorLore: 'When the tempest meets the molten core of the underworld.',
    },
    {
      id: 'fuse_singularity',
      name: 'Astral Singularity',
      category: 'fusions',
      iconType: 'vortex',
      element: 'Dark Matter',
      level: 5,
      maxLevel: 5,
      damage: 3200,
      cooldown: '4.0s',
      area: '380px',
      description: 'Cyclone + Cataclysm. Spawns an inescapable black hole that crushes hundreds of demons into nothingness.',
      flavorLore: 'A gravitational abyss where neither time nor light can escape.',
    },

    // --- 3. PASSIVE TALENTS ---
    {
      id: 'pass_haste',
      name: 'Fast Casting',
      category: 'passives',
      iconType: 'clock',
      element: 'Chrono',
      level: 5,
      maxLevel: 5,
      description: 'Reduces all spell casting cooldowns by 5% per rank (up to 25% total reduction).',
      flavorLore: 'Accelerating the flow of personal time relative to the surrounding battlefield.',
    },
    {
      id: 'pass_snipe',
      name: 'Aether Snipe',
      category: 'passives',
      iconType: 'crosshair',
      element: 'Precision',
      level: 5,
      maxLevel: 5,
      description: 'Increases Critical Hit Chance by 4% and Critical Multiplier by +0.3 per rank.',
      flavorLore: 'Attuning ocular vision to spot micro-fractures in demonic void armor.',
    },
    {
      id: 'pass_vitality',
      name: 'Titan Vitality',
      category: 'passives',
      iconType: 'heart',
      element: 'Life',
      level: 5,
      maxLevel: 5,
      description: 'Increases Max Health by 150 and adds +10 HP/sec natural regeneration.',
      flavorLore: 'Infusing physical bone and blood with eternal aetheric longevity.',
    },
    {
      id: 'pass_magnet',
      name: 'Gravitational Core',
      category: 'passives',
      iconType: 'magnet',
      element: 'Gravity',
      level: 5,
      maxLevel: 5,
      description: 'Expands loot attraction radius by +60px per rank for Crystals, Gold and Mana Orbs.',
      flavorLore: 'A miniature gravitational vortex rooted inside the sorcerer soul mantle.',
    },

    // --- 4. ARTIFACTS & RELICS ---
    {
      id: 'art_dragon_heart',
      name: 'Dragon Heart Relic',
      category: 'artifacts',
      iconType: 'heart',
      element: 'Ancient',
      level: 3,
      maxLevel: 3,
      description: 'All Fire & Meteor spells gain +45% Damage and leave molten lava trails on the floor.',
      flavorLore: 'The still-beating crystal heart of the primordial magma wyrm.',
    },
    {
      id: 'art_sorcerer_ring',
      name: "Archmage's Signet",
      category: 'artifacts',
      iconType: 'ring',
      element: 'Relic',
      level: 3,
      maxLevel: 3,
      description: 'Grants +2 extra projectiles to all multi-shot magics including Spirit Darts and Satellites.',
      flavorLore: 'Worn by the legendary Grand Seers who sealed the void rift millennia ago.',
    },
    {
      id: 'art_philosopher',
      name: "Philosopher's Stone",
      category: 'artifacts',
      iconType: 'gem',
      element: 'Alchemy',
      level: 3,
      maxLevel: 3,
      description: 'Increases Gold and Crystal collection values by 50% across all realms.',
      flavorLore: 'The pinnacle of esoteric transmutation capable of turning base void lead into celestial gold.',
    },
  ];

  const currentTabPowers = powersList.filter((p) => p.category === activeTab);
  const selectedPower = powersList.find((p) => p.id === selectedPowerId) || powersList[0];

  const renderIconGraphic = (iconType: string, isSmall: boolean = false) => {
    const size = isSmall ? 'w-5 h-5' : 'w-10 h-10';
    switch (iconType) {
      case 'darts':
        return <Sparkles className={`${size} text-sky-300 stroke-[2]`} />;
      case 'fireball':
      case 'flame_wall':
        return <Flame className={`${size} text-amber-400 stroke-[2]`} />;
      case 'lightning':
      case 'shock':
        return <Zap className={`${size} text-purple-300 stroke-[2]`} />;
      case 'meteor':
      case 'nuke':
        return <Sun className={`${size} text-orange-400 stroke-[2]`} />;
      case 'vortex':
        return <Wind className={`${size} text-teal-300 stroke-[2]`} />;
      case 'snowflake':
        return <Snowflake className={`${size} text-cyan-200 stroke-[2]`} />;
      case 'satellite':
      case 'ring':
        return <CircleDot className={`${size} text-amber-300 stroke-[2]`} />;
      case 'beam':
        return <Radio className={`${size} text-sky-400 stroke-[2]`} />;
      case 'shield_circle':
        return <Shield className={`${size} text-emerald-300 stroke-[2]`} />;
      case 'heart':
        return <Heart className={`${size} text-rose-400 stroke-[2]`} />;
      case 'clock':
        return <Clock className={`${size} text-sky-300 stroke-[2]`} />;
      case 'crosshair':
        return <Crosshair className={`${size} text-amber-300 stroke-[2]`} />;
      case 'magnet':
        return <Magnet className={`${size} text-purple-400 stroke-[2]`} />;
      default:
        return <Sparkles className={`${size} text-amber-300 stroke-[2]`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 select-none font-sans animate-in fade-in duration-200">
      {/* Container styled like Magic Survival Encyclopedia */}
      <div className="relative w-full max-w-4xl h-[94vh] max-h-[850px] bg-[#0a0d14] border-2 border-stone-700/80 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col">
        {/* Top Header Bar matching Magic Survival */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-[#06080d] z-20">
          {/* Currencies (Gold & Crystals) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 bg-[#121620] px-3 py-1 rounded-md border border-stone-800 text-amber-400 font-bold font-mono text-xs shadow-inner">
              <Circle className="w-3.5 h-3.5 fill-amber-400" />
              <span>{gold.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#121620] px-3 py-1 rounded-md border border-stone-800 text-cyan-400 font-bold font-mono text-xs shadow-inner">
              <Gem className="w-3.5 h-3.5 fill-cyan-400" />
              <span>{crystals.toLocaleString()}</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black font-cinzel tracking-wider text-stone-100 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
              Encyclopedia
            </h2>
            <div className="text-[10px] text-stone-400 font-cinzel uppercase tracking-widest">
              Grimoire of Ancient Magics & Fusions
            </div>
          </div>

          {/* Close X Button */}
          <button
            onClick={() => {
              sound.playItemUse();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-[#141822] border border-stone-700 flex items-center justify-center text-stone-300 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 6 Category Tabs matching Magic Survival icons */}
        <div className="flex items-center justify-around px-4 py-2.5 border-b border-stone-800 bg-[#0d1017]">
          <button
            onClick={() => {
              sound.playItemUse();
              setActiveTab('magics');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'magics'
                ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_#f59e0b]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
            title="Active Magics"
          >
            <Flame className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-cinzel font-bold">Magics</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              setActiveTab('fusions');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'fusions'
                ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_#f59e0b]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
            title="Magic Combinations / Fusions"
          >
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-cinzel font-bold">Fusions</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              setActiveTab('passives');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'passives'
                ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_#f59e0b]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
            title="Passive Talents"
          >
            <Award className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-cinzel font-bold">Passives</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              setActiveTab('artifacts');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'artifacts'
                ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_#f59e0b]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
            title="Artifacts & Relics"
          >
            <Layers className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-cinzel font-bold">Artifacts</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              setActiveTab('runes');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'runes'
                ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_#f59e0b]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
            title="Rune Sigils"
          >
            <CircleDot className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-cinzel font-bold">Runes</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              setActiveTab('chronicles');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'chronicles'
                ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_#f59e0b]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
            title="Research Chronicles"
          >
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-cinzel font-bold">Notes</span>
          </button>
        </div>

        {/* Center Grid of Powers (5 columns matching screenshot) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#080b11]">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {currentTabPowers.map((power) => {
              const isSelected = power.id === selectedPowerId;
              return (
                <div
                  key={power.id}
                  onClick={() => {
                    sound.playItemUse();
                    setSelectedPowerId(power.id);
                  }}
                  className={`relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer min-h-[105px] group ${
                    isSelected
                      ? 'bg-[#151a26] border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)] scale-105'
                      : 'bg-[#0f131c] border-stone-800 hover:border-stone-600 hover:bg-[#131824]'
                  }`}
                >
                  {/* Element Tag */}
                  <span className="text-[9px] font-cinzel uppercase font-bold text-stone-400 group-hover:text-amber-300">
                    {power.element}
                  </span>

                  {/* Icon Graphic */}
                  <div className="my-1.5 flex items-center justify-center">
                    {renderIconGraphic(power.iconType, false)}
                  </div>

                  {/* Power Name */}
                  <div className="text-[10px] font-bold font-cinzel text-center text-stone-200 line-clamp-1 w-full">
                    {power.name}
                  </div>

                  {/* Green Mastery Level Pips (••••••••) matching Magic Survival */}
                  <div className="flex items-center gap-1 mt-1.5">
                    {Array.from({ length: power.maxLevel }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < power.level
                            ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]'
                            : 'bg-stone-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Detailed Power Slab matching Magic Survival */}
        <div className="border-t border-stone-800 bg-[#05070a] p-4 sm:p-5 z-20">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Selected Power Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1">
                <h3 className="text-xl font-bold font-cinzel text-white">
                  {selectedPower.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
                  Lv. {selectedPower.level} / {selectedPower.maxLevel}
                </span>
                <span className="text-[10px] font-cinzel uppercase text-amber-400">
                  [{selectedPower.element}]
                </span>
              </div>

              <p className="text-xs text-stone-300 font-sans leading-relaxed mb-2">
                {selectedPower.description}
              </p>

              {/* Stats Chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] font-mono">
                {selectedPower.damage && (
                  <span className="text-rose-400">Dmg: {selectedPower.damage}</span>
                )}
                {selectedPower.cooldown && (
                  <span className="text-sky-400">CD: {selectedPower.cooldown}</span>
                )}
                {selectedPower.area && (
                  <span className="text-amber-400">Area: {selectedPower.area}</span>
                )}
                {selectedPower.count && (
                  <span className="text-purple-400">Count: {selectedPower.count}</span>
                )}
              </div>

              {/* Fusion Recipe note */}
              {selectedPower.fusionRecipe && (
                <div className="mt-2 text-[11px] text-pink-400 font-cinzel flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>
                    Combines with <strong>{selectedPower.fusionRecipe.partner}</strong> →{' '}
                    <strong className="text-amber-300">{selectedPower.fusionRecipe.result}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Right: Close or Mastery Action */}
            <button
              onClick={() => {
                sound.playItemUse();
                onClose();
              }}
              className="py-2.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 hover:text-white font-cinzel text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
            >
              Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
