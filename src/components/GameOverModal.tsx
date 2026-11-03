import React from 'react';
import { RotateCcw, Trophy, Skull, Gem, Circle, Clock, Flame } from 'lucide-react';
import { RunSummary } from '../game/GameEngine';

interface GameOverModalProps {
  victory: boolean;
  summary: RunSummary;
  onRestart: () => void;
  onHome?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ victory, summary, onRestart, onHome }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-slate-950/95 gold-border rounded-2xl shadow-2xl p-6 text-center flex flex-col items-center">
        {/* Crest Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 shadow-2xl ${
            victory
              ? 'border-amber-400 bg-amber-500/20 text-amber-400 shadow-[0_0_20px_#fbbf24]'
              : 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-[0_0_20px_#f43f5e]'
          }`}
        >
          {victory ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
        </div>

        {/* Title */}
        <h2
          className={`text-3xl font-black font-cinzel tracking-wider mb-1 ${
            victory ? 'gold-gradient-text' : 'fire-gradient-text'
          }`}
        >
          {victory ? 'Sanctuary Preserved!' : 'The Void Consumes All'}
        </h2>
        <p className="text-xs text-slate-400 font-sans mb-6">
          {victory
            ? 'You have banished the Colossus and survived the endless demon onslaught.'
            : 'Your physical vessel fell, but your celestial soul returns to the altar.'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <Clock className="w-4 h-4 text-sky-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-cinzel">Survival Duration</div>
              <div className="font-mono font-bold text-white text-sm">{summary.survivalTime}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <Skull className="w-4 h-4 text-rose-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-cinzel">Demons Slain</div>
              <div className="font-mono font-bold text-rose-300 text-sm">
                {summary.enemiesDefeated.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <Gem className="w-4 h-4 text-sky-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-cinzel">Crystals Gathered</div>
              <div className="font-mono font-bold text-sky-300 text-sm">
                {summary.crystalsCollected.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <Circle className="w-4 h-4 text-amber-400 fill-amber-400/40" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-cinzel">Gold Acquired</div>
              <div className="font-mono font-bold text-amber-300 text-sm">
                {summary.goldEarned.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-cinzel">Total Damage</div>
              <div className="font-mono font-bold text-orange-300 text-sm">
                {summary.damageDealt.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-cinzel">{summary.endlessTime ? 'Endless Time' : 'Region Reached'}</div>
              <div className="font-mono font-bold text-emerald-300 text-sm">
                {summary.endlessTime ? summary.endlessTime : `${summary.regionReached ?? 1}/5 ${summary.regionName ?? ''}`}
              </div>
            </div>
          </div>
        </div>
        {summary.score !== undefined && (
          <div data-gameover="score" className="w-full mb-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-amber-500/40 text-center">
            <div className="text-[10px] text-slate-400 font-cinzel tracking-widest">{(summary.mode ?? 'regions').toUpperCase()} · SCORE</div>
            <div className="font-mono font-black text-amber-300 text-lg">{summary.score.toLocaleString()} {summary.newBest && <span className="text-[10px] text-emerald-300 ml-1">NEW BEST!</span>}</div>
            {summary.bestText && <div className="text-[10px] text-slate-400">{summary.bestText}</div>}
          </div>
        )}

        {/* Action Buttons: Play Again & Return Home */}
        <div className="flex items-center gap-3 w-full">
          {onHome && (
            <button
              onClick={onHome}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-cinzel text-xs font-bold cursor-pointer transition-colors"
            >
              Main Menu
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-98 text-slate-950 font-black font-cinzel text-sm tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-950/40 cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
