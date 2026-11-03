import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Snowflake,
  Flame,
  RotateCcw,
  FastForward,
  ChevronRight,
  Shield,
  Layers,
  Circle,
  Gem,
} from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface LevelUpModalProps {
  level: number;
  onSelectUpgrade: (upgradeId: string) => void;
}

interface SpellChoice {
  id: string;
  name: string;
  element: string;
  type: string;
  category: string;
  currentLevel: number;
  maxLevel: number;
  iconName: string;
  statDeltas: {
    label: string;
    current: string;
    next: string;
    delta: string;
  }[];
  fusionPartner?: string;
  fusionResult?: string;
  description: string;
}

const LEVEL_CHOICE_POOL: SpellChoice[] = [
  {
    id: 'up_arcane_missile',
    name: 'Arcane Missiles',
    element: 'Astral',
    type: 'Active Spell',
    category: 'Evocation',
    currentLevel: 4,
    maxLevel: 8,
    iconName: 'missiles',
    statDeltas: [
      { label: 'Damage', current: '380', next: '520', delta: '+36%' },
      { label: 'Projectiles', current: '4', next: '6', delta: '+2' },
      { label: 'Pierce Count', current: '1', next: '2', delta: '+1' },
      { label: 'Cooldown', current: '1.8s', next: '1.5s', delta: '-16%' },
    ],
    fusionPartner: 'Electric Shock',
    fusionResult: 'Chain Singularity',
    description: 'Fires high-velocity crystalline astral darts that track approaching demonic targets.',
  },
  {
    id: 'up_frost_nova',
    name: 'Frost Nova',
    element: 'Glacial',
    type: 'Area Magic',
    category: 'Alteration',
    currentLevel: 3,
    maxLevel: 8,
    iconName: 'frost',
    statDeltas: [
      { label: 'Freeze Radius', current: '220', next: '290', delta: '+31%' },
      { label: 'Shatter Dmg', current: '480', next: '660', delta: '+37%' },
      { label: 'Cooldown', current: '3.5s', next: '2.8s', delta: '-20%' },
      { label: 'Freeze Duration', current: '2.5s', next: '3.2s', delta: '+0.7s' },
    ],
    fusionPartner: 'Meteor',
    fusionResult: 'Frozen Comet',
    description: 'Expands a flash-freezing glacial shockwave that locks demons and shatters them on death.',
  },
  {
    id: 'up_cataclysm',
    name: 'Cataclysm Meteor',
    element: 'Infernal',
    type: 'Heavy Bombard',
    category: 'Evocation',
    currentLevel: 5,
    maxLevel: 8,
    iconName: 'meteor',
    statDeltas: [
      { label: 'Impact Damage', current: '920', next: '1350', delta: '+46%' },
      { label: 'Blast Radius', current: '280', next: '360', delta: '+28%' },
      { label: 'Ground Burn', current: '120/s', next: '210/s', delta: '+75%' },
      { label: 'Meteor Count', current: '2', next: '3', delta: '+1' },
    ],
    fusionPartner: 'Incineration',
    fusionResult: 'Demon Rift',
    description: 'Summons blazing brimstone meteors from the celestial void, leaving molten ground fissures.',
  },
  {
    id: 'up_thunderstorm',
    name: 'Thunderstorm',
    element: 'Electric',
    type: 'Chain Attack',
    category: 'Evocation',
    currentLevel: 6,
    maxLevel: 8,
    iconName: 'lightning',
    statDeltas: [
      { label: 'Strike Damage', current: '650', next: '910', delta: '+40%' },
      { label: 'Chain Targets', current: '5', next: '8', delta: '+3' },
      { label: 'Crit Chance', current: '20%', next: '35%', delta: '+15%' },
      { label: 'Cooldown', current: '2.4s', next: '1.9s', delta: '-20%' },
    ],
    fusionPartner: 'Cyclone',
    fusionResult: 'Heart of Lightning',
    description: 'Calls violent electrical bolts from thunderclouds that arc between nearby swarming hordes.',
  },
  {
    id: 'up_cyclone',
    name: 'Cyclone Vortex',
    element: 'Wind',
    type: 'Vortex Crowd Control',
    category: 'Conjuration',
    currentLevel: 2,
    maxLevel: 8,
    iconName: 'cyclone',
    statDeltas: [
      { label: 'Suction Radius', current: '180', next: '250', delta: '+38%' },
      { label: 'Spin Damage', current: '220/s', next: '340/s', delta: '+54%' },
      { label: 'Vortex Count', current: '1', next: '2', delta: '+1' },
      { label: 'Duration', current: '4.0s', next: '5.5s', delta: '+1.5s' },
    ],
    fusionPartner: 'Thunderstorm',
    fusionResult: 'Vortex Maelstrom',
    description: 'Generates swirling razor wind squalls that drag hordes into a crushing epicenter.',
  },
  {
    id: 'up_satellite',
    name: 'Spirit Satellites',
    element: 'Astral',
    type: 'Orbital Defense',
    category: 'Enchantment',
    currentLevel: 4,
    maxLevel: 8,
    iconName: 'satellite',
    statDeltas: [
      { label: 'Orbit Speed', current: '3.0', next: '4.2', delta: '+40%' },
      { label: 'Orb Damage', current: '310', next: '450', delta: '+45%' },
      { label: 'Orb Count', current: '3', next: '4', delta: '+1' },
      { label: 'Orbit Radius', current: '120', next: '145', delta: '+20%' },
    ],
    fusionPartner: 'Shield',
    fusionResult: 'Solar Flare',
    description: 'Three luminous celestial orbs constantly rotate around the archmage, pulverizing touching foes.',
  },
];

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ level, onSelectUpgrade }) => {
  const [rerollsLeft, setRerollsLeft] = useState<number>(2);
  const [choices, setChoices] = useState<SpellChoice[]>(() => {
    return [...LEVEL_CHOICE_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
  });

  const handleReroll = () => {
    if (rerollsLeft <= 0) return;
    sound.playItemUse();
    setRerollsLeft((prev) => prev - 1);
    setChoices([...LEVEL_CHOICE_POOL].sort(() => 0.5 - Math.random()).slice(0, 3));
  };

  const renderChalkGlyph = (iconName: string) => {
    switch (iconName) {
      case 'missiles':
        return (
          <svg viewBox="0 0 48 48" className="w-10 h-10 stroke-white fill-none stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
            <path d="M12 36L34 14M28 10L38 10L38 20M8 28L18 38M20 18L30 28" />
            <circle cx="36" cy="12" r="2" fill="white" />
          </svg>
        );
      case 'frost':
        return (
          <svg viewBox="0 0 48 48" className="w-10 h-10 stroke-white fill-none stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
            <line x1="24" y1="6" x2="24" y2="42" />
            <line x1="6" y1="24" x2="42" y2="24" />
            <line x1="11" y1="11" x2="37" y2="37" />
            <line x1="11" y1="37" x2="37" y2="11" />
            <circle cx="24" cy="24" r="3" fill="white" />
          </svg>
        );
      case 'meteor':
        return (
          <svg viewBox="0 0 48 48" className="w-10 h-10 stroke-white fill-none stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
            <circle cx="32" cy="16" r="8" fill="white" />
            <path d="M26 22L10 38M20 20L8 32M30 30L16 44M38 10L42 6" />
          </svg>
        );
      case 'lightning':
        return (
          <svg viewBox="0 0 48 48" className="w-10 h-10 stroke-white fill-none stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
            <path d="M26 4L12 24H24L20 44L36 20H24L26 4Z" fill="white" />
          </svg>
        );
      case 'cyclone':
        return (
          <svg viewBox="0 0 48 48" className="w-10 h-10 stroke-white fill-none stroke-[2.5] stroke-linecap-round">
            <path d="M24 24C24 20 20 16 16 16C10 16 8 22 10 28C14 36 24 38 32 34C40 30 42 18 34 10C26 2 14 6 6 16" />
          </svg>
        );
      case 'satellite':
        return (
          <svg viewBox="0 0 48 48" className="w-10 h-10 stroke-white fill-none stroke-[2]">
            <circle cx="24" cy="24" r="16" strokeDasharray="4 4" />
            <circle cx="24" cy="24" r="5" fill="white" />
            <circle cx="24" cy="8" r="3.5" fill="white" />
            <circle cx="38" cy="30" r="3.5" fill="white" />
            <circle cx="10" cy="30" r="3.5" fill="white" />
          </svg>
        );
      default:
        return <Sparkles className="w-10 h-10 text-white" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 select-none font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl flex flex-col items-center">
        
        {/* Header matching Magic Survival style */}
        <div className="text-center mb-5 sm:mb-7">
          <div className="text-[11px] uppercase tracking-[0.35em] font-cinzel font-bold text-amber-400">
            Experiment Resonance
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-cinzel tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.4)] mt-1">
            Level Up (Rank {level})
          </h2>
          <p className="text-xs text-stone-400 mt-1 font-sans">
            Select a magic manifestation to assimilate into your active grimoire
          </p>
        </div>

        {/* 3 High-Efficiency, Tactile Dark Fantasy Slate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full">
          {choices.map((choice) => {
            return (
              <div
                key={choice.id}
                onClick={() => {
                  sound.playLevelUp();
                  onSelectUpgrade(choice.id);
                }}
                className="relative flex flex-col justify-between p-5 rounded-2xl bg-[#0f141f] border-2 border-stone-700/80 hover:border-amber-400/90 shadow-[0_8px_30px_rgba(0,0,0,0.85)] hover:shadow-[0_0_30px_rgba(251,191,36,0.25)] hover:-translate-y-1.5 active:translate-y-0 transition-all duration-200 cursor-pointer group"
              >
                {/* Top Bar: Element Badge & Level Matrix */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-300">
                      {choice.element} • {choice.category}
                    </span>

                    {/* Level Matrix Dots (Matching Magic Survival screenshot) */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: choice.maxLevel }).map((_, i) => (
                        <span
                          key={i}
                          className={`inline-block rounded-full ${
                            i < choice.currentLevel
                              ? 'w-1.5 h-1.5 bg-emerald-400 shadow-[0_0_4px_#34d399]'
                              : i === choice.currentLevel
                              ? 'w-1.5 h-1.5 bg-amber-400 animate-ping'
                              : 'w-1.5 h-1.5 border border-stone-600 bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Icon & Title Row */}
                  <div className="flex items-center gap-3.5 mb-3">
                    {/* Linocut Chalk Graphic Card */}
                    <div className="w-14 h-14 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center p-2 shadow-inner group-hover:border-amber-400/70 transition-colors">
                      {renderChalkGlyph(choice.iconName)}
                    </div>

                    <div>
                      <h3 className="font-cinzel font-bold text-lg text-white group-hover:text-amber-300 transition-colors">
                        {choice.name}
                      </h3>
                      <div className="text-xs font-mono font-bold text-amber-400">
                        Lv. {choice.currentLevel} → <span className="text-emerald-400">Lv. {choice.currentLevel + 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-stone-300 font-sans leading-relaxed mb-4">
                    {choice.description}
                  </p>

                  {/* Precise Stat Comparison Grid (Efficiency!) */}
                  <div className="space-y-1.5 bg-stone-950/80 p-3 rounded-xl border border-stone-800/80 text-[11px] font-mono">
                    {choice.statDeltas.map((stat, idx) => (
                      <div key={idx} className="flex items-center justify-between text-stone-300">
                        <span className="text-stone-400">{stat.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400">{stat.current}</span>
                          <span className="text-stone-600">→</span>
                          <span className="text-white font-bold">{stat.next}</span>
                          <span className="text-emerald-400 font-bold ml-1">({stat.delta})</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fusion Material Tag if available */}
                  {choice.fusionPartner && (
                    <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[10px] font-cinzel text-purple-300 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-400" />
                        <span>Fusion Recipe:</span>
                      </span>
                      <strong className="text-purple-200">
                        + {choice.fusionPartner} = {choice.fusionResult}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Bottom Select Prompt */}
                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs font-cinzel font-bold text-amber-400 group-hover:text-amber-300">
                  <span>Assimilate Power</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Reroll & Skip Actions */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handleReroll}
            disabled={rerollsLeft <= 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-cinzel font-bold transition-all shadow-md ${
              rerollsLeft > 0
                ? 'bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:border-amber-400 cursor-pointer active:scale-95'
                : 'bg-stone-950 border-stone-800 text-stone-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reroll Magics ({rerollsLeft} Left)</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              onSelectUpgrade('skip_gold_reward');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white text-xs font-cinzel font-bold transition-colors cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5 text-stone-400" />
            <span>Take Mana Gold (+300)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
