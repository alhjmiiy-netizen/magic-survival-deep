import React from 'react';
import { X, Award, CheckCircle, Scroll, ShieldCheck, ChevronRight, Gem, Circle } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface ResearchLetterModalProps {
  survivalTime: string;
  waveReached: number;
  demonsSlain: number;
  onProceed: () => void;
  onClose: () => void;
}

export const ResearchLetterModal: React.FC<ResearchLetterModalProps> = ({
  survivalTime,
  waveReached,
  demonsSlain,
  onProceed,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 select-none font-sans animate-in fade-in duration-300">
      {/* Aged Parchment Document with Burnt Edges and Wax Seal */}
      <div className="relative w-full max-w-lg glass-panel rounded-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-8 text-stone-200 flex flex-col font-serif">
        
        {/* Wax Seal at Top Center */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#7f1d1d] border-2 border-[#b91c1c] shadow-[0_4px_15px_rgba(185,28,28,0.5)] flex items-center justify-center text-rose-200 z-20">
          <Scroll className="w-6 h-6 stroke-[2]" />
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            sound.playItemUse();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Title */}
        <div className="text-center mt-4 mb-5 border-b border-stone-800 pb-3">
          <span className="text-[10px] font-cinzel uppercase font-bold tracking-[0.3em] text-amber-400">
            Confidential Laboratory Dispatch
          </span>
          <h2 className="text-xl sm:text-2xl font-black font-cinzel text-white tracking-wider mt-1">
            Subject Survival Record
          </h2>
          <div className="text-xs text-stone-400 font-mono mt-0.5">
            Protocol Demand: Survive Beyond 15:00 • Status: <span className="text-emerald-400 font-bold">ACHIEVED ({survivalTime})</span>
          </div>
        </div>

        {/* The Letter Content (Matching user's request!) */}
        <div className="bg-[#0b0e17] p-5 rounded-xl border border-stone-800/80 text-xs sm:text-sm leading-relaxed text-stone-300 font-sans space-y-3 shadow-inner">
          <p className="italic text-stone-400">
            "To the Overseers of the High Arcane Conclave:"
          </p>
          <p>
            The trial within the shattered containment sector has concluded. Against all projected models of demonic density, the test subject has successfully sustained physical vessel and spirit mana resonance throughout the required 15-minute threshold.
          </p>
          <p className="font-semibold text-amber-200">
            The experiment was an undeniable success.
          </p>
          <p>
            However, the void corruption advances relentlessly, and ambient pollution threatens to dissolve containment barriers. We cannot halt or turn back. As outlined in the protocols, <strong className="text-rose-300">we must proceed to the next testing realm immediately</strong> to document further evolutionary mutations.
          </p>
          <div className="pt-2 text-right text-xs text-stone-400 font-serif">
            — Chief Arcanist of Void Quarantine
          </div>
        </div>

        {/* Trial Performance Stats */}
        <div className="grid grid-cols-3 gap-2 my-4 text-center">
          <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
            <div className="text-[10px] text-stone-400 font-cinzel">Trial Time</div>
            <div className="text-xs font-mono font-bold text-sky-300">{survivalTime}</div>
          </div>
          <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
            <div className="text-[10px] text-stone-400 font-cinzel">Wave Reached</div>
            <div className="text-xs font-mono font-bold text-amber-300">Wave {waveReached}</div>
          </div>
          <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
            <div className="text-[10px] text-stone-400 font-cinzel">Demons Slain</div>
            <div className="text-xs font-mono font-bold text-rose-400">{demonsSlain}</div>
          </div>
        </div>

        {/* Rewards Granted */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-cinzel mb-5">
          <span className="text-amber-300 font-bold">Research Grant Awarded:</span>
          <div className="flex items-center gap-3 font-mono font-bold">
            <span className="text-amber-400 flex items-center gap-1">
              <Circle className="w-3.5 h-3.5 fill-amber-400" /> +500 Gold
            </span>
            <span className="text-cyan-400 flex items-center gap-1">
              <Gem className="w-3.5 h-3.5 fill-cyan-400" /> +25 Crystals
            </span>
          </div>
        </div>

        {/* Action Button: Proceed to Next Sector */}
        <button
          onClick={() => {
            sound.playLevelUp();
            onProceed();
          }}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:brightness-110 active:scale-98 text-stone-950 font-black font-cinzel text-xs sm:text-sm tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer transition-all"
        >
          <span>PROCEED TO NEXT EXPERIMENTAL SECTOR</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
