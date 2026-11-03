import React from 'react';
import { Sparkles, Zap, Snowflake, Flame, Timer, Crosshair, Heart, Magnet, Wind } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import type { UpgradeChoice } from '../game/spells';
import { BASE_SPELLS, BASE_SPELL_IDS } from '../game/spells';

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Sparkles, Zap, Snowflake, Flame, Timer, Crosshair, Heart, Magnet, Wind,
};

const KIND_LABEL: Record<UpgradeChoice['kind'], string> = {
  new: 'NEW MAGIC', level: 'MAGIC LEVEL UP', fast: 'CASTING', passive: 'PASSIVE',
};

function Card({ c, onPick }: { c: UpgradeChoice; onPick: (id: string) => void }) {
  const Icon = ICONS[c.icon] ?? Sparkles;
  return (
    <div
      data-choice={c.id}
      role="button"
      onClick={() => { sound.playItemUse(); onPick(c.id); }}
      className="cursor-pointer flex-1 min-w-[140px] max-w-[200px] rounded-xl border bg-slate-950/90 p-3 flex flex-col items-center text-center gap-1.5 hover:scale-[1.03] active:scale-95 transition-transform"
      style={{ borderColor: c.color, boxShadow: `0 0 14px ${c.color}55` }}
    >
      <span className="text-[9px] font-bold tracking-widest" style={{ color: c.color }}>{KIND_LABEL[c.kind]}</span>
      <div className="w-11 h-11 rounded-full flex items-center justify-center border" style={{ borderColor: c.color, background: `${c.color}22` }}>
        <Icon className="w-6 h-6" style={{ color: c.color }} />
      </div>
      <span className="text-white font-bold text-sm leading-tight">{c.title}</span>
      <span className="text-slate-300 text-[11px] leading-snug">{c.desc}</span>
    </div>
  );
}

export function LevelUpModal({ level, choices, onSelectUpgrade }: { level: number; choices: UpgradeChoice[]; onSelectUpgrade: (id: string) => void }) {
  return (
    <div data-modal="levelup" className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-3 gap-2">
        <h2 className="text-amber-300 font-black tracking-widest text-lg">LEVEL {level}</h2>
        <p className="text-slate-400 text-[11px] -mt-1">Choose one upgrade</p>
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-[860px]">
          {choices.map((c) => <Card key={c.id} c={c} onPick={onSelectUpgrade} />)}
        </div>
      </div>
    </div>
  );
}

export function StartSpellModal({ bossTest, onPick }: { bossTest: boolean; onPick: (id: string) => void }) {
  const choices: UpgradeChoice[] = BASE_SPELL_IDS.map((id) => {
    const b = BASE_SPELLS[id];
    return { id, kind: 'new', title: b.name, desc: b.description, icon: b.icon, color: b.color };
  });
  return (
    <div data-modal="startspell" className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-3 gap-2">
        <h2 className="text-sky-300 font-black tracking-widest text-lg">CHOOSE YOUR FIRST MAGIC</h2>
        <p className="text-slate-400 text-[11px] -mt-1">
          It casts automatically. Learn more magic on level-up.
          {bossTest && <span className="text-rose-400 font-bold"> BOSS TEST MODE: starts at Lv 5 with boosted stats.</span>}
        </p>
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-[860px]">
          {choices.map((c) => <Card key={c.id} c={c} onPick={onPick} />)}
        </div>
      </div>
    </div>
  );
}
