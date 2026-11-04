/** Etched element glyphs (Magic Survival-style): one unique symbol per spell, evolution, combo, artifact and passive. */
import React, { useId } from 'react';

type Frame = 'none' | 'evo1' | 'evo2' | 'combo' | 'relic' | 'passive';
interface Glyph { c: string; d: string[]; fill?: string[]; frame?: Frame }
const F = '#fb923c', I = '#a5f3fc', L = '#fde047', A = '#c4b5fd', S = '#5eead4', G = '#e5c158';
export const GLYPHS: Record<string, Glyph> = {
  // base spells
  cataclysm: { c: F, d: ['M24 40c-8 0-12-6-10-13 1-4 4-6 5-11 3 3 3 6 3 8 2-4 5-9 4-16 6 5 10 11 10 19 0 8-5 13-12 13z', 'M24 40c-3 0-5-2-4-6 1-2 3-3 3-6 3 2 5 5 5 8 0 2-2 4-4 4z'] },
  frost_nova: { c: I, d: ['M24 6v36M8.4 15l31.2 18M8.4 33l31.2-18', 'M20 9l4 4 4-4M20 39l4-4 4 4M9 20l5 1-1-5M39 28l-5-1 1 5M9 28l5-1-1 5M39 20l-5 1 1-5'] },
  thunderstorm: { c: L, d: ['M28 5L13 27h10l-4 16 16-23H25l3-15z'] },
  arcane_missiles: { c: A, d: ['M24 4l4 14 14 6-14 6-4 14-4-14-14-6 14-6z', 'M24 16v16M16 24h16'] },
  spirit: { c: S, d: ['M15 40V22a9 9 0 0118 0v18l-3-3-3 3-3-3-3 3-3-3z', 'M20 24h.5M27.5 24h.5', 'M21 31q3 2 6 0'] },
  // evolutions
  'thunderstorm#1': { c: '#67e8f9', frame: 'evo1', d: ['M27 9L16 25h8l-3 12 12-17h-8l2-11z', 'M10 18l4 3M38 30l-4-3'] },
  'thunderstorm#2': { c: L, frame: 'evo2', d: ['M24 8l-4 10h6l-6 12h5l-3 10 10-15h-5l5-10h-5l3-7z', 'M14 14l3 4M34 14l-3 4M24 4v3'] },
  'frost_nova#1': { c: '#a5f3fc', frame: 'evo1', d: ['M24 6l4 18-4 18-4-18z', 'M10 16l14 8 14-8M10 32l14-8 14 8'] },
  'frost_nova#2': { c: '#e0f2fe', frame: 'evo2', d: ['M24 10l12 7v14l-12 7-12-7V17z', 'M24 10v28M12 17l24 14M36 17L12 31', 'M24 18l5 6-5 6-5-6z'] },
  'cataclysm#1': { c: '#fb923c', frame: 'evo1', d: ['M30 10L18 26', 'M34 14L22 30', 'M20 30a6 6 0 1012 0 6 6 0 10-12 0z', 'M14 38h20'] },
  'cataclysm#2': { c: '#f43f5e', frame: 'evo2', d: ['M24 40c-7 0-10-5-9-11 1-3 3-5 4-9 2 2 3 5 3 7 2-4 4-8 3-14 5 4 9 9 9 16 0 7-4 11-10 11z', 'M12 12l4 4M36 12l-4 4M24 6v4'] },
  'arcane_missiles#1': { c: '#c084fc', frame: 'evo1', d: ['M12 36L36 12', 'M30 10l6 2 2 6', 'M18 22l8 8', 'M12 36l-2 2'] },
  'arcane_missiles#2': { c: '#f0abfc', frame: 'evo2', d: ['M24 8l3 10 10 3-10 3-3 10-3-10-10-3 10-3z', 'M12 34l4-4M36 34l-4-4M24 40v-4'] },
  // combos
  combo_blizzard: { c: '#7dd3fc', frame: 'combo', d: ['M24 10v28M12 17l24 14M12 31l24-14', 'M24 18l2 6-2 6-2-6z'] },
  combo_superconductor: { c: '#60a5fa', frame: 'combo', d: ['M24 9v30M11 16.5l26 15M11 31.5l26-15', 'M27 14l-6 9h6l-6 11'] },
  combo_thunderfall: { c: '#f97316', frame: 'combo', d: ['M24 38c-6 0-9-4-8-9 1-3 3-4 3-8 3 2 4 5 4 7', 'M28 9l-7 11h6l-4 10 10-14h-6l3-7z'] },
  combo_singularity: { c: '#a855f7', frame: 'combo', d: ['M24 24m-4 0a4 4 0 108 0 4 4 0 10-8 0', 'M24 12c8 0 12 6 12 12', 'M36 24c0 8-6 12-12 12', 'M24 36c-8 0-12-6-12-12', 'M12 24c0-8 6-12 12-12'] },
  // artifacts
  'art:eye': { c: '#f87171', frame: 'relic', d: ['M8 24q16-16 32 0-16 16-32 0z', 'M24 24m-5 0a5 5 0 1010 0 5 5 0 10-10 0'], fill: ['M24 24m-2 0a2 2 0 104 0 2 2 0 10-4 0'] },
  'art:hourglass': { c: '#facc15', frame: 'relic', d: ['M15 9h18M15 39h18M17 9q0 10 7 15 7-5 7-15M17 39q0-10 7-15 7 5 7 15'], fill: ['M20 36q4-6 8 0z'] },
  'art:lodestone': { c: '#38bdf8', frame: 'relic', d: ['M14 12v12a10 10 0 0020 0V12h-6v12a4 4 0 01-8 0V12z', 'M14 17h6M28 17h6'] },
  'art:titan': { c: '#ef4444', frame: 'relic', d: ['M24 38S10 29 10 19a7 7 0 0114-3 7 7 0 0114 3c0 10-14 19-14 19z', 'M18 21h12M24 15v12'] },
  'art:phoenix': { c: '#fb923c', frame: 'relic', d: ['M24 40V20', 'M24 20C16 16 12 10 14 6c4 4 7 7 10 8', 'M24 20c8-4 12-10 10-14-4 4-7 7-10 8', 'M18 30q6-4 12 0'] },
  'art:prism': { c: '#a78bfa', frame: 'relic', d: ['M24 9l14 26H10z', 'M24 9v26', 'M6 20l10 6M42 26l-10 4'] },
  'art:sigil': { c: '#34d399', frame: 'relic', d: ['M24 8l14 8v16l-14 8-14-8V16z', 'M24 16l7 4v8l-7 4-7-4v-8z', 'M24 8v8M24 32v8'] },
  'art:slayer': { c: '#e879f9', frame: 'relic', d: ['M24 6l4 6v18h-8V12z', 'M16 30h16M24 30v10', 'M21 40h6'] },
  'art:crown': { c: '#fbbf24', frame: 'relic', d: ['M10 34l-2-18 9 8 7-12 7 12 9-8-2 18z', 'M12 38h24'] },
  // passives
  pass_power: { c: G, frame: 'passive', d: ['M24 8v32M8 24h32', 'M24 14l4 10-4 10-4-10z'] },
  pass_crit: { c: G, frame: 'passive', d: ['M24 24m-10 0a10 10 0 1020 0 10 10 0 10-20 0', 'M24 8v8M24 32v8M8 24h8M32 24h8'], fill: ['M24 24m-2 0a2 2 0 104 0 2 2 0 10-4 0'] },
  pass_vitality: { c: '#fb7185', frame: 'passive', d: ['M24 37S12 29 12 20a6 6 0 0112-2 6 6 0 0112 2c0 9-12 17-12 17z', 'M12 25h7l3-5 4 9 3-4h7'] },
  pass_magnet: { c: '#7dd3fc', frame: 'passive', d: ['M24 10a12 12 0 0112 12v6h-6v-6a6 6 0 00-12 0v6h-6v-6a12 12 0 0112-12z', 'M14 36h4M30 36h4M16 32v8M32 32v8'] },
  pass_swift: { c: '#a3e635', frame: 'passive', d: ['M8 18h20a5 5 0 10-5-5', 'M8 26h28a5 5 0 11-5 5', 'M8 34h14'] },
  fast_cast: { c: '#facc15', frame: 'passive', d: ['M24 26m-12 0a12 12 0 1024 0 12 12 0 10-24 0', 'M24 26l5-7', 'M20 8h8M24 8v6', 'M10 14l3 3'] },
};
export const GLYPH_KEYS = Object.keys(GLYPHS);

