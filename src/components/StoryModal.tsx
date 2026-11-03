import React, { useState } from 'react';
import { X, BookMarked, ShieldAlert, Sparkles, ChevronRight } from 'lucide-react';
import { STORY_CHAPTERS } from '../game/story';

interface StoryModalProps {
  currentWave: number;
  onClose: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({ currentWave, onClose }) => {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(() => {
    // Select highest unlocked chapter
    const unlocked = STORY_CHAPTERS.filter((c) => currentWave >= c.waveTarget);
    return unlocked.length > 0 ? unlocked[unlocked.length - 1].id : 1;
  });

  const selectedChapter = STORY_CHAPTERS.find((c) => c.id === selectedChapterId) || STORY_CHAPTERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950/95 gold-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <BookMarked className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold font-cinzel tracking-wider text-slate-100">
                Chronicles of the Broken Realm
              </h2>
              <div className="text-[11px] text-slate-400 font-sans">
                Dark Fantasy Campaign & Lore Archives
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chapter Selector List (Left Column) */}
          <div className="space-y-2.5">
            <h3 className="text-xs uppercase font-cinzel font-bold tracking-widest text-amber-400 mb-2">
              Campaign Acts
            </h3>
            {STORY_CHAPTERS.map((chap) => {
              const isUnlocked = currentWave >= chap.waveTarget;
              const isSelected = chap.id === selectedChapterId;

              return (
                <button
                  key={chap.id}
                  onClick={() => isUnlocked && setSelectedChapterId(chap.id)}
                  disabled={!isUnlocked}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                      : isUnlocked
                      ? 'bg-slate-900/70 border-slate-800 hover:border-slate-600 hover:bg-slate-900 text-slate-300 cursor-pointer'
                      : 'bg-slate-950 border-slate-850 text-slate-600 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-cinzel uppercase tracking-wider text-amber-400">
                      {chap.actName} · Wave {chap.waveTarget}
                    </div>
                    <div className="font-cinzel font-bold text-sm text-slate-100 mt-0.5">
                      {chap.title}
                    </div>
                  </div>
                  {isUnlocked ? (
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Dialogue & Lore View (Right 2 Columns) */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs font-cinzel uppercase tracking-widest text-amber-400 mb-1">
                {selectedChapter.actName}
              </div>
              <h3 className="text-2xl font-black font-cinzel text-white mb-2">
                {selectedChapter.title}
              </h3>
              <p className="text-xs text-slate-400 font-sans italic border-b border-slate-800 pb-3 mb-4">
                "The veil between our sanctuary and the celestial abyss tears asunder. Only those who master the fusion of prime elements shall survive."
              </p>

              {/* Dialogue Transcript */}
              <div className="space-y-3">
                {selectedChapter.dialogue.map((line, idx) => {
                  const isPlayer = line.speaker.includes('Archmage') || line.speaker.includes('Caelen');
                  const isOracle = line.speaker.includes('Oracle');
                  const isBoss = line.speaker.includes('Void') || line.speaker.includes('Abyss') || line.speaker.includes('Colossus');

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs font-sans leading-relaxed ${
                        isPlayer
                          ? 'bg-sky-950/20 border-sky-500/30 text-sky-100'
                          : isOracle
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-100'
                          : isBoss
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="font-cinzel font-bold text-[11px] mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span className={isPlayer ? 'text-sky-300' : isOracle ? 'text-amber-300' : 'text-rose-400'}>
                          {line.speaker}
                        </span>
                      </div>
                      <p>{line.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-cinzel text-xs transition-colors cursor-pointer"
          >
            Resume Chronicle
          </button>
        </div>
      </div>
    </div>
  );
};
