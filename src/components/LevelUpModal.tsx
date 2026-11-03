import React from 'react';
import { Sparkles, Zap, Snowflake, Flame, Timer, Crosshair, Heart, Magnet, Wind, Eye, Hourglass, Feather, Triangle, Hexagon, Sword, Crown } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import type { UpgradeChoice } from '../game/spells';
import { BASE_SPELLS, BASE_SPELL_IDS, makeSpell, spellEffectText } from '../game/spells';

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Sparkles, Zap, Snowflake, Flame, Timer, Crosshair, Heart, Magnet, Wind, Eye, Hourglass, Feather, Triangle, Hexagon, Sword, Crown,
};

const KIND_LABEL: Record<UpgradeChoice['kind'], string> = {
  new: 'NEW MAGIC', level: 'MAGIC LEVEL UP', fast: 'CASTING', passive: 'PASSIVE', evolve: 'EVOLVE', artifact: 'ARTIFACT',
};

const ELEMENT: Record<string, string> = {
  thunderstorm: 'LIGHTNING', frost_nova: 'FROST', cataclysm: 'FIRE', arcane_missiles: 'ARCANE',
};

function Card({ c, onPick }: { c: UpgradeChoice; onPick: (id: string) => void }) {
  const Icon = ICONS[c.icon] ?? Sparkles;
  const spellId = c.id.replace(/^(new|lvl|evo):/, '');
  const evo = c.kind === 'evolve';
  const el = ELEMENT[spellId];
  const [name, lvl] = c.title.includes(' Lv ') ? c.title.split(' Lv ') : [c.title, ''];
  return (
    <div data-choice={c.id} role="button" data-kind={c.kind} onClick={() => { sound.playItemUse(); onPick(c.id); }}
      className={`ms-card lv-card ${evo ? 'evo evo-card' : ''}`}>
      <div className="lv-ic" style={{ color: evo ? '#ffd700' : '#fff' }}><Icon style={{ filter: `drop-shadow(0 0 5px ${c.color})` }} /></div>
      <div className="lv-body">
        <div className="lv-kind" style={{ color: evo ? '#ffd700' : c.color }}>{evo ? `★ EVOLVE${c.level === 2 ? ' · FINAL' : ''}` : KIND_LABEL[c.kind]}{el ? ` · ${el}` : ''}</div>
        <div className="lv-row"><span className="lv-name">{name}</span>{lvl && <span className="lv-lvl">Lv {lvl}</span>}</div>
        <div className="lv-desc">{c.desc}</div>
      </div>
    </div>
  );
}

function Shell({ title, sub, children, modal }: { title: string; sub: React.ReactNode; children: React.ReactNode; modal: string }) {
  return (
    <div data-modal={modal} className="lv-wrap">
      <div className="lv-inner">
        <div><h2 className="lv-title">{title}</h2><p className="lv-sub">{sub}</p></div>
        <div className="lv-list">{children}</div>
      </div>
    </div>
  );
}

export function LevelUpModal({ level, choices, onSelectUpgrade }: { level: number; choices: UpgradeChoice[]; onSelectUpgrade: (id: string) => void }) {
  return (
    <Shell modal="levelup" title={`Level ${level}`} sub="Choose one upgrade">
      {choices.map((c) => <Card key={c.id} c={c} onPick={onSelectUpgrade} />)}
    </Shell>
  );
}

export function StartSpellModal({ bossTest, onPick }: { bossTest: boolean; onPick: (id: string) => void }) {
  const lvl = bossTest ? 5 : 1;
  const choices: UpgradeChoice[] = BASE_SPELL_IDS.map((id) => {
    const b = BASE_SPELLS[id];
    return { id, kind: 'new', title: `${b.name} Lv ${lvl}`, desc: spellEffectText(makeSpell(id, lvl)), icon: b.icon, color: b.color };
  });
  return (
    <Shell modal="startspell" title="Choose Your First Magic" sub={<>It casts automatically. Learn more on level-up.{bossTest && <span className="text-rose-400 font-bold"> BOSS TEST: Lv 5 + boosted stats.</span>}</>}>
      {choices.map((c) => <Card key={c.id} c={c} onPick={onPick} />)}
    </Shell>
  );
}

export function ChestModal({ title, sub, choices, onSelect }: { title: string; sub: string; choices: UpgradeChoice[]; onSelect: (id: string) => void }) {
  return (
    <Shell modal="chest" title={title} sub={sub}>
      {choices.map((c) => <Card key={c.id} c={c} onPick={onSelect} />)}
    </Shell>
  );
}
