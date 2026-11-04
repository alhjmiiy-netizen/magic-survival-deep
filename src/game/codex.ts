/**
 * Encyclopedia content generated from the game's data constants (no hand-written numbers).
 * Every number shown in the Encyclopedia comes from here; qa/codex.cjs checks the text against the constants.
 */
import { SPIRIT } from './spiritRoles';
import { BASE_SPELLS, BASE_SPELL_IDS, MAX_SPIRITS, PASSIVES } from './spells';
import { SPELL2_BY_ID } from './spells2';
import { ARTIFACTS, ELEMENT_OF, EVOLUTIONS, REGIONS, SYNERGIES, SYNERGY_MIN_LEVEL, ENDLESS_BOSS_EVERY, ENDLESS_CAP, RARITY_WEIGHT, evoUnlockLevel } from './deep';
import { ENEMY_DEFS, REGION_PACKS } from './enemies';
import { SCENES } from './cataclysm';
import * as T from './tuning';
import { IBG, IBG_SETS } from './interactiveBg';
import { INITIAL_RESEARCH_ATTRIBUTES } from '../components/UpgradeModal';

export type CodexTab = 'guide' | 'magics' | 'fusions' | 'spirits' | 'artifacts' | 'bestiary' | 'world' | 'research';
export interface CodexEntry { id: string; tab: CodexTab; name: string; tag: string; icon: string; lines: string[]; stats?: [string, string][] }

