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
  Sparkles,
  Snowflake,
  Zap,
  Flame,
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
  const [isObjectivesCollapsed, setIsObjectivesCollapsed] = useState(true);
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
    ctx.beginPath();
    ctx.moveTo(center, center - 6);
    ctx.lineTo(center - 5, center + 5);
    ctx.lineTo(center, center + 2);
    ctx.lineTo(center + 5, center + 5);
    ctx.closePath();
    ctx.fill();
  }, [radarData]);

  // Orientation-aware layout (portrait phones vs landscape phones)
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const f = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (stats.mana / stats.maxMana) * 100));
  const xpPct = Math.max(0, Math.min(100, (stats.xp / stats.maxXp) * 100));
  const questsDone = quests.filter((q) => q.completed || q.current >= q.target).length;
  const dashReady = stats.dashCurrentCooldown <= 0;

  const SPELL_ICON: Record<string, React.ReactNode> = {
    arcane_missiles: <Sparkles className="w-4 h-4" />,
    frost_nova: <Snowflake className="w-4 h-4" />,
    thunderstorm: <Zap className="w-4 h-4" />,
    cataclysm: <Flame className="w-4 h-4" />,
  };

  const bar = (pct: number, cls: string, label: string, h = 'h-3.5') => (
    <div className={`relative ${h} w-full rounded-sm bg-slate-950/90 border border-amber-700/60 overflow-hidden`}>
      <div className={`absolute inset-y-0 left-0 ${cls}`} style={{ width: `${pct}%` }} />
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] leading-none font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
          {label}
        </span>
      )}
    </div>
  );

  // ---- blocks ----
  const statsBlock = (
    <div data-hud="stats" className="absolute flex items-center gap-2 pointer-events-auto" style={{ top: 6, left: 6, width: portrait ? 200 : 214 }}>
      <div className="relative w-11 h-11 flex-shrink-0 rounded-full border-2 border-amber-400/80 overflow-hidden bg-black">
        <img src={hero.portrait} alt={hero.name} className="w-full h-full object-cover object-top" />
      </div>
      <div className="flex flex-col gap-[3px] flex-1 min-w-0">
        <div className="flex items-center justify-between text-[9px] font-cinzel font-bold text-amber-300 leading-none">
          <span>Lv. {stats.level}</span>
          <span className="text-slate-400">XP {Math.floor(xpPct)}%</span>
        </div>
        {bar(hpPct, 'bg-gradient-to-r from-red-800 to-red-500', `${Math.ceil(stats.hp)} / ${stats.maxHp}`)}
        {bar(mpPct, 'bg-gradient-to-r from-blue-800 to-sky-500', `${Math.ceil(stats.mana)} / ${stats.maxMana}`, 'h-2.5')}
        {bar(xpPct, 'bg-gradient-to-r from-amber-600 to-yellow-300', '', 'h-1.5')}
      </div>
    </div>
  );

  const timerBlock = (
    <div
      data-hud="timer"
      className="absolute flex flex-col items-center px-3 py-0.5 rounded-lg bg-slate-950/85 border border-amber-500/50"
      style={portrait ? { top: 60, left: 6 } : { top: 6, left: '50%', transform: 'translateX(-50%)' }}
    >
      <span className="text-lg leading-tight font-cinzel font-bold text-white tabular-nums">{timeStr}</span>
      <span className="text-[9px] leading-none text-amber-300 font-bold tracking-wider pb-0.5">
        WAVE {wave} · <Skull className="inline w-2.5 h-2.5 -mt-0.5" /> {enemiesRemaining}
      </span>
    </div>
  );

  const currencyBlock = (
    <div
      data-hud="currency"
      className="absolute flex items-center gap-1.5 pointer-events-auto"
      style={portrait ? { top: 60, right: 6 } : { top: 6, right: 6 }}
    >
      <div className="flex items-center gap-1 px-2 h-7 rounded-md bg-slate-950/85 border border-sky-500/50 text-[11px] font-bold text-sky-200">
        <Gem className="w-3 h-3 text-sky-400" />{stats.crystals}
      </div>
      <div className="flex items-center gap-1 px-2 h-7 rounded-md bg-slate-950/85 border border-amber-500/50 text-[11px] font-bold text-amber-200">
        <Circle className="w-3 h-3 text-amber-400 fill-amber-500" />{stats.gold}
      </div>
      <button
        data-hud="pause"
        onClick={onPause}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-950/85 border border-amber-500/60 text-amber-300 cursor-pointer"
        aria-label="Pause"
      >
        <Pause className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const radarBlock = (
    <div
      data-hud="radar"
      className="absolute rounded-full border-2 border-amber-500/70 overflow-hidden bg-slate-950"
      style={portrait ? { top: 6, right: 6, width: 50, height: 50 } : { top: 40, right: 6, width: 58, height: 58 }}
    >
      <canvas ref={radarCanvasRef} width={116} height={116} className="w-full h-full" />
    </div>
  );

  const ownedSpells = spells.filter((s) => s.level > 0);
  const powersBlock = (
    <div
      data-hud="powers"
      className="absolute flex items-center gap-1 px-1 py-1 rounded-lg bg-slate-950/70 border border-slate-700/60"
      style={portrait ? { top: 104, left: 6 } : { top: 52, left: '50%', transform: 'translateX(-50%)' }}
    >
      {ownedSpells.length === 0 && <span className="text-[9px] text-slate-400 px-1">No magic yet</span>}
      {ownedSpells.map((s) => (
        <div key={s.id} data-power={s.id} className="flex flex-col items-center w-9">
          <div
            className="relative w-7 h-7 rounded-md flex items-center justify-center border text-white"
            style={{ borderColor: s.color, background: `radial-gradient(circle, ${s.color}55, #020617 75%)` }}
            title={`${s.name} Lv ${s.level}`}
          >
            {s.isCombo ? <Sparkles className="w-4 h-4 text-fuchsia-300" /> : SPELL_ICON[s.id] ?? <Sparkles className="w-4 h-4" />}
            <span className="absolute -bottom-1 -right-1.5 px-[3px] rounded bg-black border border-amber-400 text-[7px] leading-[10px] font-bold text-amber-300">
              Lv{s.level}
            </span>
          </div>
          <div className="flex gap-[1px] mt-[3px]">
            {Array.from({ length: Math.min(8, s.maxLevel) }).map((_, k) => (
              <span key={k} className={`w-[3px] h-[3px] rounded-full ${k < s.level ? 'bg-amber-300' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const questBlock = (
    <div
      data-hud="quests"
      className="absolute pointer-events-auto"
      style={portrait ? { top: 150, left: 6, width: isObjectivesCollapsed ? undefined : 170 } : { top: 58, left: 6, width: isObjectivesCollapsed ? undefined : 170 }}
    >
      <button
        onClick={() => setIsObjectivesCollapsed((v) => !v)}
        className="flex items-center gap-1 px-2 h-6 rounded-md bg-slate-950/80 border border-amber-500/40 text-[10px] font-cinzel font-bold text-amber-300 cursor-pointer"
      >
        <Crosshair className="w-3 h-3" /> Quests {questsDone}/{quests.length} {isObjectivesCollapsed ? '▸' : '▾'}
      </button>
      {!isObjectivesCollapsed && (
        <div className="mt-1 p-1.5 rounded-md bg-slate-950/75 border border-slate-700/60 flex flex-col gap-0.5">
          {quests.map((q) => (
            <div key={q.id} className="flex justify-between text-[9px] text-slate-300 leading-tight">
              <span className="truncate pr-1">{q.title}</span>
              <span className="text-amber-200 tabular-nums">{q.iconType === 'survive' ? timeStr : `${Math.min(q.current, q.target)}/${q.target}`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const utilBtn = (key: string, icon: React.ReactNode, label: string, onClick: () => void) => (
    <button
      data-hud={key}
      onClick={onClick}
      className="w-11 h-11 flex flex-col items-center justify-center rounded-lg bg-slate-950/85 border border-amber-500/50 text-amber-300 cursor-pointer pointer-events-auto"
    >
      {icon}
      <span className="text-[8px] font-bold leading-none mt-0.5">{label}</span>
    </button>
  );

  const utilBlock = (
    <div
      data-hud="utility"
      className="absolute flex flex-col gap-1.5"
      style={portrait ? { top: 104, right: 6 } : { top: 106, right: 6 }}
    >
      {utilBtn('items', <Backpack className="w-4 h-4" />, 'Items', onOpenInventory)}
      {utilBtn('skills', <BookOpen className="w-4 h-4" />, 'Skills', onOpenSkills)}
      {utilBtn('altar', <ArrowUpCircle className="w-4 h-4" />, 'Altar', onOpenUpgrades)}
      {portrait && utilBtn('config', <Settings className="w-4 h-4" />, 'Config', onOpenSettings)}
    </div>
  );

  const beltBlock = (
    <div
      data-hud="belt"
      className="absolute flex gap-1 pointer-events-auto"
      style={portrait ? { bottom: 150, left: '50%', transform: 'translateX(-50%)' } : { bottom: 6, left: '50%', transform: 'translateX(-50%)' }}
    >
      {beltItems.map((b, k) => (
        <button
          key={b.id}
          onClick={() => onUseBeltItem(b.id)}
          disabled={b.count <= 0}
          className="relative w-9 h-9 rounded-md bg-slate-950/85 border border-slate-600 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer disabled:opacity-40"
          title={b.name}
        >
          <span className="w-3.5 h-3.5 rounded-sm" style={{ background: b.color }} />
          <span className="absolute bottom-0 right-0.5 text-[9px]">{b.count}</span>
          <span className="absolute top-0 left-0.5 text-[7px] text-slate-400">{k + 1}</span>
        </button>
      ))}
    </div>
  );

  const joystickBlock = (
    <div
      data-hud="joystick"
      ref={joystickRef}
      onTouchStart={handleJoystickStart}
      onTouchMove={handleJoystickDrag}
      onTouchEnd={handleJoystickEnd}
      onMouseDown={handleJoystickStart}
      onMouseMove={(e) => joystickActive && handleJoystickDrag(e)}
      className="absolute rounded-full border-2 border-sky-500/40 bg-slate-950/40 pointer-events-auto touch-none"
      style={portrait ? { bottom: 24, left: 16, width: 110, height: 110 } : { bottom: 10, left: 14, width: 100, height: 100 }}
    >
      <div
        className="absolute left-1/2 top-1/2 w-11 h-11 -ml-[22px] -mt-[22px] rounded-full bg-gradient-to-b from-sky-400 to-blue-700 border-2 border-sky-200/70"
        style={{ transform: `translate(${stickPos.x}px, ${stickPos.y}px)` }}
      />
    </div>
  );

  const dashBlock = (
    <button
      data-hud="dash"
      onClick={onTriggerDash}
      className={`absolute rounded-full flex flex-col items-center justify-center border-2 pointer-events-auto cursor-pointer ${
        dashReady ? 'border-sky-300 bg-sky-900/80 text-sky-100' : 'border-slate-600 bg-slate-900/80 text-slate-500'
      }`}
      style={portrait ? { bottom: 40, right: 20, width: 72, height: 72 } : { bottom: 14, right: 12, width: 64, height: 64 }}
    >
      <Wind className="w-5 h-5" />
      <span className="text-[9px] font-bold">{dashReady ? 'DASH' : stats.dashCurrentCooldown.toFixed(1)}</span>
    </button>
  );

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {statsBlock}
      {timerBlock}
      {currencyBlock}
      {radarBlock}
      {powersBlock}
      {questBlock}
      {utilBlock}
      {beltBlock}
      {joystickBlock}
      {dashBlock}
    </div>
  );
};
