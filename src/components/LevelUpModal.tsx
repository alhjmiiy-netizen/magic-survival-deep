import React from 'react';
import { Sparkles, Zap, Snowflake, Flame, Timer, Crosshair, Heart, Magnet, Wind, Eye, Hourglass, Feather, Triangle, Hexagon, Sword, Crown } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import type { UpgradeChoice } from '../game/spells';
import { BASE_SPELLS, BASE_SPELL_IDS, makeSpell, spellEffectText } from '../game/spells';

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Sparkles, Zap, Snowflake, Flame, Timer, Crosshair, Heart, Magnet, Wind, Eye, Hourglass, Feather, Triangle, Hexagon, Sword, Crown,
};

const KIND_LABEL: Record<UpgradeChoice['kind'], string> = {
  new: 'NEW MAGIC', level: 'MAGIC LEVEL UP', fast: 'CASTING', passive: 'PASSIVE', evolve: 'EVOLVE', artifact: 'ARTIFACT',
};

const ELEMENT: Record<string, string> = {
  thunderstorm: 'LIGHTNING', frost_nova: 'FROST', cataclysm: 'FIRE', arcane_missiles: 'ARCANE',
};

function Card({ c, onPick }: { c: UpgradeChoice; onPick: (id: string) => void }) {
  const Icon = ICONS[c.icon] ?? Sparkles;
  const spellId = c.id.replace(/^(new|lvl|evo):/, '');
  const evo = c.kind === 'evolve';
  const el = ELEMENT[spellId];
  const [name, lvl] = c.title.includes(' Lv ') ? c.title.split(' Lv ') : [c.title, ''];
  return (
    <div
      data-choice={c.id}
      role="button"
      onClick={() => { sound.playItemUse(); onPick(c.id); }}
      data-kind={c.kind}
      className={`cursor-pointer relative rounded-2xl p-[2px] hover:scale-[1.03] active:scale-95 transition-transform ${evo ? 'evo-card' : ''}`}
      style={{ background: evo ? `linear-gradient(160deg, #fde047, ${c.color} 40%, #fde047 70%, ${c.color})` : `linear-gradient(160deg, ${c.color}, #d4af37 45%, ${c.color}55)`, boxShadow: evo ? `0 0 30px #fde047aa, 0 0 12px ${c.color}` : `0 0 22px ${c.color}55` }}
    >
      {evo && <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 rounded-full bg-amber-300 text-slate-950 text-[10px] font-black tracking-widest shadow-[0_0_12px_#fde047]">★ EVOLVE{c.level === 2 ? ' · FINAL' : ''}</span>}
      <div className="h-full rounded-[14px] px-3 pt-2.5 pb-3 flex flex-col items-center text-center gap-1"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${c.color}40, transparent 60%), linear-gradient(180deg, #0f172a, #020617)` }}>
        <div className="flex w-full justify-between items-center text-[9px] font-black tracking-[0.18em]">
          <span style={{ color: evo ? '#fde047' : c.color }}>{KIND_LABEL[c.kind]}</span>
          {el && <span className="text-slate-400">{el}</span>}
        </div>
        <div className="relative w-16 h-16 my-1 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full animate-[spin_8s_linear_infinite]" style={{ background: `conic-gradient(from 0deg, transparent, ${c.color}, transparent 30%, ${c.color}aa, transparent 60%, ${c.color}, transparent 90%)`, opacity: 0.55 }} />
          <div className="absolute inset-[5px] rounded-full" style={{ background: `radial-gradient(circle at 50% 35%, #ffffff55, ${c.color}cc 35%, #020617 78%)`, boxShadow: `0 0 18px ${c.color}, inset 0 0 10px #000` }} />
          <Icon className="relative w-8 h-8 text-white" style={{ filter: `drop-shadow(0 0 6px ${c.color})` }} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-white font-cinzel font-bold text-[15px] leading-tight">{name}</span>
          {lvl && <span className="text-[11px] font-black px-1.5 rounded bg-black/70 border border-amber-400 text-amber-300">Lv {lvl}</span>}
        </div>
        <span className="text-slate-100 text-[12px] leading-snug font-medium">{c.desc}</span>
      </div>
    </div>
  );
}

function Shell({ title, sub, children, modal }: { title: string; sub: React.ReactNode; children: React.ReactNode; modal: string }) {
  return (
    <div data-modal={modal} className="fixed inset-0 z-[80] overflow-y-auto" style={{ background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.75), rgba(0,0,0,0.88))' }}>
      <div className="min-h-full flex flex-col items-center justify-center px-3 py-3 gap-2">
        <div className="glass-panel rounded-xl px-5 py-1.5 text-center">
          <h2 className="gold-gradient-text font-cinzel font-black tracking-widest text-lg leading-tight">{title}</h2>
          <p className="text-slate-300 text-[11px]">{sub}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-[860px]">{children}</div>
      </div>
    </div>
  );
}

export function LevelUpModal({ level, choices, onSelectUpgrade }: { level: number; choices: UpgradeChoice[]; onSelectUpgrade: (id: string) => void }) {
  return (
    <Shell modal="levelup" title={`LEVEL ${level}`} sub="Choose one upgrade">
      {choices.map((c) => <Card key={c.id} c={c} onPick={onSelectUpgrade} />)}
    </Shell>
  );
}

export function StartSpellModal({ bossTest, onPick }: { bossTest: boolean; onPick: (id: string) => void }) {
  const lvl = bossTest ? 5 : 1;
  const choices: UpgradeChoice[] = BASE_SPELL_IDS.map((id) => {
    const b = BASE_SPELLS[id];
    return { id, kind: 'new', title: `${b.name} Lv ${lvl}`, desc: spellEffectText(makeSpell(id, lvl)), icon: b.icon, color: b.color };
  });
  return (
    <Shell modal="startspell" title="CHOOSE YOUR FIRST MAGIC" sub={<>It casts automatically. Learn more on level-up.{bossTest && <span className="text-rose-400 font-bold"> BOSS TEST: Lv 5 + boosted stats.</span>}</>}>
      {choices.map((c) => <Card key={c.id} c={c} onPick={onPick} />)}
    </Shell>
  );
}

export function ChestModal({ title, sub, choices, onSelect }: { title: string; sub: string; choices: UpgradeChoice[]; onSelect: (id: string) => void }) {
  return (
    <Shell modal="chest" title={title} sub={sub}>
      {choices.map((c) => <Card key={c.id} c={c} onPick={onSelect} />)}
    </Shell>
  );
}
