import React from 'react';
import { X, Sparkles, Snowflake, Zap, Flame, CheckCircle, ArrowRight } from 'lucide-react';
import { Spell } from '../types/game';

interface SkillsModalProps {
  spells: Spell[];
  onClose: () => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({ spells, onClose }) => {
  const getIcon = (icon: string) => {
    switch (icon) {
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-sky-400" />;
      case 'Snowflake':
        return <Snowflake className="w-6 h-6 text-cyan-300" />;
      case 'Zap':
        return <Zap className="w-6 h-6 text-blue-400" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-amber-500" />;
      default:
        return <Sparkles className="w-6 h-6 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950/95 gold-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rotate-45 bg-sky-400" />
            <h2 className="text-xl font-bold font-cinzel tracking-wider text-slate-100">
              Grimoire of Active Spells & Evolutions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-400 font-sans">
            Reach spell Rank 6 or higher to unlock transcendent spell evolutions. Evolved spells gain secondary cataclysmic effects.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spells.map((spell) => (
              <div
                key={spell.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  {/* Top line */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shadow-inner">
                        {getIcon(spell.icon)}
                      </div>
                      <div>
                        <h3 className="font-cinzel font-bold text-base text-slate-100">
                          {spell.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-amber-400 font-bold">
                            Rank {spell.level} / {spell.maxLevel}
                          </span>
                          {spell.evolved && (
                            <span className="text-[10px] font-bold font-cinzel text-sky-400 bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Evolved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed mb-3">
                    {spell.description}
                  </p>

                  {/* Evolution Box */}
                  {spell.evolved && spell.evolutionName && (
                    <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/30 mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-cinzel font-bold text-sky-300 mb-1">
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                        <span>Transcendence: {spell.evolutionName}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans">
                        {spell.evolutionDesc}
                      </p>
                    </div>
                  )}
                </div>

                {/* Spell Metrics */}
                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-500">Damage</div>
                    <div className="text-rose-400 font-bold">{spell.damage}</div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-500">Cooldown</div>
                    <div className="text-indigo-400 font-bold">{spell.cooldown}s</div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <div className="text-slate-500">AoE Radius</div>
                    <div className="text-amber-400 font-bold">{spell.area}px</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold font-cinzel text-xs transition-colors cursor-pointer"
          >
            Return to Arena
          </button>
        </div>
      </div>
    </div>
  );
};
