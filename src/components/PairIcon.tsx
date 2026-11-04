import React from 'react';
export const EL_COLOR: Record<string, string> = { fire: '#f97316', ice: '#38bdf8', lightning: '#facc15', arcane: '#a855f7', spirit: '#2dd4bf' };
const EL_PATH: Record<string, string> = {
  fire: 'M0,-9 C5,-3 6,2 3,7 C1,9 -1,9 -3,7 C-6,2 -4,-2 0,-9 Z',
  ice: 'M0,-9 L0,9 M-8,-4.5 L8,4.5 M-8,4.5 L8,-4.5',
  lightning: 'M2,-9 L-5,1 L0,1 L-2,9 L5,-2 L0,-2 Z',
  arcane: 'M0,-9 L2.5,-2.5 L9,0 L2.5,2.5 L0,9 L-2.5,2.5 L-9,0 L-2.5,-2.5 Z',
  spirit: 'M0,-8 C6,-8 7,0 4,4 C3,6 5,9 0,8 C-5,9 -3,6 -4,4 C-7,0 -6,-8 0,-8 Z M-2,-2 a1,1 0 1,0 0.1,0 M2,-2 a1,1 0 1,0 0.1,0',
};
/** Two-element combo badge: left/right halves in each element colour with its symbol. */
export function PairIcon({ pair, size = 44, dim = false }: { pair: string; size?: number; dim?: boolean }) {
  const [a, b] = pair.split('+'); const id = 'pi' + pair.replace('+', '_');
  const stroke = (el: string) => (el === 'ice' ? { fill: 'none', stroke: '#fff', strokeWidth: 2 } : { fill: '#fff', stroke: 'none' });
  return (
    <svg data-pair-icon={pair} width={size} height={size} viewBox="-24 -24 48 48" style={{ opacity: dim ? 0.45 : 1, filter: `drop-shadow(0 0 6px ${EL_COLOR[a]}88)` }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0.5" stopColor={EL_COLOR[a]} /><stop offset="0.5" stopColor={EL_COLOR[b]} /></linearGradient></defs>
      <circle r="22" fill={`url(#${id})`} stroke="#fff6" strokeWidth="1.5" />
      <path d="M-15,15 L15,-15" stroke="#0007" strokeWidth="1.5" />
      <g transform="translate(-8,-7) scale(0.8)"><path d={EL_PATH[a]} {...stroke(a)} /></g>
      <g transform="translate(8,7) scale(0.8)"><path d={EL_PATH[b]} {...stroke(b)} /></g>
    </svg>
  );
}
