import React from 'react';
import { sound } from '../audio/soundEngine';
import type { UpgradeChoice } from '../game/spells';
import { BASE_SPELLS, BASE_SPELL_IDS, makeSpell, spellEffectText } from '../game/spells';
import { ARTIFACTS } from '../game/deep';
import { MagicGlyph, GLYPHS, glyphKeyFor } from './MagicIcons';

const KIND_LABEL: Record<UpgradeChoice['kind'], string> = {
  new: 'NEW MAGIC', level: 'MAGIC', fast: 'CASTING', passive: 'PASSIVE', evolve: 'EVOLVE', artifact: 'ARTIFACT',
};

export const ELEMENT_TAG: Record<string, [string, string]> = {
  thunderstorm: ['LIGHTNING', '#fde047'], frost_nova: ['FROST', '#a5f3fc'], cataclysm: ['FIRE', '#fb923c'], arcane_missiles: ['ARCANE', '#c4b5fd'], spirit: ['SPIRIT', '#5eead4'],
};

function maxFor(c: UpgradeChoice, spellId: string): number {
  if (c.kind === 'evolve') return 2;
  if (c.kind === 'artifact') return ARTIFACTS.find((a) => `art:${a.id}` === c.id || a.id === spellId)?.max ?? 1;
  if (c.kind === 'fast') return 6;
  return BASE_SPELLS[spellId]?.maxLevel ?? 0;
}

function Card({ c, onPick }: { c: UpgradeChoice; onPick: (id: string) => void }) {
  const spellId = c.id.replace(/^(new|lvl|evo|art):/, '');
  const evo = c.kind === 'evolve';
  const key = glyphKeyFor(c.id, c.level, c.kind);
  const tag = ELEMENT_TAG[spellId];
  const accent = evo ? '#ffd700' : tag?.[1] ?? GLYPHS[key]?.c ?? c.color;
  const [name, lvl] = c.title.includes(' Lv ') ? c.title.split(' Lv ') : [c.title, ''];
  const max = maxFor(c, spellId);
  const cur = c.level ?? (lvl ? Number(lvl) : 0);
  return (
    <div data-choice={c.id} role="button" data-kind={c.kind} onClick={() => { sound.playItemUse(); onPick(c.id); }}
      className={`ms-card lv-card ${evo ? 'evo evo-card' : ''}`} style={{ ['--acc' as string]: accent }}>
      <div className="lv-ic"><MagicGlyph k={key} size={40} /></div>
      <div className="lv-body">
        <div className="lv-kind"><span style={{ color: accent }}>{evo ? `★ EVOLVE${c.level === 2 ? ' · FINAL' : ''}` : KIND_LABEL[c.kind]}</span>{tag && <span className="lv-tag" style={{ color: tag[1], borderColor: tag[1] }}>{tag[0]}</span>}</div>
        <div className="lv-row"><span className="lv-name">{name}</span>{lvl && <span className="lv-lvl">Lv {lvl}</span>}</div>
        <div className="lv-desc">{c.desc}</div>
        {max > 1 && max <= 12 && <div className="lv-pips">{Array.from({ length: max }, (_, i) => <i key={i} className={i < cur ? 'on' : ''} />)}</div>}
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
