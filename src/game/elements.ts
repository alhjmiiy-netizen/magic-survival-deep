/** v7: the ten magic elements. Pure data (no DOM) so sfx, UI, codex and tests can share it. */
export const ELEMENTS = ['fire', 'ice', 'lightning', 'arcane', 'spirit', 'poison', 'wind', 'earth', 'water', 'light'] as const;
export type AnyElement = typeof ELEMENTS[number];
export const EL_NAME: Record<string, string> = { fire: 'Fire', ice: 'Ice', lightning: 'Lightning', arcane: 'Arcane', spirit: 'Spirit', poison: 'Poison', wind: 'Wind', earth: 'Earth', water: 'Water', light: 'Light' };
export const EL_COLOR: Record<string, string> = { fire: '#f97316', ice: '#38bdf8', lightning: '#facc15', arcane: '#a855f7', spirit: '#2dd4bf', poison: '#84cc16', wind: '#a7f3d0', earth: '#b45309', water: '#2563eb', light: '#fef3c7' };
/** "r,g,b" for zones / glows */
export const EL_RGB: Record<string, string> = { fire: '249,115,22', ice: '56,189,248', lightning: '250,204,21', arcane: '168,85,247', spirit: '45,212,191', poison: '132,204,22', wind: '167,243,208', earth: '180,83,9', water: '37,99,235', light: '254,243,199' };
export const pairKey = (a: string, b: string) => [a, b].sort().join('+');
/** all 45 unordered pairs */
export const ALL_PAIRS: string[] = (() => { const o: string[] = []; for (let i = 0; i < ELEMENTS.length; i++) for (let j = i + 1; j < ELEMENTS.length; j++) o.push(pairKey(ELEMENTS[i], ELEMENTS[j])); return o; })();
