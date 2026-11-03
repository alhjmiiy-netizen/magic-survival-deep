import { CharacterHero } from '../types/game';
import React, { useRef, useState, useEffect } from 'react';
import {
  Pause,
  Backpack,
  BookOpen,
  ArrowUpCircle,
  Settings,
  Skull,
  Crosshair,
  Gem,
  Circle,
  Wind,
} from 'lucide-react';
import { PlayerStats, Spell, QuickBeltItem, GameQuest } from '../types/game';
import { RadarData } from '../game/GameEngine';

interface HUDProps {
  stats: PlayerStats;
  spells: Spell[];
  beltItems: QuickBeltItem[];
  quests: GameQuest[];
  wave: number;
  enemiesRemaining: number;
  timeStr: string;
  radarData: RadarData | null;
  onPause: () => void;
  onOpenHome?: () => void;
  onOpenInventory: () => void;
  onOpenSkills: () => void;
  onOpenUpgrades: () => void;
  onOpenSettings: () => void;
  onUseBeltItem: (id: string) => void;
  onTriggerSpell: (spellId: string) => void;
  onTriggerDash: () => void;
  onJoystickMove: (x: number, y: number) => void;
  hero: CharacterHero;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  spells,
  beltItems,
  quests,
  wave,
  enemiesRemaining,
  timeStr,
  radarData,
  hero,
  onPause,
  onOpenHome,
  onOpenInventory,
  onOpenSkills,
  onOpenUpgrades,
  onOpenSettings,
  onUseBeltItem,
  onTriggerSpell,
  onTriggerDash,
  onJoystickMove,
}) => {
  const [isObjectivesCollapsed, setIsObjectivesCollapsed] = useState(false);
  // Joystick handling
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    setJoystickActive(true);
    handleJoystickDrag(e);
  };

  const handleJoystickDrag = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 40;

    let nx = dx;
    let ny = dy;
    if (dist > maxRadius) {
      nx = (dx / dist) * maxRadius;
      ny = (dy / dist) * maxRadius;
    }

    setStickPos({ x: nx, y: ny });
    onJoystickMove(nx / maxRadius, ny / maxRadius);
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setStickPos({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (joystickActive) {
        handleJoystickEnd();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [joystickActive]);

  // Minimap canvas
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas || !radarData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const mapScale = (size * 0.42) / radarData.arenaRadius;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#080c14';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center, center, radarData.arenaRadius * mapScale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center, 4);
    ctx.lineTo(center, size - 4);
    ctx.moveTo(4, center);
    ctx.lineTo(size - 4, center);
    ctx.stroke();

    for (const e of radarData.enemies) {
      const rx = center + (e.x - radarData.playerX) * mapScale;
      const ry = center + (e.y - radarData.playerY) * mapScale;
      if (Math.hypot(rx - center, ry - center) < center - 4) {
        if (e.isBoss) {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(rx, ry, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.fillStyle = '#38bdf8';
    for (const c of radarData.crystals) {
      const rx = center + (c.x - radarData.playerX) * mapScale;
      const ry = center + (c.y - radarData.playerY) * mapScale;
      if (Math.hypot(rx - center, ry - center) < center - 4) {
        ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(center, center - 6);
    ctx.lineTo(center - 5, center + 5);
    ctx.lineTo(center, center + 2);
    ctx.lineTo(center + 5, center + 5);
    ctx.closePath();
    ctx.fill();
  }, [radarData]);

  const arcaneSpell = spells.find((s) => s.id === 'arcane_missiles');
  const frostSpell = spells.find((s) => s.id === 'frost_nova');
  const thunderSpell = spells.find((s) => s.id === 'thunderstorm');
  const cataclysmSpell = spells.find((s) => s.id === 'cataclysm');

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* 1. TOP-LEFT: Silver Archmage Portrait & Gauges */}
      <div className="absolute top-4 left-4 flex items-start gap-3 pointer-events-auto z-10">
        <div className="relative w-20 h-20 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/80 bg-gradient-to-b from-amber-600 via-amber-900 to-slate-950 p-1 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            <div className="w-full h-full rounded-full overflow-hidden relative border border-amber-300/60 bg-black">
              <img
                src={hero.portrait}
                alt={hero.name}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
          <div className="absolute -top-1 right-0 bg-slate-950 px-2 py-0.5 rounded border border-amber-400 text-xs font-bold text-amber-300 font-cinzel shadow-lg">
            Lv. {stats.level}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-56 pt-1">
          {/* HP Bar */}
          <div className="relative h-6 bg-slate-950/90 rounded border-2 border-amber-600/70 p-0.5 shadow-2xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-900 via-red-600 to-rose-500 rounded-sm transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100))}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-cinzel text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-wider">
              {Math.round(stats.hp)} / {stats.maxHp}
            </div>
          </div>

          {/* Mana Bar */}
          <div className="relative h-5 bg-slate-950/90 rounded border-2 border-sky-600/70 p-0.5 shadow-2xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-900 via-sky-600 to-cyan-400 rounded-sm transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (stats.mana / stats.maxMana) * 100))}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-cinzel text-sky-100 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-wider">
              {Math.round(stats.mana)} / {stats.maxMana}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOP-LEFT: Objectives Card ("Survive the Night") */}
      <div className="absolute top-28 left-4 w-68 bg-slate-950/85 backdrop-blur-md rounded-xl gold-border p-3 pointer-events-auto shadow-2xl z-10 hidden sm:block">
        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-1.5 mb-1.5">
          <div className="w-3.5 h-3.5 rotate-45 border-2 border-amber-400 bg-amber-500/30 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-amber-300" />
          </div>
          <span className="font-cinzel font-bold text-xs text-slate-100 tracking-wider">
            Survive the Night
          </span>
        </div>

        <div className="space-y-1 mb-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>Current Wave: {wave} / 20</span>
          </div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>Enemies Remaining: {enemiesRemaining}</span>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-1.5 space-y-1 text-[11px]">
          {quests.map((q) => (
            <div key={q.id} className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-amber-400">✦</span> {q.title}
              </span>
              <span className="font-mono text-slate-400 font-bold tabular-nums ml-2 shrink-0">
                {q.iconType === 'survive' ? timeStr : `${q.current} / ${q.target}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. TOP-CENTER: Wave & Time Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-10">
        <div className="relative px-8 py-2 bg-slate-950/95 rounded-lg gold-border shadow-[0_0_25px_rgba(0,0,0,0.9)] flex flex-col items-center">
          <div className="text-2xl font-black font-cinzel tracking-widest text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {timeStr}
          </div>
          <div className="text-[11px] font-bold font-cinzel text-amber-400 tracking-widest uppercase">
            Wave {wave} / 20
          </div>
        </div>
      </div>

      {/* 4. TOP-RIGHT: Currencies, Pause & Radar */}
      <div className="absolute top-4 right-4 flex items-start gap-3 pointer-events-auto z-10">
        <div className="flex items-center gap-2 pt-1">
          {/* Crystals */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-sky-500/50 text-sky-300 font-bold font-cinzel text-xs shadow-xl">
            <Gem className="w-3.5 h-3.5 text-sky-400 fill-sky-400/30" />
            <span>{stats.crystals.toLocaleString()}</span>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-amber-500/50 text-amber-300 font-bold font-cinzel text-xs shadow-xl">
            <Circle className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
            <span>{stats.gold.toLocaleString()}</span>
          </div>

          {/* Pause */}
          <button
            onClick={onPause}
            className="w-9 h-9 rounded-lg bg-slate-950/95 gold-border flex items-center justify-center text-amber-400 hover:text-white hover:bg-slate-900 transition-colors shadow-xl cursor-pointer"
            title="Pause (P)"
          >
            <Pause className="w-3.5 h-3.5 fill-amber-400" />
          </button>
        </div>

        {/* Radar */}
        <div className="relative w-24 h-24 rounded-full border-2 border-amber-400/80 bg-gradient-to-b from-amber-600 via-amber-950 to-slate-950 p-1 shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center">
          <canvas ref={radarCanvasRef} width={88} height={88} className="rounded-full" />
          <span className="absolute top-0.5 text-[9px] font-black text-amber-300 font-cinzel">N</span>
          <span className="absolute bottom-0.5 text-[9px] font-black text-slate-500 font-cinzel">S</span>
          <span className="absolute left-1 text-[9px] font-black text-slate-500 font-cinzel">W</span>
          <span className="absolute right-1 text-[9px] font-black text-slate-500 font-cinzel">E</span>
        </div>
      </div>

      {/* 5. RIGHT MENU: Action Icons */}
      <div className="absolute right-4 top-36 flex flex-col gap-3 pointer-events-auto z-10">
        <button
          onClick={onOpenInventory}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-950/90 gold-border text-amber-200 hover:text-white hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all shadow-xl group cursor-pointer"
          title="Inventory"
        >
          <Backpack className="w-4 h-4 text-amber-400 group-hover:drop-shadow-[0_0_8px_#fbbf24]" />
          <span className="text-[9px] font-cinzel font-bold mt-0.5">Items</span>
        </button>

        <button
          onClick={onOpenSkills}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-950/90 gold-border text-amber-200 hover:text-white hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all shadow-xl group cursor-pointer"
          title="Skills"
        >
          <BookOpen className="w-4 h-4 text-sky-400 group-hover:drop-shadow-[0_0_8px_#38bdf8]" />
          <span className="text-[9px] font-cinzel font-bold mt-0.5">Skills</span>
        </button>

        <button
          onClick={onOpenUpgrades}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-950/90 gold-border text-amber-200 hover:text-white hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all shadow-xl group cursor-pointer"
          title="Upgrade"
        >
          <ArrowUpCircle className="w-4 h-4 text-emerald-400 group-hover:drop-shadow-[0_0_8px_#34d399]" />
          <span className="text-[9px] font-cinzel font-bold mt-0.5">Altar</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-950/90 gold-border text-amber-200 hover:text-white hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all shadow-xl group cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:drop-shadow-[0_0_8px_#fbbf24]" />
          <span className="text-[9px] font-cinzel font-bold mt-0.5">Config</span>
        </button>
      </div>

      {/* 6. BOTTOM-LEFT: Virtual Runic Joystick & Branding */}
      <div className="absolute bottom-6 left-6 pointer-events-auto z-10 flex flex-col items-start gap-3">
        {/* Magic Survival Title Above Joystick */}
        <div className="hidden lg:block pointer-events-none mb-1">
          <h1 className="text-xl font-black font-cinzel tracking-widest arcane-gradient-text drop-shadow-[0_2px_8px_rgba(56,189,248,0.7)]">
            MAGIC SURVIVAL
          </h1>
          <p className="text-[9px] font-bold tracking-[0.25em] text-sky-200 uppercase font-cinzel">
            SURVIVE • EVOLVE • BECOME LEGENDARY
          </p>
        </div>

        <div
          ref={joystickRef}
          onMouseDown={handleJoystickStart}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickDrag}
          onTouchEnd={handleJoystickEnd}
          className="relative w-28 h-28 rounded-full border-2 border-sky-400/40 bg-slate-950/70 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.2)] cursor-grab active:cursor-grabbing"
        >
          <div className="absolute inset-3 rounded-full border border-sky-400/30" />
          <div className="absolute inset-6 rounded-full border border-sky-400/20" />

          {/* Stick */}
          <div
            className="w-13 h-13 rounded-full bg-gradient-to-br from-sky-400 to-blue-800 arcane-border shadow-[0_0_15px_#38bdf8] flex items-center justify-center transition-transform duration-75"
            style={{ transform: `translate(${stickPos.x}px, ${stickPos.y}px)` }}
          >
            <div className="w-4 h-4 rotate-45 border-2 border-white bg-sky-300/60 shadow-md" />
          </div>
        </div>
      </div>

      {/* 7. BOTTOM-CENTER: Ornate 5-Slot Item Belt (No Overlaps) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center pointer-events-auto z-10">
        <div className="flex items-center gap-2 bg-slate-950/95 px-3 py-2 rounded-2xl gold-border shadow-[0_0_25px_rgba(0,0,0,0.9)] backdrop-blur-md">
          {beltItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => onUseBeltItem(item.id)}
              disabled={item.count <= 0}
              className={`relative w-11 h-14 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-between p-1 transition-all ${
                item.count > 0
                  ? 'hover:border-amber-400 hover:scale-105 active:scale-95 cursor-pointer shadow-lg'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              title={`${item.name} (${item.count}): ${item.description}`}
            >
              <div className="w-7 h-7 rounded flex items-center justify-center">
                {item.id === 'soul_shard' && (
                  <div className="w-5 h-5 rotate-45 bg-purple-500 border border-purple-200 shadow-[0_0_8px_#a855f7]" />
                )}
                {item.id === 'mana_elixir' && (
                  <div className="w-4 h-6 rounded-sm bg-gradient-to-b from-sky-300 to-blue-600 border border-sky-100 shadow-[0_0_8px_#38bdf8]" />
                )}
                {item.id === 'vitality_emerald' && (
                  <div className="w-5 h-5 rotate-45 bg-emerald-500 border border-emerald-200 shadow-[0_0_8px_#22c55e]" />
                )}
                {item.id === 'fire_rune' && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-red-600 border border-amber-200 shadow-[0_0_8px_#f97316]" />
                )}
                {item.id === 'ancient_grimoire' && (
                  <div className="w-5 h-6 rounded-sm bg-amber-700 border-2 border-amber-300 shadow-[0_0_8px_#eab308]" />
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-100 font-mono">{item.count}</span>
              <span className="absolute -top-1.5 -right-1 bg-slate-900 text-[8px] font-bold font-mono px-1 rounded border border-slate-600 text-amber-400">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 8. BOTTOM-RIGHT: Ornate Ability Matrix (Spacious Curved Layout, ZERO Overlap) */}
      <div className="absolute bottom-5 right-5 pointer-events-auto z-10 w-72 h-64">
        {/* Spell 1: Thunderstorm (Top-Right of cluster) */}
        <button
          onClick={() => onTriggerSpell('thunderstorm')}
          className="absolute top-2 right-16 w-14 h-14 rounded-full border-2 border-amber-400/90 bg-gradient-to-br from-sky-400 via-blue-700 to-indigo-950 shadow-[0_0_18px_#38bdf8] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group z-10"
          title="Thunderstorm (Chain Lightning) [Key 3]"
        >
          <div className="w-7 h-7 rounded-full border border-sky-200/80 flex items-center justify-center text-white font-black text-base drop-shadow-[0_0_8px_#ffffff]">
            ⚡
          </div>
          {thunderSpell && thunderSpell.currentCooldown > 0 && (
            <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center text-xs font-mono font-bold text-sky-300">
              {thunderSpell.currentCooldown.toFixed(1)}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-slate-900 text-[9px] font-mono font-bold px-1 rounded border border-sky-400 text-amber-300">
            3
          </span>
        </button>

        {/* Spell 2: Frost Nova (Top-Left of cluster) */}
        <button
          onClick={() => onTriggerSpell('frost_nova')}
          className="absolute top-16 left-2 w-14 h-14 rounded-full border-2 border-amber-400/90 bg-gradient-to-br from-cyan-300 via-sky-600 to-slate-950 shadow-[0_0_18px_#38bdf8] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group z-10"
          title="Frost Nova (Ice Shards) [Key 2]"
        >
          <div className="w-7 h-7 rounded-full border border-cyan-100 flex items-center justify-center text-white text-sm drop-shadow-[0_0_8px_#ffffff]">
            ❄️
          </div>
          {frostSpell && frostSpell.currentCooldown > 0 && (
            <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center text-xs font-mono font-bold text-cyan-200">
              {frostSpell.currentCooldown.toFixed(1)}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-slate-900 text-[9px] font-mono font-bold px-1 rounded border border-cyan-400 text-amber-300">
            2
          </span>
        </button>

        {/* Spell 3: Cataclysm (Lower-Left of cluster) */}
        <button
          onClick={() => onTriggerSpell('cataclysm')}
          className="absolute bottom-4 left-6 w-14 h-14 rounded-full border-2 border-amber-400/90 bg-gradient-to-br from-amber-400 via-blue-800 to-slate-950 shadow-[0_0_18px_#f97316] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group z-10"
          title="Cataclysm (Meteoric Inferno) [Key 4]"
        >
          <div className="w-7 h-7 rounded-full border border-amber-200 flex items-center justify-center text-amber-200 text-sm drop-shadow-[0_0_8px_#f97316]">
            🔥
          </div>
          {cataclysmSpell && cataclysmSpell.currentCooldown > 0 && (
            <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center text-xs font-mono font-bold text-amber-300">
              {cataclysmSpell.currentCooldown.toFixed(1)}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-slate-900 text-[9px] font-mono font-bold px-1 rounded border border-amber-400 text-amber-300">
            4
          </span>
        </button>

        {/* Central Primary: The Grand Arcane Rune (Center-Right) */}
        <button
          onClick={() => onTriggerSpell('arcane_missiles')}
          className="absolute bottom-6 right-14 w-18 h-18 rounded-full border-3 border-amber-400 bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-950 shadow-[0_0_25px_#38bdf8] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group z-20"
          title="Primary Arcane Barrage [Auto / Key 1]"
        >
          <div className="w-12 h-12 rounded-full border-2 border-amber-300/90 flex items-center justify-center shadow-inner">
            <div className="w-6 h-6 rotate-45 border-2 border-white bg-sky-200/80 shadow-[0_0_12px_#ffffff] flex items-center justify-center">
              <div className="w-2 h-2 bg-white" />
            </div>
          </div>
          {arcaneSpell && arcaneSpell.currentCooldown > 0 && (
            <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center text-xs font-mono font-bold text-cyan-200">
              {arcaneSpell.currentCooldown.toFixed(1)}
            </div>
          )}
          <span className="absolute -bottom-1 bg-slate-950 text-[8px] font-mono font-bold px-1 rounded border border-amber-400 text-amber-300">
            1
          </span>
        </button>

        {/* Dash Button (Bottom-Right corner) */}
        <button
          onClick={onTriggerDash}
          disabled={stats.dashCurrentCooldown > 0}
          className={`absolute bottom-0 right-0 w-13 h-13 rounded-full border-2 ${
            stats.dashCurrentCooldown <= 0
              ? 'border-amber-400 bg-gradient-to-b from-blue-900 to-slate-950 text-sky-200 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_15px_#38bdf8]'
              : 'border-slate-700 bg-slate-950 text-slate-600 cursor-not-allowed'
          } flex flex-col items-center justify-center transition-all z-20`}
          title="Dash / Teleport (Spacebar)"
        >
          <Wind className="w-4 h-4 text-sky-300" />
          <span className="text-[8px] font-cinzel font-bold mt-0.5">Dash</span>
          {stats.dashCurrentCooldown > 0 && (
            <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center text-[10px] font-mono font-bold text-sky-400">
              {stats.dashCurrentCooldown.toFixed(1)}
            </div>
          )}
          <span className="absolute -bottom-1 bg-slate-950 text-[7px] font-mono font-bold px-1 rounded border border-slate-700 text-slate-300">
            SPACE
          </span>
        </button>
      </div>
    </div>
  );
};
