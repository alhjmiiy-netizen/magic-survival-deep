import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Snowflake,
  Flame,
  Zap,
  Check,
  Circle,
  Gem,
  Eye,
  Crown,
} from 'lucide-react';
import { HEROES_LIST } from '../game/characters';
import { CharacterHero } from '../types/game';
import { sound } from '../audio/soundEngine';

interface CharacterSelectModalProps {
  currentHero: CharacterHero;
  onSelectHero: (hero: CharacterHero) => void;
  onClose: () => void;
  gold?: number;
  crystals?: number;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  currentHero,
  onSelectHero,
  onClose,
  gold = 307881,
  crystals = 89,
}) => {
  const initialIndex = HEROES_LIST.findIndex((h) => h.id === currentHero.id);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [showFullInspection, setShowFullInspection] = useState(false);

  const selectedHero = HEROES_LIST[selectedIndex];
  const isCurrentlyEquipped = selectedHero.id === currentHero.id;

  const handleApply = () => {
    sound.playLevelUp();
    onSelectHero(selectedHero);
  };

  const getSpellIcon = (spellId: string) => {
    switch (spellId) {
      case 'frost_nova':
        return <Snowflake className="w-4 h-4 text-cyan-300" />;
      case 'cataclysm':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'thunderstorm':
        return <Zap className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 select-none font-sans animate-in fade-in duration-200">
      {/* Modal Canvas: Styled with the authentic Magic Survival parchment/stone tone from screenshot */}
      <div className="relative w-full max-w-lg md:max-w-xl h-[94vh] max-h-[850px] bg-[#9ca9ad] border-4 border-stone-900 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col text-stone-900">
        
        {/* 1. Top Header Bar matching Magic Survival Test Subject screenshot */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b-2 border-stone-800/40 bg-[#8b999e]/80 z-20">
          {/* Currencies (Gold & Crystals in dark rounded pills) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 bg-stone-950 px-3 py-0.5 rounded-md border border-stone-800 text-[#f59e0b] font-bold font-mono text-xs shadow-md">
              <Circle className="w-3.5 h-3.5 fill-[#f59e0b]" />
              <span className="tracking-wider">{gold.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-950 px-3 py-0.5 rounded-md border border-stone-800 text-[#06b6d4] font-bold font-mono text-xs shadow-md">
              <Gem className="w-3.5 h-3.5 fill-[#06b6d4]" />
              <span className="tracking-wider">{crystals.toLocaleString()}</span>
            </div>
          </div>

          {/* Title in iconic brush style */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black font-cinzel text-stone-950 tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]">
              Test Subject
            </h2>
          </div>

          {/* Close Button X in square with rounded corners */}
          <button
            onClick={() => {
              sound.playItemUse();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-white hover:text-amber-400 transition-colors cursor-pointer shadow-md"
            title="Close"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        {/* Inspection Mode Toggle */}
        <div className="flex items-center justify-between px-6 py-1.5 bg-stone-900/10 border-b border-stone-700/20 text-xs font-cinzel">
          <span className="text-stone-700 font-bold">
            Archmage Roster ({HEROES_LIST.length} Subjects)
          </span>
          <button
            onClick={() => {
              sound.playItemUse();
              setShowFullInspection(!showFullInspection);
            }}
            className="flex items-center gap-1.5 text-stone-900 font-bold hover:text-black underline cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showFullInspection ? 'Show Grid View' : 'Inspect Full Body CGI'}</span>
          </button>
        </div>

        {/* 2. Center Freestanding Subject Area */}
        {showFullInspection ? (
          /* High-Res Freestanding 3D/CGI Dais Inspection Mode (Head 100% visible, ample vertical space) */
          <div className="flex-1 relative flex flex-col items-center justify-center p-4 bg-stone-950 text-white overflow-hidden">
            {/* Full Body Freestanding Image - object-contain object-center with padding ensures head is NEVER cut off */}
            <div className="relative z-10 w-full h-[360px] sm:h-[420px] flex items-center justify-center p-2">
              <img
                key={selectedHero.id}
                src={selectedHero.standImage || selectedHero.portrait}
                alt={selectedHero.name}
                className="max-h-full max-w-full h-full w-auto object-contain object-center filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] animate-in fade-in duration-300"
              />
            </div>
            <div className="text-center mt-2 z-20">
              <h3 className="text-xl font-bold font-cinzel text-amber-300">{selectedHero.name}</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">{selectedHero.bio}</p>
            </div>
          </div>
        ) : (
          /* Grid of Freestanding Test Subjects (Matching Magic Survival screenshot) */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-[#9ca9ad] via-[#94a2a6] to-[#88979b]">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-y-6 gap-x-2 items-end justify-items-center max-w-md mx-auto my-auto">
              {HEROES_LIST.map((hero, index) => {
                const isSelected = index === selectedIndex;
                const isEquipped = hero.id === currentHero.id;

                return (
                  <div
                    key={hero.id}
                    data-hero={hero.id}
                    onClick={() => {
                      sound.playItemUse();
                      setSelectedIndex(index);
                    }}
                    className="relative flex flex-col items-center cursor-pointer group"
                    title={`${hero.name} — ${hero.classType || hero.title}`}
                  >
                    {/* Glowing White/Cyan Circle Pedestal for Selected Subject (Exact Magic Survival mechanic) */}
                    {isSelected && (
                      <div className="absolute -bottom-2 w-12 h-5 rounded-full bg-white shadow-[0_0_20px_#ffffff,0_0_10px_#38bdf8] animate-pulse z-0" />
                    )}

                    {/* Subtle Drop Shadow for unselected subjects */}
                    {!isSelected && (
                      <div className="absolute -bottom-1 w-9 h-3 rounded-full bg-stone-900/30 z-0" />
                    )}

                    {/* Freestanding Character Silhouette / Mini Avatar (Head, hat, body fully framed!) */}
                    <div className="relative z-10 w-14 h-24 sm:w-16 sm:h-28 flex items-center justify-center p-1 transition-transform group-hover:scale-110">
                      <img
                        src={hero.standImage || hero.portrait}
                        alt={hero.name}
                        className={`max-h-full max-w-full h-full w-auto object-contain object-center filter transition-all ${
                          isSelected
                            ? 'brightness-125 contrast-125 drop-shadow-[0_4px_12px_rgba(255,255,255,0.8)]'
                            : 'brightness-90 contrast-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
                        }`}
                      />
                    </div>

                    {/* Active badge pip */}
                    {isEquipped && (
                      <span className="absolute -top-1 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-sm z-20" />
                    )}

                    {/* Name Label */}
                    <div className={`text-[10px] font-cinzel font-bold text-center mt-1 z-10 leading-tight ${
                      isSelected ? 'text-black font-extrabold' : 'text-stone-800'
                    }`}>
                      {hero.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Bottom Black Slab (Exact Magic Survival match from user screenshot) */}
        <div className="bg-stone-950 text-white p-5 sm:p-6 border-t-4 border-stone-900 shadow-2xl z-20">
          <div className="max-w-md mx-auto text-center flex flex-col items-center">
            {/* Class Name in gothic brush font */}
            <h3 className="text-2xl sm:text-3xl font-black font-cinzel text-white tracking-wider mb-2">
              {selectedHero.classType || selectedHero.title}
            </h3>

            {/* Subtle Divider Line */}
            <div className="w-3/4 h-[1px] bg-stone-800 my-2" />

            {/* Starting Magic (in pale gold font) */}
            <div className="text-xs sm:text-sm font-cinzel font-bold text-[#fef08a] mb-1">
              {selectedHero.starterMagicText || `${selectedHero.primarySpellId.replace('_', ' ')} +1`}
            </div>

            {/* Passive Trait in bright magenta/pink font */}
            <div className="text-xs sm:text-sm font-sans font-semibold text-[#f472b6] leading-relaxed mb-4 max-w-sm">
              {selectedHero.passiveTraitText || selectedHero.specialTrait}
            </div>

            {/* Action Button: Applying / Apply */}
            <button
              onClick={handleApply}
              className={`w-full max-w-xs py-3 rounded-lg font-cinzel font-bold text-sm tracking-widest transition-all shadow-xl cursor-pointer ${
                isCurrentlyEquipped
                  ? 'bg-[#451a1a] text-[#fca5a5] border border-rose-900 cursor-default'
                  : 'bg-[#5c1d1d] hover:bg-[#7f1d1d] text-white border border-rose-800 hover:scale-[1.02] active:scale-98'
              }`}
            >
              {isCurrentlyEquipped ? 'Applying' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
