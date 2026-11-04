import React, { useMemo, useState } from 'react';
import { X, Circle, Gem, BookOpen, Flame, Sparkles, Ghost, Layers, Skull, Globe, Award } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { MagicGlyph } from './MagicIcons';
import { ENEMY_DEFS } from '../game/enemies';
import { renderNewEnemy, hasNewArt } from '../game/EnemyArt';
import { VisualRenderer } from '../game/Visuals';
import { buildCodex, CodexEntry, CodexTab, PAIR_ELEMENTS, ELEMENT_NAME } from '../game/codex';
import { FUSIONS } from '../game/tuning';

interface EncyclopediaModalProps { gold: number; crystals: number; onClose: () => void }

const enemyIconCache: Record<string, string> = {};
function enemyIcon(type: string): string {
  if (enemyIconCache[type]) return enemyIconCache[type];
  const c = document.createElement('canvas'); c.width = 96; c.height = 96; const ctx = c.getContext('2d')!;
  const d = ENEMY_DEFS[type]; const k = Math.min(1.6, 30 / d.r); ctx.translate(48, 60); ctx.scale(k, k);
  try {
    if (hasNewArt(type)) renderNewEnemy(ctx, { x: 0, y: 0, type, radius: d.r, hp: 1, maxHp: 1, flying: d.flying }, false, false, 1, 0);
    else VisualRenderer.renderDemonMinion(ctx, 0, 0, type as never, false, false, 1, 1, 1, 0);
  } catch { /* ignore */ }
  return (enemyIconCache[type] = c.toDataURL());
}

const TABS: { id: CodexTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'guide', label: 'Guide', Icon: BookOpen }, { id: 'magics', label: 'Magics', Icon: Flame }, { id: 'fusions', label: 'Fusions', Icon: Sparkles },
  { id: 'spirits', label: 'Spirits', Icon: Ghost }, { id: 'artifacts', label: 'Artifacts', Icon: Layers }, { id: 'bestiary', label: 'Bestiary', Icon: Skull },
  { id: 'world', label: 'World', Icon: Globe }, { id: 'research', label: 'Research', Icon: Award },
];

function EntryIcon({ icon, size }: { icon: string; size: number }) {
  if (icon.startsWith('glyph:')) return <MagicGlyph k={icon.slice(6)} size={size} />;
  if (icon.startsWith('art:')) return <MagicGlyph k={icon} size={size} />;
  if (icon.startsWith('enemy:')) return <img data-enemy={icon.slice(6)} src={enemyIcon(icon.slice(6))} width={size + 8} height={size + 8} alt="" />;
  if (icon.startsWith('region:')) return <span style={{ width: size * 0.8, height: size * 0.8, borderRadius: '50%', display: 'inline-block', background: `radial-gradient(circle at 35% 35%, #fff8, ${icon.slice(7)} 55%, #000 100%)`, boxShadow: `0 0 12px ${icon.slice(7)}` }} />;
  return <Sparkles className="w-8 h-8 text-amber-300" />;
}

function PairMatrix({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="max-w-3xl mx-auto mb-4 overflow-x-auto" data-testid="pair-matrix">
      <table className="w-full text-[10px] font-cinzel border-collapse">
        <thead><tr><th />{PAIR_ELEMENTS.map((e) => <th key={e} className="p-1 text-stone-300">{ELEMENT_NAME[e]}</th>)}</tr></thead>
        <tbody>{PAIR_ELEMENTS.map((a) => (
          <tr key={a}><th className="p-1 text-stone-300 text-left">{ELEMENT_NAME[a]}</th>
            {PAIR_ELEMENTS.map((b) => { const key = [a, b].sort().join('+'); const f = a === b ? null : FUSIONS[key];
              return <td key={b} className={`p-1 border border-stone-800 text-center ${f ? 'cursor-pointer hover:bg-stone-800' : 'text-stone-700'}`} style={f ? { color: f.color } : undefined} onClick={() => f && onPick('fusion:' + key)}>{f ? f.name : '—'}</td>; })}
          </tr>))}</tbody>
      </table>
    </div>
  );
}

export const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ gold, crystals, onClose }) => {
  const codex = useMemo(() => buildCodex(), []);
  const [activeTab, setActiveTab] = useState<CodexTab>('guide');
  const [selectedId, setSelectedId] = useState<string>(codex[0].id);
  const list = codex.filter((e) => e.tab === activeTab);
  const sel: CodexEntry = codex.find((e) => e.id === selectedId) ?? list[0] ?? codex[0];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 select-none font-sans" data-testid="encyclopedia">
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

        
        <div className="flex items-center justify-around px-2 py-2 border-b border-stone-800 bg-[#0d1017] overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} data-tab={id} onClick={() => { sound.playItemUse(); setActiveTab(id); const f = codex.find((e) => e.tab === id); if (f) setSelectedId(f.id); }}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-all cursor-pointer ${activeTab === id ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_#f59e0b]' : 'text-stone-500 hover:text-stone-300'}`} title={label}>
              <Icon className="w-5 h-5 stroke-[2.5]" />
              <span className="text-[9px] font-cinzel font-bold">{label}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#080b11]">
          {activeTab === 'fusions' && <PairMatrix onPick={setSelectedId} />}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
            {list.map((e) => (
              <div key={e.id} data-entry={e.id} onClick={() => { sound.playItemUse(); setSelectedId(e.id); }}
                className={`relative flex flex-col items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer min-h-[96px] group ${e.id === sel.id ? 'bg-[#151a26] border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]' : 'bg-[#0f131c] border-stone-800 hover:border-stone-600'}`}>
                <span className="text-[8px] font-cinzel uppercase font-bold text-stone-400 line-clamp-1">{e.tag}</span>
                <div className="my-1 flex items-center justify-center h-11"><EntryIcon icon={e.icon} size={36} /></div>
                <div className="text-[10px] font-bold font-cinzel text-center text-stone-200 line-clamp-2 w-full">{e.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-stone-800 bg-[#05070a] p-4 z-20 max-h-[38%] overflow-y-auto" data-testid="codex-detail">
          <div className="max-w-3xl mx-auto flex gap-4 items-start">
            <div className="shrink-0 hidden sm:block"><EntryIcon icon={sel.icon} size={48} /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h3 className="text-lg font-bold font-cinzel text-white">{sel.name}</h3>
                <span className="text-[10px] font-cinzel uppercase text-amber-400">[{sel.tag}]</span>
              </div>
              <ul className="text-xs text-stone-300 leading-relaxed list-disc pl-4 space-y-0.5">{sel.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
              {sel.stats && <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-mono">{sel.stats.map(([k, v]) => <span key={k} className="text-sky-300">{k}: <b className="text-amber-200">{v}</b></span>)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
