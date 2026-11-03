import React, { useState } from 'react';
import { X } from 'lucide-react';
import { REGIONS } from '../game/deep';
import { ARENAS_LIST } from '../game/arenas';
import { sound } from '../audio/soundEngine';

/** Hand-made SVG illustrations per region (no photos). */
function RegionArt({ idx }: { idx: number }) {
  const sky = [['#0b1d4a', '#38bdf8'], ['#0b2a3a', '#bdf4ff'], ['#2a0602', '#ff7a1a'], ['#12001c', '#c04bff'], ['#2a1c00', '#ffd76a']][idx];
  const rough = <filter id={`rr${idx}`}><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="3" seed={idx + 2} /><feDisplacementMap in="SourceGraphic" scale="12" /></filter>;
  const grain = <filter id={`rg${idx}`}><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" /><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .22 0" /></filter>;
  let scene: React.ReactNode;
  if (idx === 0) scene = (<>{Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 73) % 300} cy={(i * 41) % 240} r={i % 5 === 0 ? 2 : 1} fill="#fff" opacity=".8" />)}
    <ellipse cx="150" cy="300" rx="120" ry="26" fill="#0a1430" stroke="#38bdf8" strokeWidth="3" /><path d="M60 300 L240 300 L220 400 L80 400Z" fill="#000" /><circle cx="150" cy="150" r="46" fill="none" stroke="#7dd3fc" strokeWidth="2" opacity=".7" /><path d="M150 104 L190 176 L110 176Z" fill="none" stroke="#7dd3fc" strokeWidth="2" /></>);
  else if (idx === 1) scene = (<>{[30, 80, 130, 180, 230, 270].map((x, i) => <path key={i} d={`M${x} 400 L${x + 12} ${120 + (i % 3) * 40} L${x + 26} 400Z`} fill="#dff8ff" opacity={0.5 + (i % 2) * 0.4} />)}<rect y="330" width="300" height="70" fill="#06131b" /><path d="M0 330 Q150 300 300 330 V400 H0Z" fill="#000" /></>);
  else if (idx === 2) scene = (<><path d="M0 260 L60 170 L100 230 L150 120 L210 220 L250 160 L300 250 V400 H0Z" fill="#000" /><path d="M0 330 Q75 300 150 335 T300 320 V400 H0Z" fill="#ff5a00" opacity=".85" /><path d="M140 125 L150 120 L160 130 L152 330Z" fill="#ff9a3a" />{[40, 110, 200, 260].map((x, i) => <circle key={i} cx={x} cy={90 + i * 30} r="2.5" fill="#ffd27a" />)}</>);
  else if (idx === 3) scene = (<><g fill="none" stroke="#e070ff" strokeWidth="3" opacity=".8">{[90, 70, 50, 30, 14].map((r, i) => <path key={i} d={`M${150 - r} 200 A${r} ${r} 0 1 1 ${150 + r * 0.7} ${200 + r * 0.7}`} />)}</g><path d="M0 400 V250 L30 250 L30 220 L60 220 L60 400Z M240 400 V230 L270 200 L300 230 V400Z" fill="#000" /><rect y="350" width="300" height="50" fill="#000" /></>);
  else scene = (<><circle cx="150" cy="140" r="70" fill="#ffe9a0" /><circle cx="170" cy="130" r="62" fill="#2a1c00" /><path d="M60 400 V250 L100 210 L100 180 L150 140 L200 180 L200 210 L240 250 V400Z" fill="#000" /><path d="M120 400 V300 Q150 270 180 300 V400Z" fill="#ffd76a" opacity=".7" /></>);
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id={`rs${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>{rough}{grain}</defs>
      <rect width="300" height="400" fill={`url(#rs${idx})`} />
      <g filter={`url(#rr${idx})`}>{scene}</g>
      <rect width="300" height="400" filter={`url(#rg${idx})`} />
    </svg>
  );
}

export function RegionSelect({ onClose, onEnter, onInfinite }: { onClose: () => void; onEnter: (i: number) => void; onInfinite: () => void }) {
  const [i, setI] = useState(0);
  const r = REGIONS[i];
  const a = ARENAS_LIST.find((x) => x.id === r.arena);
  const step = (d: number) => { sound.playItemUse(); setI((i + d + REGIONS.length) % REGIONS.length); };
  const mins = Math.round(r.duration / 60);
  return (
    <div className="ms-screen rs" data-screen="regions">
      <div className="rs-head"><span className="rs-h">Select Region</span><button className="ms-ibtn" aria-label="Close" onClick={onClose}><X /></button></div>
      <div className="rs-stage">
        <button className="rs-arrow" aria-label="Previous region" onClick={() => step(-1)}><svg viewBox="0 0 24 24"><path d="M16 3 L5 12 L16 21Z" /></svg></button>
        <div className="rs-art" data-region={i}><RegionArt idx={i} /></div>
        <button className="rs-arrow" aria-label="Next region" onClick={() => step(1)}><svg viewBox="0 0 24 24"><path d="M8 3 L19 12 L8 21Z" /></svg></button>
      </div>
      <div className="rs-info">
        <div className="rs-name" style={{ color: '#fff' }}>{r.name}</div>
        <div className="rs-sub">Region {i + 1} · {a?.subtitle}</div>
        <div className="rs-line">{String(mins).padStart(2, '0')}:00</div>
        <div className="rs-desc">{a?.description}</div>
        <div className="rs-haz">Hazard: {r.hazard.name} · Boss: {r.boss.name}</div>
        <div className="rs-dots">{REGIONS.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="rs-actions">
          <button className="ms-glowtext small" data-action="enter" data-mode="regions" onClick={() => { sound.playItemUse(); onEnter(i); }}>Enter Area</button>
          <button className="ms-glowtext small gold" data-action="infinite" data-mode="endless" onClick={() => { sound.playItemUse(); onInfinite(); }}>Infinite Mode</button>
        </div>
      </div>
    </div>
  );
}