export const fmtTime = (s: number) => (s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
const pct = (m: number) => `${Math.round((m - 1) * 100)}%`;
export const ELEMENT_NAME: Record<string, string> = { fire: 'Fire', ice: 'Frost', lightning: 'Lightning', arcane: 'Arcane', spirit: 'Spirit', poison: 'Poison', wind: 'Wind', earth: 'Earth', water: 'Water', light: 'Light' };
/** element -> every magic of that element (v7: several spells share an element) */
const spellsOfEl: Record<string, string[]> = { spirit: ['spirit'] };
for (const [id, el] of Object.entries(ELEMENT_OF)) (spellsOfEl[el] ??= []).push(id);
const spellOfEl: Record<string, string> = Object.fromEntries(Object.entries(spellsOfEl).map(([el, ids]) => [el, ids[0]]));
const anyOf = (el: string) => (spellsOfEl[el] ?? []).map((id) => BASE_SPELLS[id]?.name).filter(Boolean).join(' / ');
export const PAIR_ELEMENTS = ['fire', 'ice', 'lightning', 'arcane', 'spirit', 'poison', 'wind', 'earth', 'water', 'light'];

/** Extra entries registered by later systems (pairs, spirit roles, interactive background). */
const extra: (() => CodexEntry[])[] = [];
export function registerCodex(f: () => CodexEntry[]) { extra.push(f); }

export function buildCodex(): CodexEntry[] {
  const out: CodexEntry[] = [];
  const add = (e: CodexEntry) => out.push(e);
  const regionTotal = REGIONS.reduce((a, r) => a + r.duration, 0);
  // ---------- Guide ----------
  add({ id: 'guide:modes', tab: 'guide', name: 'Game Modes', tag: 'Rules', icon: 'glyph:arcane_missiles', lines: [
    `Regions: ${REGIONS.length} regions, each lasting ${fmtTime(REGIONS[0].duration)} of survival before its boss appears (${fmtTime(regionTotal)} total before the last boss).`,
    `Beat the boss to claim a reward chest and travel to the next region.`,
    `Endless: no regions — a boss every ${fmtTime(ENDLESS_BOSS_EVERY)}, enemies get tougher every minute and the crowd is capped at ${ENDLESS_CAP} demons.`,
    `An elite appears every ${T.ELITE_EVERY} s (plus a ${(T.ELITE_RANDOM_CHANCE * 100).toFixed(1)}% chance per spawn); flying packs join every ${T.PACK_EVERY_REGION} s in regions and every ${T.PACK_EVERY_ENDLESS} s in endless.`,
  ], stats: [['Region length', fmtTime(REGIONS[0].duration)], ['Endless boss', `every ${fmtTime(ENDLESS_BOSS_EVERY)}`], ['Endless cap', `${ENDLESS_CAP}`]] });
  add({ id: 'guide:controls', tab: 'guide', name: 'Controls', tag: 'Rules', icon: 'glyph:fast_cast', lines: [
    'Move: WASD / arrow keys, or the left virtual joystick on touch screens.',
    'Dash: Space or the DASH button — brief invulnerability.',
    'Fly: F or the FLY button. Standing still in the air = hover, moving = soar; press again to land.',
    `Charge: hold a magic button on the HUD up to ${T.CHARGE_MAX} s, release for a bigger cast.`,
    'Keys 1-5 use belt items. Pause: P or Esc. Magic casts automatically; you steer, fly and charge.',
  ] });
  add({ id: 'guide:flight', tab: 'guide', name: 'Flight: FLY / SOAR / LAND', tag: 'Rules', icon: 'glyph:fast_cast', lines: [
    `FLY lifts you ${T.FLIGHT_LIFT} px off the ground (hover): ×${T.HOVER_SPEED} move speed, +${pct(T.HOVER_DMG)} spell damage.`,
    `SOAR (moving while flying) climbs to ×${T.SOAR_H} height: ×${T.SOAR_SPEED} move speed and +${pct(T.SOAR_DMG)} spell damage.`,
    'While airborne, ground demons and lobbed ground shots cannot touch you; flying demons and aimed shots still can.',
    `The world is endless — walk or fly in any direction forever; the terrain is generated as you go (the same place always looks the same). LAND puts you back on the ground.`,
  ], stats: [['Hover dmg', `+${pct(T.HOVER_DMG)}`], ['Soar dmg', `+${pct(T.SOAR_DMG)}`], ['World', 'endless']] });
  add({ id: 'guide:charge', tab: 'guide', name: 'Charge-Up', tag: 'Rules', icon: 'glyph:cataclysm', lines: [
    `Hold a magic for up to ${T.CHARGE_MAX} s. A full charge deals +150% damage, +60% area and +2 projectiles, but the cooldown grows by up to 50%.`,
    `Each charged cast feeds the Cataclysm meter (+${T.CATA_GAIN.chargeMin} to +${T.CATA_GAIN.chargeMax}).`,
  ] });
  add({ id: 'guide:cataclysm', tab: 'guide', name: 'Cataclysm', tag: 'Rules', icon: 'glyph:cataclysm', lines: [
    `The meter fills to 100 from fusions (+${T.CATA_GAIN.fusion}; three different fusions within 6 s fill it instantly), synergies (+${T.CATA_GAIN.synergy}), steam (+${T.CATA_GAIN.steam}), combos (+${T.CATA_GAIN.combo}) and charged casts.`,
    `When full, the ground around you shatters and collapses into a scene for ${T.CATA_SCENE} s, then re-forms with a reward chest. Next cataclysm after a ${fmtTime(T.CATA_CD)} cooldown.`,
    'The scene depends on how you stand: on the ground → The Abyss, hovering → Rift Between, soaring → Sky Realm.',
    'Never during a boss fight or between regions.',
  ], stats: [['Scene', `${T.CATA_SCENE} s`], ['Cooldown', fmtTime(T.CATA_CD)]] });
  add({ id: 'guide:chests', tab: 'guide', name: 'Chests & Elites', tag: 'Rules', icon: 'glyph:pass_power', lines: [
    `Elites have ×${T.ELITE_HP} HP, ×${T.ELITE_DMG} damage, a glowing aura and always drop a chest. Void Knights drop one 7% of the time.`,
    'A chest offers 3 artifacts. Boss chests offer evolutions first when a magic is fully grown.',
    `Artifact rarity weights: normal ${RARITY_WEIGHT.normal}, rare ${RARITY_WEIGHT.rare}, epic ${RARITY_WEIGHT.epic}.`,
  ] });
  // ---------- Magics ----------
  for (const id of BASE_SPELL_IDS) {
    const b = BASE_SPELLS[id]; const evo = EVOLUTIONS[id]; const el = id === 'spirit' ? 'spirit' : ELEMENT_OF[id];
    add({ id: 'magic:' + id, tab: 'magics', name: b.name, tag: ELEMENT_NAME[el], icon: 'glyph:' + id, lines: [
      b.description,
      ...(SPELL2_BY_ID[id] ? [`Scaling: ${SPELL2_BY_ID[id].scaling}.`] : []),
      ...(evo ? [`Lv${evoUnlockLevel(0)} evolution: ${evo[0].name} — ${evo[0].desc}.`, `Lv${evoUnlockLevel(1)} final form: ${evo[1].name} — ${evo[1].desc}.`] : [`Up to ${MAX_SPIRITS} spirits.`]),
    ], stats: [['Damage', `${b.damage}`], ['Cooldown', `${b.cooldown} s`], ['Max level', `${b.maxLevel}`], ...(b.area ? [['Area', `${b.area}`] as [string, string]] : [])] });
  }
  for (const [pid, p] of Object.entries(PASSIVES)) add({ id: 'magic:' + pid, tab: 'magics', name: p.title, tag: 'Passive', icon: 'glyph:' + pid, lines: [p.desc + '.'] });
  // ---------- Fusions ----------
  add({ id: 'fusion:rules', tab: 'fusions', name: 'How Fusions Work', tag: 'Rules', icon: 'glyph:combo_singularity', lines: [
    `Cast two different elements within ${T.FUSION_WINDOW} s of each other to trigger their fusion burst on the densest pack.`,
    `Each pair has its own ${T.FUSION_CD} s cooldown, effect and sound, so different pairs chain. Every fusion adds +${T.CATA_GAIN.fusion} to the Cataclysm meter.`,
    `Synergies: owning two element magics at Lv${SYNERGY_MIN_LEVEL}+ unlocks a permanent bonus.`,
  ] });
  for (const [key, f] of Object.entries(T.FUSIONS)) {
    const [a, b] = key.split('+');
    add({ id: 'fusion:' + key, tab: 'fusions', name: f.name, tag: `${ELEMENT_NAME[a]} + ${ELEMENT_NAME[b]}`, icon: 'pair:' + key, lines: [
      `Cast ${anyOf(a)} and ${anyOf(b)} within ${T.FUSION_WINDOW} s.`, ...(f as { desc?: string }).desc ? [(f as { desc?: string }).desc!] : [] ] });
  }
  for (const s of SYNERGIES) add({ id: 'syn:' + s.id, tab: 'fusions', name: s.name, tag: `Synergy ${ELEMENT_NAME[s.a]}+${ELEMENT_NAME[s.b]}`, icon: 'glyph:' + spellOfEl[s.a], lines: [`${s.desc}.`, `Active while both magics are Lv${SYNERGY_MIN_LEVEL}+.`] });
  // ---------- Spirits ----------
  { const S = SPIRIT; const sp = (id: string, name: string, tag: string, lines: string[]) => add({ id: 'spirit:' + id, tab: 'spirits', name, tag, icon: 'glyph:spirit', lines });
    sp('roles', 'Spirit Roles', 'Rules', [`Each Spirit pick adds a spirit (max ${MAX_SPIRITS} from the magic; artifacts add more). Spirits take roles by order: Guardian, Hunter, Guardian, Hunter…`, `At ${S.MENDER_AT}+ spirits the first becomes a Mender; at ${S.BEACON_AT}+ the second becomes a Beacon.`]);
    sp('guardian', 'Guardian', 'Role', [`Orbits close (${S.GUARD_R}px) and destroys enemy projectiles that touch it (${S.BLOCK_R}px).`]);
    sp('hunter', 'Hunter', 'Role', [`Orbits wide (${S.HUNT_R}px) and dives at a demon within ${S.HUNT_RANGE}px every ${S.HUNT_EVERY}s.`]);
    sp('mender', 'Mender', `Role · ${S.MENDER_AT}+ spirits`, [`Heals ${(S.MENDER_HPS * 100).toFixed(1)}% of max HP per second while hurt and pulls loot within ${S.MENDER_MAGNET}px.`]);
    sp('beacon', 'Beacon', `Role · ${S.BEACON_AT}+ spirits`, [`Projects a ${S.BEACON_R}px aura: demons inside move ${Math.round(S.BEACON_SLOW * 100)}% slower and take ${Math.round(S.BEACON_DPS * 100)}% of spirit damage per second.`]);
    sp('surge', 'Spirit Surge', 'HUD button', [`Every spirit dives at a different demon for ×${S.SURGE_MUL} damage and clears enemy shots within ${S.SURGE_CLEAR_R}px.`, `Cooldown ${S.SURGE_CD}s (×${S.ASC_SURGE_CD[1]} at Ascension I, ×${S.ASC_SURGE_CD[2]} at Ascension II); the ring on the button shows it.`]);
    sp('buffs', 'Swarm Blessings', 'Passive', [`+${Math.round(S.BUFF_DMG_PER2 * 100)}% damage to all magic per 2 spirits.`, `-${Math.round(S.BUFF_DR_PER3 * 100)}% damage taken per 3 spirits (max 30%).`]);
    sp('save', 'Spirit Save', `Passive · ${S.SAVE_MIN}+ spirits`, [`A lethal hit is taken by a spirit instead: you return at ${Math.round(S.SAVE_HP * 100)}% HP and nearby demons are pushed away.`, `Once every ${S.SAVE_CD}s; the lost spirit regrows after ${S.SAVE_REGROW}s.`]);
    sp('formation', 'Wing Formation', 'Flight', ['While you fly, spirits hold a V of wings behind you instead of orbiting.']);
    sp('ascension', 'Ascension', `${S.ASCEND_1} & ${S.ASCEND_2} spirits`, [`Ascension I at ${S.ASCEND_1} spirits: spirit damage ×${S.ASC_DMG[1]}, bigger Mender/Beacon effects.`, `Ascension II at ${S.ASCEND_2} spirits: spirit damage ×${S.ASC_DMG[2]}, golden swarm, Surge cooldown halved.`]);
  }
  // ---------- Artifacts ----------
  for (const a of ARTIFACTS) add({ id: 'art:' + a.id, tab: 'artifacts', name: a.name, tag: a.rarity, icon: 'art:' + a.id, lines: Array.from({ length: a.max }, (_, i) => `Lv${i + 1}: ${a.desc(i + 1)}`), stats: [['Rarity', a.rarity], ['Max', `${a.max}`]] });
  // ---------- Bestiary ----------
  for (const [t, d] of Object.entries(ENEMY_DEFS)) add({ id: 'enemy:' + t, tab: 'bestiary', name: d.name, tag: d.flying ? 'Flying' : d.shot ? 'Ranged' : 'Ground', icon: 'enemy:' + t, lines: [
    `${d.desc}${d.armor ? ` Armor blocks ${Math.round(d.armor * 100)}%.` : ''}`, `Region: ${d.region}.`,
    d.flying ? 'Can reach you while you fly.' : d.shot && !d.shot.ground ? 'Its shots hit you in the air.' : 'Cannot touch you while you fly.',
  ], stats: [['HP', `${d.hp}`], ['Damage', `${d.dmg}`], ['Speed', `${d.speed}`], ...(d.shot ? [['Shot', `every ${d.shot.every} s`] as [string, string]] : [])] });
  // ---------- World ----------
  REGIONS.forEach((r, i) => add({ id: 'region:' + r.id, tab: 'world', name: r.name, tag: `Region ${i + 1}`, icon: 'region:' + r.color, lines: [
    `Survive ${fmtTime(r.duration)}, then defeat ${r.boss.name} (${r.boss.hp.toLocaleString('en-US')} HP).`,
    `Hazard: ${r.hazard.name} every ${r.hazard.every} s (${r.hazard.dmg} dmg${r.hazard.air ? ', hits flyers' : ', ground only'}).`,
    `Demons: ${r.roster.map(([t]) => ENEMY_DEFS[t]?.name ?? t).join(', ')}. Flying packs: ${(REGION_PACKS[i] ?? []).map((t) => ENEMY_DEFS[t]?.name ?? t).join(', ')}.`,
  ], stats: [['Duration', fmtTime(r.duration)], ['Boss HP', r.boss.hp.toLocaleString('en-US')]] }));
  for (const s of Object.values(SCENES)) add({ id: 'scene:' + s.kind, tab: 'world', name: s.name, tag: 'Cataclysm scene', icon: 'region:' + s.color, lines: [
    `${s.sub}.`, `Lasts ${T.CATA_SCENE} s. Hazard: ${s.hazard.name.toLowerCase()} every ${s.hazard.every} s (${s.hazard.dmg} dmg).`,
    `Reached by: ${s.kind === 'sky' ? 'soaring' : s.kind === 'rift' ? 'hovering' : 'standing on the ground'} when the meter fills.`,
    `Demons: ${s.roster.map(([t]) => ENEMY_DEFS[t]?.name ?? t).join(', ')}.`,
  ] });
  add({ id: 'world:ibg', tab: 'world', name: 'Living Background', tag: 'Interactive', icon: 'glyph:pass_magnet', lines: [
    'Far star-motes drift against your movement (parallax) and spread out as you fly higher.',
    `Walk into scenery to ring it (+${IBG.REWARD_XP} XP); hit it with spells to shatter it (+${IBG.REWARD_GOLD} gold). Props regrow after ${IBG.REGROW} s.`,
    `Rewards are capped at ${IBG.REWARD_CAP_PER_MIN} per minute. Every cast sends a tinted wave through the background.`,
    'A quick tap on the field makes a ripple; dragging still moves the joystick. Toggle in Settings → Interactive Background.',
    `Sets: ${Object.values(IBG_SETS).map((b) => `${b.name} (${b.props.map((p) => p.name).join(', ')})`).join('; ')}.`,
  ] });
  // ---------- Research ----------
  for (const a of INITIAL_RESEARCH_ATTRIBUTES) add({ id: 'research:' + a.id, tab: 'research', name: a.name, tag: 'Altar', icon: 'glyph:pass_power', lines: [a.description, `+${a.bonusPerRank}${a.bonusUnit} per rank, up to ${a.maxRank} ranks.`], stats: [['Per rank', `+${a.bonusPerRank}${a.bonusUnit}`], ['Max', `${a.maxRank}`]] });
  for (const f of extra) out.push(...f());
  return out;
}
