import React, { useState } from 'react';
import {
  X,
  Flame,
  Sparkles,
  Award,
  Layers,
  CircleDot,
  BookOpen,
  Circle,
  Gem,
  Check,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { ComboArtwork } from './ComboArtwork';
import { Spell } from '../types/game';
import { sound } from '../audio/soundEngine';

interface ComboModalProps {
  spells: Spell[];
  onClose: () => void;
  gold?: number;
  crystals?: number;
  onFuseSpell?: (comboId: string) => void;
}

interface ComboItem {
  id: string;
  name: string;
  artworkId: string;
  component1: { name: string; id: string; minLevel: number };
  component2: { name: string; id: string; minLevel: number };
  damage: string;
  cooldown: string;
  description: string;
  element: string;
}

export const ComboModal: React.FC<ComboModalProps> = ({
  spells,
  onClose,
  gold = 307881,
  crystals = 89,
  onFuseSpell,
}) => {
  const [selectedComboId, setSelectedComboId] = useState<string>('thunderfall');

  const combos: ComboItem[] = [
    {
      id: 'thunderfall',
      name: 'Thunderfall Holocaust',
      artworkId: 'thunderfall',
      component1: { name: 'Thunderstorm', id: 'thunderstorm', minLevel: 6 },
      component2: { name: 'Cataclysm', id: 'cataclysm', minLevel: 6 },
      damage: '2,450 Plasma Dmg',
      cooldown: '3.5s',
      element: 'Plasma Fire',
      description: 'Calls down thunder strikes fused with molten meteors. Every strike erupts in a persistent 340px lava crater.',
    },
    {
      id: 'superconductor',
      name: 'Superconductor Frost',
      artworkId: 'superconductor',
      component1: { name: 'Frost Nova', id: 'frost_nova', minLevel: 6 },
      component2: { name: 'Thunderstorm', id: 'thunderstorm', minLevel: 6 },
      damage: '1,980 Cryo Dmg',
      cooldown: '2.2s',
      element: 'Cryo Lightning',
      description: 'Every frozen demon acts as a super-conductive node that discharges electrical shockwaves to all adjacent demons.',
    },
    {
      id: 'blizzard',
      name: 'Celestial Blizzard',
      artworkId: 'blizzard',
      component1: { name: 'Frost Nova', id: 'frost_nova', minLevel: 6 },
      component2: { name: 'Arcane Missiles', id: 'arcane_missiles', minLevel: 6 },
      damage: '1,650 Frost Dmg',
      cooldown: '2.8s',
      element: 'Astral Frost',
      description: 'Freezes the entire screen in glacial frost while unleashing a constant barrage of tracking celestial ice spears.',
    },
    {
      id: 'laser_ray',
      name: 'Ray of Genesis',
      artworkId: 'laser_ray',
      component1: { name: 'Flash Shock', id: 'arcane_missiles', minLevel: 6 },
      component2: { name: 'Divine Radiance', id: 'frost_nova', minLevel: 6 },
      damage: '2,800 Holy Dmg',
      cooldown: '3.0s',
      element: 'Divine Light',
      description: 'Pierces through all demonic ranks with an apocalyptic emerald beam that disintegrates lesser demons instantly.',
    },
    {
      id: 'crimson_lightning',
      name: 'Crimson Holocaust',
      artworkId: 'crimson_lightning',
      component1: { name: 'Cataclysm', id: 'cataclysm', minLevel: 6 },
      component2: { name: 'Thunderstorm', id: 'thunderstorm', minLevel: 6 },
      damage: '3,100 Dark Dmg',
      cooldown: '4.2s',
      element: 'Blood Lightning',
      description: 'Strikes the ground with blood-red thunderbolts that rip open dimensional fissures draining enemy vitality.',
    },
    {
      id: 'nuclear_sun',
      name: 'Nuclear Star',
      artworkId: 'nuclear_sun',
      component1: { name: 'Fireball', id: 'cataclysm', minLevel: 6 },
      component2: { name: 'Meteor Swarm', id: 'arcane_missiles', minLevel: 6 },
      damage: '3,450 Solar Dmg',
      cooldown: '5.0s',
      element: 'Solar Fusion',
      description: 'Ignites a miniature stellar core that burns in the center of the dais, continuously incinerating approaching waves.',
    },
    {
      id: 'celestial_avatar',
      name: 'Astral Singularity',
      artworkId: 'celestial_avatar',
      component1: { name: 'Arcane Missiles', id: 'arcane_missiles', minLevel: 6 },
      component2: { name: 'Cataclysm', id: 'cataclysm', minLevel: 6 },
      damage: '3,800 Cosmic Dmg',
      cooldown: '4.0s',
      element: 'Dark Matter',
      description: 'The Archmage ascends into a pillar of pure aether, summoning an inescapable black hole that crushes hundreds of demons.',
    },
    {
      id: 'storm_forest',
      name: 'Tempest Maelstrom',
      artworkId: 'storm_forest',
      component1: { name: 'Cyclone', id: 'thunderstorm', minLevel: 6 },
      component2: { name: 'Thunderstorm', id: 'thunderstorm', minLevel: 6 },
      damage: '2,200 Tempest Dmg',
      cooldown: '2.5s',
      element: 'Storm Vortex',
      description: 'Hurls electrical hurricane vortexes across the arena that continuously electrocute and drag trapped enemies.',
    },
    {
      id: 'molten_magma',
      name: 'Hellfire Magma Deluge',
      artworkId: 'molten_magma',
      component1: { name: 'Cataclysm', id: 'cataclysm', minLevel: 6 },
      component2: { name: 'Fireball', id: 'cataclysm', minLevel: 6 },
      damage: '2,900 Magma Dmg',
      cooldown: '4.8s',
      element: 'Volcanic Lava',
      description: 'Submerges the outer battlefield in molten obsidian lava, dealing persistent burning damage to all approaching enemies.',
    },
  ];

  const selectedCombo = combos.find((c) => c.id === selectedComboId) || combos[0];

  const isComponentReady = (componentId: string, minLevel: number) => {
    const s = spells.find((item) => item.id === componentId);
    return s ? s.level >= minLevel : false;
  };

  const c1Ready = isComponentReady(selectedCombo.component1.id, selectedCombo.component1.minLevel);
  const c2Ready = isComponentReady(selectedCombo.component2.id, selectedCombo.component2.minLevel);
  const canFuse = c1Ready && c2Ready;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 select-none font-sans animate-in fade-in duration-200">
      {/* Modal matching exact Encyclopedia screenshot layout */}
      <div className="relative w-full max-w-lg md:max-w-xl h-[95vh] max-h-[880px] bg-[#07090e] border-2 border-stone-800 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col text-white">
        
        {/* 1. Header matching Magic Survival Screenshot */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-800 bg-[#040508] z-20">
          {/* Currencies */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-[#f59e0b] font-bold font-mono text-xs">
              <Circle className="w-3.5 h-3.5 fill-[#f59e0b]" />
              <span className="tracking-wider">{gold.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-[#06b6d4] font-bold font-mono text-xs">
              <Gem className="w-3.5 h-3.5 fill-[#06b6d4]" />
              <span className="tracking-wider">{crystals.toLocaleString()}</span>
            </div>
          </div>

          {/* Title in brush script */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black font-cinzel text-amber-200 tracking-wide drop-shadow-[0_2px_10px_rgba(251,191,36,0.2)]">
              Encyclopedia
            </h2>
            <div className="text-[9px] text-amber-400 font-cinzel uppercase tracking-widest">
              Magic Combinations & Fusions
            </div>
          </div>

          {/* Close X Button */}
          <button
            onClick={() => {
              sound.playItemUse();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center text-stone-300 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 2. Category Icons Strip (Magic Combinations hexagram is highlighted in glowing gold!) */}
        <div className="flex items-center justify-around px-4 py-2 border-b border-stone-800/80 bg-[#090c12]">
          <div className="flex flex-col items-center text-stone-600 opacity-60">
            <Flame className="w-5 h-5" />
          </div>
          {/* Active Fusions Tab (Highlighted glowing star from screenshot!) */}
          <div className="flex flex-col items-center text-amber-400 drop-shadow-[0_0_12px_#f59e0b] scale-125">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-center text-stone-600 opacity-60">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-center text-stone-600 opacity-60">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-center text-stone-600 opacity-60">
            <CircleDot className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-center text-stone-600 opacity-60">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* 3. 3-Column Illustrated Magic Combinations Grid (Exact screenshot match!) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#030407]">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {combos.map((combo) => {
              const isSelected = combo.id === selectedComboId;

              return (
                <div
                  key={combo.id}
                  onClick={() => {
                    sound.playItemUse();
                    setSelectedComboId(combo.id);
                  }}
                  className={`relative flex flex-col items-center rounded-xl p-1.5 transition-all cursor-pointer border-2 group ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.35)] scale-[1.03]'
                      : 'border-stone-800 bg-[#080b11] hover:border-stone-600'
                  }`}
                >
                  {/* Stippled / Chalk-Art Magic Illustration */}
                  <div className="w-full aspect-[4/5] rounded-lg overflow-hidden bg-black relative">
                    <ComboArtwork comboId={combo.artworkId} />
                    {/* Subtle vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Title below artwork */}
                  <div className="mt-1.5 text-center w-full px-1">
                    <div className={`text-[10px] sm:text-[11px] font-cinzel font-bold truncate leading-tight ${
                      isSelected ? 'text-amber-300' : 'text-stone-300 group-hover:text-white'
                    }`}>
                      {combo.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Bottom Fusion Recipe & Binding Slab */}
        <div className="border-t-2 border-stone-800 bg-[#05070c] p-4 sm:p-5 z-20">
          <div className="max-w-md mx-auto flex flex-col items-center text-center">
            {/* Title & Element */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl sm:text-2xl font-black font-cinzel text-white">
                {selectedCombo.name}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold">
                {selectedCombo.element}
              </span>
            </div>

            {/* Component Formula: [ Spell A Lv. 6 ] + [ Spell B Lv. 6 ] */}
            <div className="flex items-center gap-2 my-2 text-xs font-cinzel">
              <span className={`px-2.5 py-1 rounded-md border ${
                c1Ready
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-stone-900 border-stone-800 text-stone-400'
              }`}>
                {selectedCombo.component1.name} (Lv. {selectedCombo.component1.minLevel})
              </span>
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span className={`px-2.5 py-1 rounded-md border ${
                c2Ready
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-stone-900 border-stone-800 text-stone-400'
              }`}>
                {selectedCombo.component2.name} (Lv. {selectedCombo.component2.minLevel})
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-stone-300 font-sans leading-relaxed mb-3">
              {selectedCombo.description}
            </p>

            {/* Damage & Cooldown stats */}
            <div className="flex items-center justify-center gap-4 text-xs font-mono mb-4 text-stone-400">
              <span className="text-rose-400">Output: {selectedCombo.damage}</span>
              <span className="text-sky-400">Rate: {selectedCombo.cooldown}</span>
            </div>

            {/* Fusion Action Button */}
            {onFuseSpell ? (
              <button
                onClick={() => {
                  sound.playLevelUp();
                  onFuseSpell(selectedCombo.id);
                  onClose();
                }}
                disabled={!canFuse}
                className={`w-full py-3 rounded-xl font-cinzel font-bold text-xs tracking-widest transition-all shadow-xl cursor-pointer ${
                  canFuse
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:brightness-110 text-white cursor-pointer hover:scale-[1.02]'
                    : 'bg-stone-900 text-stone-500 border border-stone-800 cursor-not-allowed opacity-75'
                }`}
              >
                {canFuse ? '✦ BIND COMBINATION SPELL' : 'REQUIRES BOTH SPELLS AT LV. 6+'}
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playItemUse();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-cinzel text-xs font-bold cursor-pointer transition-colors"
              >
                Return to Grimoire
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
