import React, { useState } from 'react';
import { X, Volume2, VolumeX, Eye, ShieldAlert, Sparkles } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface SettingsModalProps {
  showDamageNumbers: boolean;
  enableScreenShake: boolean;
  autoAim: boolean;
  onToggleDamageNumbers: (val: boolean) => void;
  onToggleScreenShake: (val: boolean) => void;
  onToggleAutoAim: (val: boolean) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  showDamageNumbers,
  enableScreenShake,
  autoAim,
  onToggleDamageNumbers,
  onToggleScreenShake,
  onToggleAutoAim,
  onClose,
}) => {
  const [sfxVol, setSfxVol] = useState(Math.round(sound.masterVolume * 100));
  const [sfxOn, setSfxOn] = useState(sound.sfxOn);
  const [musicVol, setMusicVol] = useState(40);
  const [muted, setMuted] = useState(false);

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSfxVol(val);
    sound.setMasterVolume(val / 100);
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setMusicVol(val);
    sound.setMusicVolume(val / 100);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-950/95 gold-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rotate-45 bg-amber-400" />
            <h2 className="text-xl font-bold font-cinzel tracking-wider text-slate-100">
              Sanctuary Settings & Controls
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
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Audio Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-cinzel font-bold tracking-widest text-amber-400">
                Audio Synthesizer
              </h3>
              <button
                onClick={handleToggleMute}
                className="flex items-center gap-1.5 text-xs font-cinzel text-slate-300 hover:text-amber-400 cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{muted ? 'Unmute All' : 'Mute All'}</span>
              </button>
            </div>

            <div className="space-y-3 bg-slate-900/70 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <div className="flex justify-between mb-1 text-slate-300">
                  <span>Master Volume</span>
                  <span className="font-mono font-bold text-amber-400">{sfxVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVol}
                  onChange={handleSfxChange}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-300">
                  <span>Cosmic Atmospheric Drone</span>
                  <span className="font-mono font-bold text-amber-400">{musicVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVol}
                  onChange={handleMusicChange}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <label data-setting="sfx" className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>Sound Effects</span>
                <input type="checkbox" checked={sfxOn} onChange={(e) => { setSfxOn(e.target.checked); sound.setSfxEnabled(e.target.checked); }} className="accent-amber-500 w-4 h-4" />
              </label>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => { sound.unlock(); sound.play('thunder', 1); }}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-cinzel text-amber-300 border border-slate-700 cursor-pointer"
                >
                  Test Audio Chime
                </button>
              </div>
            </div>
          </div>

          {/* Gameplay & Visuals */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-cinzel font-bold tracking-widest text-sky-400">
              Gameplay & Visual Fidelity
            </h3>

            <div className="space-y-2.5 bg-slate-900/70 p-4 rounded-xl border border-slate-800 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-slate-200">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Floating Damage Numbers (Crit & Normal)</span>
                </div>
                <input
                  type="checkbox"
                  checked={showDamageNumbers}
                  onChange={(e) => onToggleDamageNumbers(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-slate-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Dynamic Screen Shake (Meteor & Boss Slams)</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableScreenShake}
                  onChange={(e) => onToggleScreenShake(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-slate-200">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Auto-Aim Nearest Enemy for Arcane Missiles</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoAim}
                  onChange={(e) => onToggleAutoAim(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Controls Guide */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-cinzel font-bold tracking-widest text-slate-400">
              Keyboard & Touch Keybinds
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div><span className="text-amber-400 font-bold">W, A, S, D</span> / Arrows: Move</div>
              <div><span className="text-sky-400 font-bold">SPACEBAR</span>: Dash / Blink</div>
              <div><span className="text-amber-400 font-bold">1, 2, 3, 4</span>: Cast Abilities</div>
              <div><span className="text-emerald-400 font-bold">P / ESC</span>: Pause Game</div>
              <div><span className="text-indigo-400 font-bold">1 - 5 (Belt)</span>: Quick Consumables</div>
              <div><span className="text-rose-400 font-bold">Mouse / Touch</span>: Aim & Drag Stick</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-cinzel text-xs transition-colors cursor-pointer"
          >
            Apply & Resume
          </button>
        </div>
      </div>
    </div>
  );
};
