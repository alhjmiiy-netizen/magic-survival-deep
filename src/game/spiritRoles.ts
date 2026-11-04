/** v6 spirit roles. Roles are assigned by spirit index as the swarm grows. */
export type SpiritRole = 'guardian' | 'hunter' | 'mender' | 'beacon';
export const SPIRIT = {
  MENDER_AT: 3, BEACON_AT: 5, ASCEND_1: 8, ASCEND_2: 12,
  GUARD_R: 46, HUNT_R: 96, BLOCK_R: 24, HUNT_RANGE: 280, HUNT_EVERY: 1.1,
  MENDER_HPS: 0.006, MENDER_MAGNET: 240, // heals 0.6% max HP/s, pulls loot within 240
  BEACON_R: 170, BEACON_SLOW: 0.45, BEACON_DPS: 0.35, // enemies in aura move at 55% speed and take 35% of spirit dmg per s
  SURGE_CD: 18, SURGE_MUL: 2.5, SURGE_CLEAR_R: 260,
  BUFF_DMG_PER2: 0.04, BUFF_DR_PER3: 0.03, // +4% all magic damage per 2 spirits, -3% damage taken per 3 spirits
  SAVE_MIN: 4, SAVE_CD: 90, SAVE_HP: 0.35, SAVE_REGROW: 30,
  ASC_DMG: [1, 1.25, 1.5], ASC_SURGE_CD: [1, 0.8, 0.5],
};
export const ROLE_COLOR: Record<SpiritRole, string> = { guardian: '#60a5fa', hunter: '#f87171', mender: '#4ade80', beacon: '#facc15' };
export const ROLE_NAME: Record<SpiritRole, string> = { guardian: 'Guardian', hunter: 'Hunter', mender: 'Mender', beacon: 'Beacon' };
export function spiritRole(i: number, n: number): SpiritRole {
  if (n >= SPIRIT.MENDER_AT && i === 0) return 'mender';
  if (n >= SPIRIT.BEACON_AT && i === 1) return 'beacon';
  return i % 2 === 0 ? 'guardian' : 'hunter';
}
export function ascension(n: number) { return n >= SPIRIT.ASCEND_2 ? 2 : n >= SPIRIT.ASCEND_1 ? 1 : 0; }
export function spiritBuffs(n: number) { return { dmg: 1 + SPIRIT.BUFF_DMG_PER2 * Math.floor(n / 2), dr: Math.min(0.3, SPIRIT.BUFF_DR_PER3 * Math.floor(n / 3)) }; }
/** Text naming what reaching n spirits unlocks (shown on level-up cards). */
export function spiritUnlockText(n: number): string {
  if (n === 1) return 'First Guardian: blocks enemy shots';
  if (n === 2) return 'Unlocks Hunter: chases demons';
  if (n === SPIRIT.MENDER_AT) return 'Unlocks Mender: heals you + pulls loot';
  if (n === SPIRIT.SAVE_MIN) return 'Unlocks Spirit Save: a spirit takes a lethal hit';
  if (n === SPIRIT.BEACON_AT) return 'Unlocks Beacon: slowing aura';
  if (n === SPIRIT.ASCEND_1) return 'ASCENSION I: spirits +25% dmg, faster Surge';
  if (n === SPIRIT.ASCEND_2) return 'ASCENSION II: spirits +50% dmg, Surge cd halved';
  return `+1 ${n % 2 ? 'Guardian' : 'Hunter'}`;
}