/** Map an upgrade choice / spell to its glyph key. */
export function glyphKeyFor(id: string, level?: number, kind?: string): string {
  if (id.startsWith('evo:')) return `${id.slice(4)}#${level ?? 1}`;
  if (id.startsWith('art:')) return id;
  if (kind === 'artifact') return `art:${id}`;
  return id.replace(/^(new|lvl):/, '');
}
export const spellGlyphKey = (s: { id: string; tier?: number }) => ((s.tier ?? 0) > 0 ? `${s.id}#${s.tier}` : s.id);

function frameEl(f: Frame, c: string) {
  switch (f) {
    case 'evo1': return <g opacity=".85"><circle cx="24" cy="24" r="21.5" />{Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <path key={i} d={`M${24 + Math.cos(a) * 21.5} ${24 + Math.sin(a) * 21.5}L${24 + Math.cos(a) * 18.5} ${24 + Math.sin(a) * 18.5}`} />; })}</g>;
    case 'evo2': return <g><circle cx="24" cy="24" r="21.5" stroke="#ffd700" /><circle cx="24" cy="24" r="18.5" opacity=".6" />{Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <path key={i} stroke="#ffd700" d={`M${24 + Math.cos(a) * 21.5} ${24 + Math.sin(a) * 21.5}L${24 + Math.cos(a) * 25} ${24 + Math.sin(a) * 25}`} />; })}</g>;
    case 'combo': return <path opacity=".8" d="M24 2l19 11v22L24 46 5 35V13z" />;
    case 'relic': return <path opacity=".55" d="M24 2l22 22-22 22L2 24z" strokeDasharray="3 2" />;
    case 'passive': return <circle cx="24" cy="24" r="21" opacity=".35" strokeDasharray="2 3" />;
    default: void c; return null;
  }
}

export function MagicGlyph({ k, size = 28, color, className, style }: { k: string; size?: number; color?: string; className?: string; style?: React.CSSProperties }) {
  const fid = 'et' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = GLYPHS[k] ?? GLYPHS.arcane_missiles;
  const c = color ?? g.c;
  return (
    <svg data-glyph={k} className={className} width={size} height={size} viewBox="-2 -2 52 52" fill="none" stroke={c} strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 3px ${c}) drop-shadow(0 0 1px #000)`, overflow: 'visible', ...style }}>
      <defs>
        <filter id={fid} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
      </defs>
      <g filter={`url(#${fid})`} strokeWidth="2.6">
        {frameEl(g.frame ?? 'none', c)}
        {g.d.map((d, i) => <path key={i} d={d} />)}
        {g.fill?.map((d, i) => <path key={'f' + i} d={d} fill={c} />)}
      </g>
      <g stroke="#fffbe8" strokeWidth=".8" opacity=".75">{g.d.map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  );
}
