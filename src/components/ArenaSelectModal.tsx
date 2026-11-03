import React from 'react';
import { X, MapPin, Flame, Snowflake, Sparkles, CloudRain, Check } from 'lucide-react';
import { ARENAS_LIST } from '../game/arenas';
import { ArenaRealm } from '../types/game';
import { sound } from '../audio/soundEngine';

interface ArenaSelectModalProps {
  currentArena: ArenaRealm;
  onSelectArena: (arena: ArenaRealm) => void;
  onClose: () => void;
}

export const ArenaSelectModal: React.FC<ArenaSelectModalProps> = ({
  currentArena,
  onSelectArena,
  onClose,
}) => {
  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'embers':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'snow':
        return <Snowflake className="w-4 h-4 text-cyan-300" />;
      case 'blood_rain':
        return <CloudRain className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950/95 gold-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold font-cinzel tracking-wider text-slate-100">
                Select Battleground Realm
              </h2>
              <div className="text-[11px] text-slate-400 font-sans">
                Each realm features distinct atmospheric weather, terrain hazards, and demonic spawns
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

        {/* Arenas Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARENAS_LIST.map((arena) => {
            const isSelected = arena.id === currentArena.id;

            return (
              <div
                key={arena.id}
                onClick={() => {
                  sound.playItemUse();
                  onSelectArena(arena);
                }}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-cinzel font-bold text-lg text-white">
                        {arena.name}
                      </h3>
                      <div className="text-[11px] font-cinzel text-amber-300">
                        {arena.subtitle}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-bold font-cinzel flex items-center gap-1 shadow">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed mb-3">
                    {arena.description}
                  </p>

                  {/* Hazard info */}
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] mb-3">
                    <span className="font-bold text-rose-400 font-cinzel">Hazard: </span>
                    <span className="text-slate-300 font-sans">{arena.hazardDescription}</span>
                  </div>
                </div>

                {/* Weather indicator */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300 font-cinzel text-[11px]">
                    {getWeatherIcon(arena.primaryWeather)}
                    <span className="capitalize">Climate: {arena.primaryWeather.replace('_', ' ')}</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400">UNLOCKED</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-cinzel text-xs transition-colors cursor-pointer"
          >
            Confirm Arena
          </button>
        </div>
      </div>
    </div>
  );
};
