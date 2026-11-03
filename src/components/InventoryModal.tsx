import React from 'react';
import { X, Wand2, Shield, CircleDot, Shirt, Book, Footprints } from 'lucide-react';
import { EquipmentItem, PlayerStats } from '../types/game';

interface InventoryModalProps {
  stats: PlayerStats;
  equipment: EquipmentItem[];
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ stats, equipment, onClose }) => {
  const getIcon = (icon: string) => {
    switch (icon) {
      case 'Wand2':
        return <Wand2 className="w-6 h-6 text-amber-400" />;
      case 'Shield':
        return <Shield className="w-6 h-6 text-sky-400" />;
      case 'CircleDot':
        return <CircleDot className="w-6 h-6 text-purple-400" />;
      case 'Shirt':
        return <Shirt className="w-6 h-6 text-rose-400" />;
      case 'Book':
        return <Book className="w-6 h-6 text-yellow-400" />;
      case 'Footprints':
        return <Footprints className="w-6 h-6 text-emerald-400" />;
      default:
        return <Wand2 className="w-6 h-6 text-amber-400" />;
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'border-amber-500/60 text-amber-400 bg-amber-500/10';
      case 'epic':
        return 'border-purple-500/60 text-purple-400 bg-purple-500/10';
      case 'rare':
        return 'border-sky-500/60 text-sky-400 bg-sky-500/10';
      default:
        return 'border-slate-600 text-slate-300 bg-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950/95 gold-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rotate-45 bg-amber-400" />
            <h2 className="text-xl font-bold font-cinzel tracking-wider text-slate-100">
              Archmage Armory & Inventory
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Player Equipment Grid (2 columns on left) */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs uppercase font-cinzel font-bold tracking-widest text-amber-400 mb-2">
              Equipped Relics & Artifacts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {equipment.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-700/80 flex items-center justify-center flex-shrink-0 shadow-inner">
                      {getIcon(item.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-cinzel font-bold text-sm text-slate-100 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${getRarityBadge(
                          item.rarity
                        )} font-cinzel`}
                      >
                        {item.rarity}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 italic font-sans leading-relaxed">
                    "{item.description}"
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[10px]">
                    {item.stats.map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-950 px-2 py-0.5 rounded border border-slate-700/60 text-slate-300 font-mono"
                      >
                        {s.label}: <span className="text-amber-400 font-bold">{s.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Total Combat Attributes */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-cinzel font-bold tracking-widest text-sky-400">
              Combat Attributes
            </h3>

            <div className="bg-slate-900/70 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Archmage Level</span>
                <span className="font-bold text-amber-300 font-mono">Lv. {stats.level}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Max Health</span>
                <span className="font-bold text-rose-400 font-mono">{stats.maxHp} HP</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Mana Barrier</span>
                <span className="font-bold text-sky-400 font-mono">{stats.maxMana} MP</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Spell Power</span>
                <span className="font-bold text-amber-400 font-mono">+{stats.spellPower}%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Critical Strike Chance</span>
                <span className="font-bold text-yellow-300 font-mono">{stats.critChance}%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Critical Damage</span>
                <span className="font-bold text-yellow-300 font-mono">
                  {Math.round(stats.critMultiplier * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Cooldown Reduction</span>
                <span className="font-bold text-indigo-300 font-mono">
                  -{stats.cooldownReduction}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Movement Velocity</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {stats.speed.toFixed(1)} m/s
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Aether Magnetism</span>
                <span className="font-bold text-cyan-300 font-mono">{stats.pickupRadius} px</span>
              </div>
            </div>

            <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl text-center">
              <span className="text-xs text-sky-300 font-cinzel">
                Relics grow stronger as you survive deeper waves and gather Celestial Crystals.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-cinzel text-xs transition-colors cursor-pointer"
          >
            Resume Battle
          </button>
        </div>
      </div>
    </div>
  );
};
