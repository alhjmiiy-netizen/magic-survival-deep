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
  FlaskConical,
  Eye, Hourglass, Magnet, Heart, Feather, Triangle, Hexagon, Sword, Crown, Link2,
} from 'lucide-react';

export interface DeepHUD {
  mode: 'regions' | 'endless'; endless: boolean; regionIdx: number; regionTotal: number; regionName: string; regionColor: string;
  timeLeft: string; phase: string; endlessTime: string;
  synergies: { id: string; name: string; color: string; desc: string }[];
  artifacts: { id: string; name: string; icon: string; color: string; level: number; desc: string }[];
}
const ART_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = { Eye, Hourglass, Magnet, Heart, Feather, Triangle, Hexagon, Sword, Crown };
import { PlayerStats, Spell, QuickBeltItem, GameQuest } from '../types/game';
import { RadarData, GameEngine } from '../game/GameEngine';
import { MagicGlyph, spellGlyphKey, glyphKeyFor } from './MagicIcons';

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
  fastCasting?: number;
  onTriggerDash: () => void;
  onJoystickMove: (x: number, y: number) => void;
  /** live cooldown fraction 0..1 (1 = just cast) per spell id, polled each frame for the cast ring */
  getCooldowns?: () => Record<string, number>;
  hero: CharacterHero;
  deep?: DeepHUD | null;
  notice?: { text: string; color: string; k: number; kind: string } | null;
  getEngine?: () => GameEngine | null;
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
  fastCasting = 0,
  onTriggerDash,
  onJoystickMove,
  getCooldowns,
  deep,
  notice,
  getEngine,
}) => {
  const [artTip, setArtTip] = useState<string | null>(null);
  const [isObjectivesCollapsed, setIsObjectivesCollapsed] = useState(true);
  // Floating joystick: any touch/press on the play area (not HUD buttons) spawns it there.
  const JOY_R = 52;
  const DEAD = 0.14;
  const joyPointer = useRef<number | null>(null);
  const [joy, setJoy] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const joyStart = useRef({ x: 0, y: 0 });
  const onPadDown = (e: React.PointerEvent) => {
    if (joyPointer.current !== null) return;
    joyPointer.current = e.pointerId;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    joyStart.current = { x: e.clientX, y: e.clientY };
    setJoy({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    onJoystickMove(0, 0);
  };
  const onPadMove = (e: React.PointerEvent) => {
    if (joyPointer.current !== e.pointerId) return;
    let dx = e.clientX - joyStart.current.x;
    let dy = e.clientY - joyStart.current.y;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx = (dx / d) * JOY_R; dy = (dy / d) * JOY_R; }
    setJoy({ x: joyStart.current.x, y: joyStart.current.y, dx, dy });
    const vx = dx / JOY_R, vy = dy / JOY_R;
    const m = Math.hypot(vx, vy);
    if (m < DEAD) onJoystickMove(0, 0);
    else { const k = (m - DEAD) / (1 - DEAD) / m; onJoystickMove(vx * k, vy * k); }
  };
  const onPadUp = (e: React.PointerEvent) => {
    if (joyPointer.current !== e.pointerId) return;
    joyPointer.current = null;
    setJoy(null);
    onJoystickMove(0, 0);
  };
  useEffect(() => () => onJoystickMove(0, 0), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Magic bar: cast rings polled per frame; flash + toast when a magic is acquired/levelled.
  const ringRefs = useRef<Record<string, SVGCircleElement | null>>({});
  useEffect(() => {
    if (!getCooldowns) return;
    let raf = 0;
    const tick = () => {
      const cds = getCooldowns();
      for (const [id, el] of Object.entries(ringRefs.current)) {
        if (!el) continue;
        const f = cds[id] ?? 0; // 1 just cast -> 0 ready
        el.style.strokeDashoffset = String(151 * f);
        el.style.opacity = f > 0.85 ? '1' : '0.75';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getCooldowns]);
  const prevLevels = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ text: string; color: string; k: number } | null>(null);
  useEffect(() => {
    const changed: Spell[] = [];
    for (const s of spells) {
      if ((prevLevels.current[s.id] ?? 0) !== s.level) changed.push(s);
      prevLevels.current[s.id] = s.level;
    }
    if (!changed.length) return;
    const now = Date.now();
    setFlash((f) => { const n = { ...f }; changed.forEach((s) => (n[s.id] = now)); return n; });
    const s = changed[changed.length - 1];
    setToast({ text: s.isCombo ? `COMBO UNLOCKED: ${s.name}` : s.level === 1 ? `New magic: ${s.name}` : `${s.name} → Lv ${s.level}`, color: s.color, k: now });
  }, [spells]);
  const [tip, setTip] = useState<string | null>(null);

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
  // v4 flight + charge state, polled at ~15Hz
  const [fl8, setFl8] = useState({ flying: false, meter: 6, max: 6, lock: 0, h: 0 });
  const [charge, setCharge] = useState<{ id: string; k: number } | null>(null);
  const [spiritN, setSpiritN] = useState(0);
  const [hint, setHint] = useState(true);
  useEffect(() => { const t = setTimeout(() => setHint(false), 7000); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!getEngine) return;
    const id = setInterval(() => { const e = getEngine(); if (!e) return; const f = e.flightState(); setFl8({ flying: f.flying, meter: f.meter, max: f.max, lock: f.lock, h: f.h }); setCharge(e.chargeProgress()); setSpiritN(e.spirits.length); }, 66);
    return () => clearInterval(id);
  }, [getEngine]);
  const chargeDown = useRef<{ id: string; t: number } | null>(null);

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
      <div data-hud="hero-ring" className="relative w-11 h-11 flex-shrink-0 rounded-full border-2 overflow-hidden bg-black" style={{ borderColor: hero.color, boxShadow: `0 0 10px ${hero.color}aa` }} title={hero.name}>
        <img src={hero.portrait} alt={hero.name} className="w-full h-full object-cover object-top" />
      </div>
      <div className="flex flex-col gap-[3px] flex-1 min-w-0">
        <div className="flex items-center justify-between text-[9px] font-cinzel font-bold text-amber-300 leading-none">
          <span><span style={{ color: hero.color }}>{hero.name.split(' ')[0]}</span> Lv. {stats.level}</span>
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
        {deep ? (deep.endless ? <>ENDLESS · {deep.endlessTime}</> : <>R{deep.regionIdx + 1}/{deep.regionTotal} · {deep.phase === 'fight' ? deep.timeLeft : deep.phase === 'boss' ? 'BOSS!' : 'CLEARED'}</>) : <>WAVE {wave}</>} · <Skull className="inline w-2.5 h-2.5 -mt-0.5" /> {enemiesRemaining}
      </span>
      {deep && <span data-hud="region-name" className="text-[8px] leading-none font-bold tracking-widest pb-0.5 uppercase" style={{ color: deep.endless ? '#f43f5e' : deep.regionColor }}>{deep.endless ? 'Endless Survival' : deep.regionName}</span>}
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
  const BIG_ICON: Record<string, React.ReactNode> = {
    arcane_missiles: <Sparkles className="w-6 h-6" />,
    frost_nova: <Snowflake className="w-6 h-6" />,
    thunderstorm: <Zap className="w-6 h-6" />,
    cataclysm: <Flame className="w-6 h-6" />,
  };
  const tile = 52;
  const powersBlock = (
    <div
      data-hud="powers"
      className="absolute flex items-end gap-1.5 px-2 pt-3 pb-1 rounded-xl glass-panel pointer-events-auto"
      style={{ bottom: portrait ? 190 : 6, left: '50%', transform: 'translateX(-50%)', minWidth: 120, justifyContent: 'center' }}
    >
      <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 rounded bg-slate-950 border border-sky-500/50 text-[8px] font-bold tracking-widest text-sky-300">MAGIC · AUTO-CAST</span>
      {ownedSpells.length === 0 && <span className="text-[10px] text-slate-400 px-2 py-3">No magic yet</span>}
      {ownedSpells.map((s) => {
        const fl = flash[s.id];
        const tier = s.tier ?? 0;
        return (
          <div key={s.id} data-power={s.id} className="relative flex flex-col items-center pointer-events-auto" style={{ touchAction: 'none' }}
            onPointerDown={(ev) => { ev.stopPropagation(); if (s.isCombo) return; chargeDown.current = { id: s.id, t: performance.now() }; getEngine?.()?.chargeStart(s.id); }}
            onPointerUp={(ev) => { ev.stopPropagation(); const c = chargeDown.current; chargeDown.current = null; const e = getEngine?.(); if (!c || !e) { setTip(tip === s.id ? null : s.id); return; } if (performance.now() - c.t < 220) { e.chargeCancel(); setTip(tip === s.id ? null : s.id); } else e.chargeRelease(); }}
            onPointerCancel={() => { chargeDown.current = null; getEngine?.()?.chargeCancel(); }}>
            {charge && charge.id === s.id && (
              <svg data-charge={s.id} className="absolute -rotate-90 pointer-events-none" style={{ top: -6, left: '50%', marginLeft: -(tile + 12) / 2 }} width={tile + 12} height={tile + 12} viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="30" fill="none" stroke={charge.k >= 1 ? '#fde68a' : '#fff7d6'} strokeWidth="4" strokeDasharray="188.5" strokeDashoffset={188.5 * (1 - charge.k)} style={{ filter: 'drop-shadow(0 0 6px #fde68a)' }} />
              </svg>
            )}
            <div
              key={fl}
              data-tier={tier}
              className={`relative rounded-xl flex items-center justify-center text-white ${fl ? 'magic-flash' : ''} ${tier ? 'evo-tile' : ''}`}
              style={{ width: tile, height: tile, ['--c' as string]: s.color, border: tier ? `2px solid ${tier >= 2 ? '#fde047' : '#fbbf24'}` : `2px solid ${s.color}`, outline: tier >= 2 ? `1px solid ${s.color}` : undefined, outlineOffset: 1, background: `radial-gradient(circle at 50% 40%, ${s.color}aa, ${s.color}33 45%, #020617 80%)`, color: '#fff', boxShadow: `0 0 10px ${s.color}66` } as React.CSSProperties}
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 52 52" width={tile} height={tile}>
                <circle cx="26" cy="26" r="24" fill="none" stroke="#0b1220" strokeWidth="3" opacity="0.6" />
                <circle ref={(el) => { ringRefs.current[s.id] = el; }} data-ring={s.id} cx="26" cy="26" r="24" fill="none" stroke={s.color} strokeWidth="3" strokeDasharray="151" strokeDashoffset="0" strokeLinecap="round" />
              </svg>
              <span style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}><MagicGlyph k={s.isCombo ? glyphKeyFor(s.id, 1, 'combo') : spellGlyphKey(s)} size={30} color={s.color} /></span>
              {tier > 0 && <span data-star className="absolute -top-2 -right-1.5 text-[11px] leading-none font-black text-amber-300 drop-shadow-[0_0_4px_#fde047]">{'★'.repeat(tier)}</span>}
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded bg-black border border-amber-400 text-[10px] leading-[13px] font-black text-amber-300 whitespace-nowrap">
                {s.isCombo ? 'COMBO' : s.id === 'spirit' ? `×${spiritN || s.count}` : `Lv ${s.level}`}
              </span>
            </div>
            <div className="flex gap-[2px] mt-[5px] h-[4px]">
              {!s.isCombo && Array.from({ length: Math.min(8, s.maxLevel) }).map((_, k) => (
                <span key={k} className={`w-[4px] h-[4px] rounded-full ${k < s.level ? 'bg-amber-300' : 'bg-slate-700'}`} />
              ))}
            </div>
            {tip === s.id && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md glass-panel text-[10px] text-white whitespace-nowrap z-10">
                {s.name} {s.isCombo ? '(combo)' : `Lv ${s.level}/${s.maxLevel}`}{tier ? ` · ${s.evolutionDesc}` : ' · casts automatically'}
              </div>
            )}
          </div>
        );
      })}
      {fastCasting > 0 && (
        <div data-power="fast_cast" className="flex flex-col items-center" title={`Fast Casting x${fastCasting}`}>
          <div className="relative rounded-xl flex items-center justify-center border-2 border-yellow-400 text-yellow-300 bg-slate-950 text-base font-black" style={{ width: 40, height: 40 }}>
            ≫<span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded bg-black border border-amber-400 text-[9px] leading-[12px] font-bold text-amber-300">x{fastCasting}</span>
          </div>
          <span className="text-[7px] text-yellow-300 mt-[5px] leading-[4px]">FAST</span>
        </div>
      )}
      {toast && (
        <div key={toast.k} className="magic-toast absolute left-1/2 bottom-full mb-3 px-3 py-1 rounded-lg glass-panel text-[12px] font-black whitespace-nowrap" style={{ color: toast.color, borderColor: toast.color }}>
          ✦ {toast.text}
        </div>
      )}
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

  const artifactBlock = deep && deep.artifacts.length > 0 && (
    <div data-hud="artifacts" className="absolute flex items-center gap-1 px-1 py-0.5 rounded-lg bg-slate-950/75 border border-amber-500/40 pointer-events-auto"
      style={portrait ? { top: 100, left: 6, maxWidth: 230, flexWrap: 'wrap' } : { top: 58, left: 104, maxWidth: 230, flexWrap: 'wrap' }}>
      <span className="text-[7px] font-bold tracking-widest text-amber-300/90 pr-0.5">RELICS</span>
      {deep.artifacts.map((a) => { const I = ART_ICON[a.icon] ?? Sparkles; return (
        <div key={a.id} data-artifact={a.id} className="relative w-6 h-6 rounded-md flex items-center justify-center bg-slate-900" style={{ border: `1px solid ${a.color}`, boxShadow: `0 0 6px ${a.color}88` }} onClick={() => setArtTip(artTip === a.id ? null : a.id)}>
          <I className="w-3.5 h-3.5" style={{ color: a.color }} />
          <span className="absolute -bottom-1 -right-1 min-w-[11px] h-[11px] rounded-full bg-black border border-amber-400 text-[7px] leading-[9px] font-black text-amber-300 text-center">{a.level}</span>
          {artTip === a.id && <div className="absolute top-full mt-1 left-0 px-2 py-1 rounded-md glass-panel text-[10px] text-white whitespace-nowrap z-20"><b style={{ color: a.color }}>{a.name}</b> Lv{a.level}: {a.desc}</div>}
        </div>); })}
    </div>
  );
  const synergyBlock = deep && deep.synergies.length > 0 && (
    <div data-hud="synergies" className="absolute flex flex-col gap-[2px] px-1.5 py-1 rounded-lg bg-slate-950/75 border border-fuchsia-500/40"
      style={portrait ? { top: 178, left: 6, maxWidth: 150 } : { top: 86, left: 6, maxWidth: 150 }}>
      <span className="text-[7px] font-bold tracking-widest text-fuchsia-300/90 flex items-center gap-1"><Link2 className="w-2.5 h-2.5" />SYNERGIES</span>
      {deep.synergies.map((y) => <span key={y.id} data-synergy={y.id} className="text-[9px] font-bold leading-tight truncate" style={{ color: y.color }}>◆ {y.name}</span>)}
    </div>
  );
  const noticeBlock = notice && (
    <div key={notice.k} data-hud="notice" data-kind={notice.kind} className="magic-toast absolute left-1/2 px-3 py-1.5 rounded-lg glass-panel text-[11px] font-black text-center"
      style={{ top: portrait ? '30%' : '22%', color: notice.color, borderColor: notice.color, maxWidth: portrait ? 340 : 520, boxShadow: `0 0 18px ${notice.color}66` }}>
      {notice.text}
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
      className="absolute flex flex-col items-end pointer-events-auto"
      style={portrait ? { bottom: 122, right: 6 } : { bottom: 86, right: 6 }}
    >
      <span className="text-[8px] font-bold tracking-widest text-emerald-300/90 mb-0.5 pr-0.5">ITEMS</span>
      <div className="flex gap-1 p-1 rounded-lg bg-slate-950/70 border border-emerald-600/40">
        {beltItems.map((b) => (
          <button
            key={b.id}
            data-item={b.id}
            onClick={() => onUseBeltItem(b.id)}
            disabled={b.count <= 0}
            className="relative w-7 h-7 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-35"
            title={`${b.name} (item)`}
          >
            <FlaskConical className="w-4 h-4" style={{ color: b.color }} />
            <span className="absolute -bottom-1 -right-1 min-w-[13px] h-[13px] px-[2px] rounded-full bg-black border border-slate-500 text-[8px] leading-[11px] font-bold text-white text-center">{b.count}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const joystickBlock = joy && (
    <div className="absolute pointer-events-none" data-joystick style={{ left: joy.x - JOY_R, top: joy.y - JOY_R, width: JOY_R * 2, height: JOY_R * 2 }}>
      <div className="absolute inset-0 rounded-full border-2 border-sky-400/50 bg-slate-950/30" style={{ boxShadow: '0 0 18px rgba(56,189,248,0.25)' }} />
      <div
        className="absolute left-1/2 top-1/2 w-11 h-11 -ml-[22px] -mt-[22px] rounded-full bg-gradient-to-b from-sky-300 to-blue-700 border-2 border-sky-100/80"
        style={{ transform: `translate(${joy.dx}px, ${joy.dy}px)` }}
      />
    </div>
  );

  const dashBlock = (
    <button
      data-hud="dash"
      onPointerDown={(e) => { e.stopPropagation(); onTriggerDash(); }}
      className={`absolute rounded-full flex flex-col items-center justify-center border-2 pointer-events-auto cursor-pointer ${
        dashReady ? 'border-sky-300 bg-sky-900/80 text-sky-100' : 'border-slate-600 bg-slate-900/80 text-slate-500'
      }`}
      style={portrait ? { bottom: 40, right: 20, width: 72, height: 72 } : { bottom: 14, right: 12, width: 64, height: 64 }}
    >
      <Wind className="w-5 h-5" />
      <span className="text-[9px] font-bold">{dashReady ? 'DASH' : stats.dashCurrentCooldown.toFixed(1)}</span>
    </button>
  );

  const fk = fl8.meter / fl8.max;
  const wingsReady = fl8.lock <= 0 && (fl8.flying || fl8.meter >= 1);
  const flightBlock = (
    <>
      <button
        data-hud="flight" data-flying={fl8.flying ? '1' : '0'}
        onPointerDown={(e) => { e.stopPropagation(); getEngine?.()?.toggleFlight(); setHint(false); }}
        className={`absolute rounded-full flex flex-col items-center justify-center border-2 pointer-events-auto cursor-pointer ${fl8.flying ? 'border-cyan-200 bg-cyan-700/85 text-white' : wingsReady ? 'border-cyan-300 bg-slate-900/85 text-cyan-100' : 'border-slate-600 bg-slate-900/80 text-slate-500'}`}
        style={{ ...(portrait ? { bottom: 124, right: 18, width: 84, height: 84 } : { bottom: 86, right: 10, width: 74, height: 74 }), boxShadow: fl8.flying ? '0 0 22px rgba(103,232,249,0.8)' : undefined }}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" width="100%" height="100%">
          <circle cx="40" cy="40" r="37" fill="none" stroke="#0b1220" strokeWidth="4" opacity="0.7" />
          <circle data-flight-ring cx="40" cy="40" r="37" fill="none" stroke={fl8.lock > 0 ? '#f87171' : fk < 0.3 ? '#fbbf24' : '#67e8f9'} strokeWidth="4" strokeDasharray="232.5" strokeDashoffset={232.5 * (1 - fk)} strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 48 28" width="40" height="24" style={{ filter: 'drop-shadow(0 0 4px #67e8f9)' }}>
          <path d="M24 20 C18 6 8 2 1 4 C6 8 6 12 3 14 C8 14 10 17 8 20 C13 19 17 21 24 22 Z M24 20 C30 6 40 2 47 4 C42 8 42 12 45 14 C40 14 38 17 40 20 C35 19 31 21 24 22 Z" fill="currentColor" />
        </svg>
        <span className="text-[9px] font-black tracking-wider">{fl8.lock > 0 ? fl8.lock.toFixed(1) : fl8.flying ? 'LAND' : 'FLY'}</span>
      </button>
      <div data-hud="flight-meter" className="absolute pointer-events-none flex items-center gap-1" style={portrait ? { bottom: 214, right: 14 } : { bottom: 166, right: 8 }}>
        <span className="text-[8px] font-black text-cyan-200">WINGS</span>
        <div className="w-[64px] h-[6px] rounded-full bg-slate-900/90 border border-cyan-900 overflow-hidden">
          <div className="h-full" style={{ width: `${fk * 100}%`, background: fl8.lock > 0 ? '#f87171' : 'linear-gradient(90deg,#22d3ee,#a5f3fc)' }} />
        </div>
        <span className="text-[8px] font-bold text-cyan-100 w-6">{fl8.meter.toFixed(1)}s</span>
      </div>
      {hint && (
        <div data-hud="flight-hint" className="magic-toast absolute px-3 py-1.5 rounded-lg glass-panel text-[11px] font-black text-cyan-100 pointer-events-none" style={portrait ? { bottom: 236, right: 12 } : { bottom: 186, right: 8 }}>
          🪽 Tap the wings to fly and rain magic from above
        </div>
      )}
    </>
  );

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      <div
        data-touchpad
        className="absolute inset-0 pointer-events-auto"
        style={{ touchAction: 'none' }}
        onPointerDown={onPadDown}
        onPointerMove={onPadMove}
        onPointerUp={onPadUp}
        onPointerCancel={onPadUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      {statsBlock}
      {timerBlock}
      {currencyBlock}
      {radarBlock}
      {powersBlock}
      {questBlock}
      {artifactBlock}
      {synergyBlock}
      {noticeBlock}
      {utilBlock}
      {beltBlock}
      {joystickBlock}
      {dashBlock}
      {flightBlock}
    </div>
  );
};
