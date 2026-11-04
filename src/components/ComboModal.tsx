import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Spell } from '../types/game';
import { FUSIONS, FUSION_CD, FUSION_WINDOW, CATA_GAIN } from '../game/tuning';
import { ELEMENT_OF } from '../game/deep';
import { PairIcon, EL_COLOR } from './PairIcon';
import { sound } from '../audio/soundEngine';

interface PairRow { key: string; name: string; cd: number; max: number; count: number }
interface ComboModalProps { spells: Spell[]; onClose: () => void; gold?: number; crystals?: number; onFuseSpell?: (id: string) => void; getEngine?: () => { pairState(): PairRow[] } | null | undefined }
const ELEMENT_OF_SPELL: Record<string, string> = { ...ELEMENT_OF, spirit: 'spirit' };
const EL_NAME: Record<string, string> = { fire: 'Fire', ice: 'Ice', lightning: 'Lightning', arcane: 'Arcane', spirit: 'Spirit' };

/** Pair Combos screen: all 10 element pairs, their effect, live per-pair cooldown and times triggered this run. */
export const ComboModal: React.FC<ComboModalProps> = ({ spells, onClose, getEngine }) => {
  const [rows, setRows] = useState<PairRow[] | null>(null);
  const [sel, setSel] = useState<string>(Object.keys(FUSIONS)[0]);
  useEffect(() => { const tick = () => { const e = getEngine?.(); if (e?.pairState) setRows(e.pairState()); }; tick(); const id = setInterval(tick, 200); return () => clearInterval(id); }, [getEngine]);
  const owned = new Set(spells.filter((s) => !s.isCombo && s.level > 0).map((s) => ELEMENT_OF_SPELL[s.id] ?? (s as { element?: string }).element).filter(Boolean) as string[]);
  const f = FUSIONS[sel]; const [sa, sb] = sel.split('+');
  return (
    <div data-modal="combos" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-violet-500/40 bg-slate-950/95 p-4 text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold tracking-wide">Pair Combos <span className="text-xs text-slate-400 font-normal">— cast two elements within {FUSION_WINDOW}s</span></h2>
          <button aria-label="Close" data-action="close" onClick={() => { sound.play('click'); onClose(); }} className="p-1 rounded hover:bg-white/10"><X size={20} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-3">Every pair has its own effect, sound and a {FUSION_CD}s cooldown of its own, so different pairs can chain. Each combo feeds the Cataclysm meter +{CATA_GAIN.fusion} (+{CATA_GAIN.tripleFusion} for 3 different pairs within 6s).</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          {Object.entries(FUSIONS).map(([k, d]) => {
            const r = rows?.find((q) => q.key === k); const [a, b] = k.split('+'); const ready = owned.has(a) && owned.has(b);
            const pct = r && r.max > 0 ? r.cd / r.max : 0;
            return (
              <button key={k} data-pair={k} data-ready={ready ? '1' : '0'} onClick={() => setSel(k)} className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${sel === k ? 'border-white/70 bg-white/10' : 'border-white/10 bg-white/5'}`}>
                <div className="relative"><PairIcon pair={k} size={44} dim={!ready} />
                  {pct > 0 && <svg className="absolute inset-0" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#0009" /><circle cx="22" cy="22" r="20" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray={`${125.6 * pct} 200`} transform="rotate(-90 22 22)" /><text x="22" y="26" textAnchor="middle" fontSize="11" fill="#fff">{r!.cd.toFixed(1)}</text></svg>}
                </div>
                <span className="text-[11px] font-semibold leading-tight" style={{ color: d.color }}>{d.name}</span>
                <span className="text-[10px] text-slate-400">{EL_NAME[a]} + {EL_NAME[b]}</span>
                {r && r.count > 0 && <span data-count className="absolute top-1 right-1 text-[9px] rounded bg-violet-600 px-1">×{r.count}</span>}
              </button>
            );
          })}
        </div>
        <div data-pair-detail={sel} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <PairIcon pair={sel} size={64} />
          <div className="text-sm">
            <div className="font-bold" style={{ color: f.color }}>{f.name}</div>
            <div className="text-xs mb-1"><span style={{ color: EL_COLOR[sa] }}>{EL_NAME[sa]}</span> + <span style={{ color: EL_COLOR[sb] }}>{EL_NAME[sb]}</span></div>
            <div className="text-slate-300">{f.desc}</div>
            <div className="text-xs text-slate-400 mt-1">Power ×{f.dmgMul} of your average magic · radius {f.radius} · cooldown {FUSION_CD}s · {owned.has(sa) && owned.has(sb) ? 'available now' : 'learn both magics to use it'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
