# Magic Survival: Deep

Live: https://alhjmiiy-netizen.github.io/magic-survival-deep/ (GitHub Pages, `main` = dist + .nojekyll; `source` = sources)

Forked from Wtf-rebuild (`source` @ 2becf52); art, hero sprites, cards, joystick, MAGIC · AUTO-CAST bar, and ITEMS row are unchanged.

## Features
- **Evolutions** (Lv5 → tier 1, Lv8 → final form; ★ EVOLVE card first in level-ups and chests; HUD tile gets a gold frame, glow and ★/★★)
  - Thunder: Storm Lord (chain 2) → Judgement Tempest (chain 4 + stun)
  - Frost: Glacial Lances (pierce 3) → Absolute Zero (freezes a huge radius)
  - Fire: Meteor Fall (burning ground) → Inferno Apocalypse
  - Arcane: Phantom Blades (pierce 3) → Astral Swarm (splits on hit)
- **Synergies** (both elements Lv3+; toast and HUD panel): Plasma Overload, Chain Freeze, Thermal Shock, Hex Flames, Prism Frost, Arc Conduit
- **Artifacts** (9; from boss chests, region-clear chests, 7% of void-knight elite kills; RELICS row with level badge and tap tooltip): Eye of Ruin, Hourglass of Ages, Lodestone Heart, Titan's Blood, Phoenix Feather (revive), Split Prism, Giant's Sigil, Slayer's Brand, Ember Crown
- **Regions** (5 × 3:00, each with its own arena/theme, roster, hazard and boss; a reward chest on clear, then the next region, and endless after region 5): Astral Sanctuary / Void Rifts / Rift Warden; Glacial Citadel / Frost Fields (slow) / Frost Behemoth; Infernal Abyss / Magma Eruptions / Magma Tyrant; Void Crypt / Blood Rain Sigils / Crypt Lich; Celestial Throne / Solar Flares / Void Colossus Titan
- **Endless**: scaling hp/dmg/speed/spawn/cap, a boss every 2:00, themes rotating through the regions, a score, and a best record (`localStorage msdeep_best_v1`)
- **Persistence/UX**: last mode saved (`msdeep_mode`), best records shown on the menu, pause button, PWA SW (skipWaiting/clientsClaim, cacheId magic-survival-deep-v1), ErrorBoundary with Reload, particle/projectile/damage-number/zone caps
- **Debug**: `window.__engine` exposes `evolveSpell`, `grantArtifact`, `skipToRegion(i, bossNow)`, `startEndless`, `openChest`, `fps()`

## QA
`qa/deep.js` (all features), `qa/endless.js` (real-time endless run), `qa/deep-live.js` (live smoke test plus rAF FPS)
