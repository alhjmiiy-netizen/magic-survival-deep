import React from 'react';
import {
  Play,
  User,
  MapPin,
  Sparkles,
  ArrowUpCircle,
  BookMarked,
  Settings,
  Gem,
  Circle,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { CharacterHero, ArenaRealm, PlayerStats } from '../types/game';
import { sound } from '../audio/soundEngine';
import { PWAInstallButton } from './PWAInstallButton';
import { HEROES_LIST } from '../game/characters';

interface MainMenuProps {
  currentHero: CharacterHero;
  currentArena: ArenaRealm;
  stats: PlayerStats;
  onStartGame: (startAtWave8: boolean) => void;
  onOpenCharacters: () => void;
  onOpenArenas: () => void;
  onOpenCombos: () => void;
  onOpenUpgrades: () => void;
  onOpenStory: () => void;
  onOpenSettings: () => void;
  onOpenEncyclopedia?: () => void;
  onQuickSwitchHero?: (hero: CharacterHero) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  currentHero,
  currentArena,
  stats,
  onStartGame,
  onOpenCharacters,
  onOpenArenas,
  onOpenCombos,
  onOpenUpgrades,
  onOpenStory,
  onOpenSettings,
  onOpenEncyclopedia,
  onQuickSwitchHero,
}) => {
  const currentHeroIndex = HEROES_LIST.findIndex((h) => h.id === currentHero.id);

  const handlePrevHero = () => {
    sound.playItemUse();
    const prevIdx = currentHeroIndex > 0 ? currentHeroIndex - 1 : HEROES_LIST.length - 1;
    onQuickSwitchHero?.(HEROES_LIST[prevIdx]);
  };

  const handleNextHero = () => {
    sound.playItemUse();
    const nextIdx = currentHeroIndex < HEROES_LIST.length - 1 ? currentHeroIndex + 1 : 0;
    onQuickSwitchHero?.(HEROES_LIST[nextIdx]);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between overflow-hidden bg-black select-none font-sans">
      {/* 1. High-Res Cosmic Void Background with Animated Fog & Dark Vignette */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,#1e3a8a_0%,#1e1b4b_30%,#05060f_70%)]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_50%_60%,rgba(56,189,248,0.35)_0%,transparent_35%),radial-gradient(circle_at_80%_20%,rgba(239,68,68,0.18)_0%,transparent_30%),radial-gradient(circle_at_15%_25%,rgba(147,51,234,0.25)_0%,transparent_35%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_85%)]" />
      </div>

      {/* 2. Top Header Bar: Currencies, PWA Install & Settings */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-amber-500/20 bg-slate-950/75 backdrop-blur-md">
        {/* Archmage Profile badge */}
        <div
          onClick={() => {
            sound.playItemUse();
            onOpenCharacters();
          }}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group"
          title="Click to open Archmage Roster"
        >
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-slate-950 overflow-hidden shadow-[0_0_12px_rgba(212,175,55,0.4)] group-hover:scale-105 transition-transform flex-shrink-0">
            <img
              src={currentHero.standImage || currentHero.portrait}
              alt={currentHero.name}
              className="w-full h-full object-cover object-top brightness-110"
            />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold font-cinzel text-white flex items-center gap-1.5 sm:gap-2">
              <span>{currentHero.name}</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                Lv. {stats.level}
              </span>
            </div>
            <div className="text-[10px] font-cinzel text-slate-400 group-hover:text-amber-300 transition-colors">
              {currentHero.title}
            </div>
          </div>
        </div>

        {/* Resources & PWA Mobile Download */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton variant="header" />

          <div className="hidden md:flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-sky-500/40 text-sky-300 font-bold font-cinzel text-xs shadow-md">
            <Gem className="w-3.5 h-3.5 text-sky-400 fill-sky-400/30" />
            <span>{stats.crystals.toLocaleString()}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 font-bold font-cinzel text-xs shadow-md">
            <Circle className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
            <span>{stats.gold.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              sound.playItemUse();
              onOpenSettings();
            }}
            className="w-9 h-9 rounded-lg bg-slate-900/80 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
            title="Settings & Audio"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Center Freestanding Character Hero Stage & Action Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 my-auto max-w-4xl mx-auto w-full">
        {/* Game Title Header */}
        <div className="text-center mb-1 sm:mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-cinzel font-bold tracking-[0.4em] text-sky-300 drop-shadow-[0_0_12px_#38bdf8]">
            Dark Fantasy Action Roguelike
          </span>
          <h1 className="text-4xl sm:text-6xl font-black font-cinzel tracking-wider arcane-gradient-text drop-shadow-[0_4px_25px_rgba(56,189,248,0.7)] mt-1">
            MAGIC SURVIVAL
          </h1>
          <p className="text-[10px] sm:text-xs font-semibold tracking-[0.35em] text-amber-300/90 uppercase font-cinzel drop-shadow-md">
            SURVIVE • EVOLVE • BECOME LEGENDARY
          </p>
        </div>

        {/* Freestanding Character Showcase Pedestal */}
        <div className="relative flex items-center justify-center w-full max-w-md h-56 sm:h-72 my-1">
          {/* Quick Hero Switch Buttons */}
          <button
            onClick={handlePrevHero}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-white flex items-center justify-center shadow-lg cursor-pointer transition-all hover:scale-110 active:scale-95"
            title="Switch to Previous Archmage"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={handleNextHero}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-white flex items-center justify-center shadow-lg cursor-pointer transition-all hover:scale-110 active:scale-95"
            title="Switch to Next Archmage"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Pedestal Runic Glow */}
          <div
            className="absolute bottom-2 w-48 sm:w-64 h-12 rounded-full blur-xl pointer-events-none transition-all duration-500 opacity-60"
            style={{ backgroundColor: currentHero.color }}
          />

          {/* Freestanding Hero Full-Body Display - object-contain object-center with padding ensures head is 100% visible! */}
          <div
            onClick={() => {
              sound.playItemUse();
              onOpenCharacters();
            }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center cursor-pointer group p-2"
            title="Click to view full Archmage details and traits"
          >
            <img
              key={currentHero.id}
              src={currentHero.standImage || currentHero.portrait}
              alt={currentHero.name}
              className="max-h-full max-w-full h-full w-auto object-contain object-center filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300 animate-in fade-in"
            />
            <div className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-slate-950/90 border border-amber-500/50 text-[10px] font-cinzel text-amber-300 shadow-md flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentHero.color }} />
              <span>{currentHero.name} — {currentHero.title}</span>
            </div>
          </div>
        </div>

        {/* Selected Hero & Realm Summary Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 my-3 px-4 py-2 rounded-xl glass-panel">
          <button
            onClick={() => {
              sound.playItemUse();
              onOpenCharacters();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-sky-400 text-xs font-cinzel text-slate-200 transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>Archmage: <strong className="text-sky-300">{currentHero.name}</strong></span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              onOpenArenas();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-emerald-400 text-xs font-cinzel text-slate-200 transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Realm: <strong className="text-emerald-300">{currentArena.name}</strong></span>
          </button>
        </div>

        {/* Two Play Options: Fresh Run (Wave 1) or Boss test mode (Wave 8, Lv. 8, 08:00) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg mt-1">
          <button
            onClick={() => {
              sound.playLevelUp();
              onStartGame(false); // Start Fresh at Wave 1
            }}
            className="w-full py-3 sm:py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black font-cinzel text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.4)] cursor-pointer transition-all"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
            <span>START SURVIVAL (WAVE 1)</span>
          </button>

          <button
            onClick={() => {
              sound.playLevelUp();
              onStartGame(true); // Wave 8 boss encounter battle
            }}
            className="w-full py-3 sm:py-3.5 px-5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-95 text-white font-black font-cinzel text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.4)] cursor-pointer transition-all"
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            <span>COLOSSUS BATTLE · BOSS TEST (WAVE 8)</span>
          </button>
        </div>

        {/* Mobile PWA Download Button */}
        <div className="mt-3">
          <PWAInstallButton variant="hero" />
        </div>
      </div>

      {/* 4. Bottom Menu Navigation Tabs (6 Categories including Encyclopedia) */}
      <div className="relative z-20 px-3 sm:px-6 py-2.5 border-t border-amber-500/20 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto grid grid-cols-6 gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              sound.playItemUse();
              onOpenCharacters();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl glass-panel hover:border-amber-300 hover:brightness-125 transition-all cursor-pointer group"
          >
            <User className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform mb-0.5" />
            <span className="text-[9px] sm:text-[11px] font-cinzel font-bold text-slate-200">Subjects</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              onOpenArenas();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl glass-panel hover:border-amber-300 hover:brightness-125 transition-all cursor-pointer group"
          >
            <MapPin className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform mb-0.5" />
            <span className="text-[9px] sm:text-[11px] font-cinzel font-bold text-slate-200">Realms</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              onOpenCombos();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl glass-panel hover:border-amber-300 hover:brightness-125 transition-all cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform mb-0.5" />
            <span className="text-[9px] sm:text-[11px] font-cinzel font-bold text-slate-200">Combos</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              onOpenEncyclopedia ? onOpenEncyclopedia() : onOpenCombos();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl glass-panel hover:border-amber-300 hover:brightness-125 transition-all cursor-pointer group"
          >
            <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform mb-0.5" />
            <span className="text-[9px] sm:text-[11px] font-cinzel font-bold text-slate-200">Grimoire</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              onOpenUpgrades();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl glass-panel hover:border-amber-300 hover:brightness-125 transition-all cursor-pointer group"
          >
            <ArrowUpCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform mb-0.5" />
            <span className="text-[9px] sm:text-[11px] font-cinzel font-bold text-slate-200">Altar</span>
          </button>

          <button
            onClick={() => {
              sound.playItemUse();
              onOpenStory();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl glass-panel hover:border-amber-300 hover:brightness-125 transition-all cursor-pointer group"
          >
            <BookMarked className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform mb-0.5" />
            <span className="text-[9px] sm:text-[11px] font-cinzel font-bold text-slate-200">Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
};

