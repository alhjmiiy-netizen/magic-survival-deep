import React, { useState } from 'react';
import { Settings, Users, FlaskConical, BookOpen, Smartphone, Sparkles, ScrollText } from 'lucide-react';
import { loadBest } from '../game/deep';
import { CharacterHero, ArenaRealm, PlayerStats } from '../types/game';
import { sound } from '../audio/soundEngine';
import { usePWAInstall } from './usePWAInstall';
import { RegionSelect } from './RegionSelect';

interface MainMenuProps {
  currentHero: CharacterHero;
  currentArena: ArenaRealm;
  stats: PlayerStats;
  onStartGame: (mode: 'regions' | 'endless', regionIdx?: number) => void;
  onOpenCharacters: () => void;
  onOpenArenas: () => void;
  onOpenCombos: () => void;
  onOpenUpgrades: () => void;
  onOpenStory: () => void;
  onOpenSettings: () => void;
  onOpenEncyclopedia?: () => void;
  onQuickSwitchHero?: (hero: CharacterHero) => void;
}

/** Our own illustration: a shattered gothic tower window glowing teal, with ink-black ragged silhouettes. */
export function MenuArt({ tint = '#21e6e6' }: { tint?: string }) {
  const panes: React.ReactNode[] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) {
    const x = 118 + c * 62, y = 92 + r * 78;
    panes.push(<rect key={`${r}-${c}`} x={x} y={y} width={54} height={70} rx={2} fill="url(#pane)" opacity={0.78 + ((r * 7 + c * 3) % 5) * 0.05} />);
  }
  return (
    <svg className="mm-art" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="pane" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bffcfc" /><stop offset=".5" stopColor={tint} /><stop offset="1" stopColor="#0d8f95" /></linearGradient>
        <radialGradient id="glow" cx=".62" cy=".45" r=".6"><stop offset="0" stopColor={tint} stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="4" /><feDisplacementMap in="SourceGraphic" scale="14" /></filter>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" /><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .35 0" /><feComposite in2="SourceGraphic" operator="in" /></filter>
      </defs>
      <rect width="400" height="860" fill="#000" />
      <rect width="400" height="860" fill="url(#glow)" />
      <g filter="url(#rough)">
        <path d="M104 860 V150 Q104 40 230 20 Q356 40 356 150 V860 Z" fill="#062e30" />
        {panes}
      </g>
      <rect x="100" y="0" width="270" height="860" filter="url(#grain)" fill="#fff" opacity=".9" />
      <g fill="#000" filter="url(#rough)">
        <path d="M0 0 H150 L140 70 L168 120 L132 190 L176 250 L120 330 L164 400 L110 470 L150 530 L96 610 L140 690 L90 760 L120 860 H0 Z" />
        <path d="M150 330 L215 360 L262 300 L248 360 L300 352 L232 392 L150 380 Z" />
        <path d="M120 560 L190 520 L228 470 L214 540 L262 560 L180 572 Z" />
        <path d="M400 0 V860 H360 L372 700 L350 520 L376 340 L352 160 L372 0 Z" />
        <path d="M60 860 L96 700 L120 640 L150 700 L170 640 L196 720 L230 860 Z" />
      </g>
    </svg>
  );
}

export const MainMenu: React.FC<MainMenuProps> = (p) => {
  const best = loadBest();
  const [regionOpen, setRegionOpen] = useState(false);
  const pwa = usePWAInstall();
  const fmtT = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  const tap = (fn?: () => void) => () => { sound.playItemUse(); fn?.(); };
  const install = () => {
    if (pwa.isInstallable) pwa.install();
    else alert(pwa.isIOS ? 'Tap Share, then "Add to Home Screen".' : pwa.isInstalled ? 'Already installed.' : 'Open the browser menu and choose "Install app" / "Add to Home screen".');
  };
  const nav: { k: string; label: string; Icon: React.ComponentType<{ strokeWidth?: number }>; on?: boolean; fn: () => void }[] = [
    { k: 'heroes', label: 'Heroes', Icon: Users, on: true, fn: p.onOpenCharacters },
    { k: 'research', label: 'Altar', Icon: FlaskConical, fn: p.onOpenUpgrades },
    { k: 'grimoire', label: 'Grimoire', Icon: BookOpen, fn: () => p.onOpenEncyclopedia?.() },
    { k: 'combos', label: 'Combos', Icon: Sparkles, fn: p.onOpenCombos },
    { k: 'install', label: 'Install', Icon: Smartphone, fn: install },
  ];
  return (
    <div className="ms-screen" data-screen="menu" style={{ zIndex: 40 }}>
      <MenuArt />
      <div className="mm-top">
        <div>
          <div className="mm-cur">
            <span style={{ color: '#ffd700' }}><i className="mm-dot" style={{ background: '#ffd700', boxShadow: '0 0 6px #ffd700' }} />{p.stats.gold.toLocaleString()}</span>
            <span style={{ color: '#21e6e6' }}><i className="mm-dot" style={{ background: '#21e6e6', transform: 'rotate(45deg)', borderRadius: 2 }} />{p.stats.crystals.toLocaleString()}</span>
          </div>
          <button className="mm-tag" onClick={tap(p.onOpenCharacters)}>
            <img src={p.currentHero.standImage || p.currentHero.portrait} alt="" />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{p.currentHero.name} <span style={{ color: '#e5c158' }}>Lv {p.stats.level}</span></span>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="ms-ibtn" aria-label="Settings" onClick={tap(p.onOpenSettings)}><Settings /></button>
          <button className="ms-ibtn" aria-label="Campaign" onClick={tap(p.onOpenStory)}><ScrollText /></button>
        </div>
      </div>
      <div className="mm-title"><b>Magic</b><b style={{ marginLeft: -20 }}>Survival</b><i>~ Deep ~</i></div>
      <div className="mm-bottom">
        <div className="mm-modes">
          <button className="ms-glowtext mm-start" data-action="start" onClick={tap(() => setRegionOpen(true))}>Start Game</button>
        </div>
        <div className="mm-best">Regions {best.regions.cleared}/5 cleared · Endless best {fmtT(best.endless.time)} · {best.endless.kills} kills</div>
        <div className="mm-nav">
          {nav.map(({ k, label, Icon, on, fn }) => (
            <button key={k} data-nav={k} className={on ? 'on' : ''} onClick={tap(fn)}>
              <span className="mm-navic"><Icon strokeWidth={1.6} /></span>{label}
            </button>
          ))}
        </div>
      </div>
      {regionOpen && <RegionSelect onClose={() => setRegionOpen(false)} onEnter={(i) => p.onStartGame('regions', i)} onInfinite={() => p.onStartGame('endless')} />}
    </div>
  );
};
