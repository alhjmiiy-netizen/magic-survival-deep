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

## v3 — flat 2D heroes + title fix
- In-game hero sprites (`Visuals.ts` `getHeroSprite`) redrawn as flat 2D cartoon: solid fills, ~1.7 world-unit ink outlines (`#120c18`), one flat clipped cel-shadow per part (`shadeOf`), no gradients. Caelen now uses the same flat path (`CAELEN_LOOK`; old `getMage` kept unused). Still cached per hero+view offscreen; 8-dir facing, float/bob, trail, hitbox unchanged.
- Removed the soft body aura glow per frame; weapon glow slightly reduced (r 22→20, a .95→.8). Aura ring/ground circle unchanged. Enemies/bosses/spells/arena/menu art untouched.
- Debug hook `globalThis.__msHero(ctx,x,y,faceAngle,heroId)` for sprite contact sheets (`/tmp/heroes2d.cjs`).
- Main-menu title: moved inside the art panel (right: max(15vw,50px); landscape 140px), font min(56px,13vw)/min(30px,7.2vw), glyph padding + light halo so it never clips at 360–412 portrait or 844x390.
- QA note: `qa/deep.js` times out waiting for `[data-modal="chest"]` (also on the pre-v3 live build — script drift, not a regression); endless.js and deep-live.js pass with 0 errors.

## Fix: Altar research resets (2026-11-03 PST)
- Root cause: `UpgradeModal` kept ranks/points in component-local `useState(INITIAL_RESEARCH_ATTRIBUTES)` / `useState(3)`, nothing saved to localStorage, so every reopen/reload re-initialised to defaults. Gold was also run-local (engine started from `INITIAL_PLAYER_STATS.gold = 0`), so spent gold/bought points vanished and research never applied at run start.
- Fix: `src/game/research.ts` — `ms_research_v1` {points, ranks, gold}; loaded on modal mount and app start, saved synchronously on every enhance/reset/buy; `applyResearch` applies purchased ranks (delta vs defaults: might/vitality/haste/snipe/agility/explorer/saturation) + gold wallet at engine init; App saves gold on change. Load merges/clamps (no wipe on unknown/partial data). No previous save existed to migrate.
- Regression: `qa/research-persist.js <url> <shotdir> <tag>` (390x844 touch): buy point + 4 enhances, close/reopen, run start (effects + gold), reload.

## v4 — Flight, new enemies, fusions, charge, spirits, glyphs
- Flight: wing button / F key. Meter 6 s, recharge 1.5/s, forced landing locks 2.5 s. Airborne: ground enemies, ground shots and ground hazards can't touch you; spells hit +15%. Flyers (wisps, bats, etc.) still can.
- 16 enemy types in ENEMY_DEFS (swarm, ranged, lobber, summoner, exploder, charger, teleporter, splitter, armored). Packs every 20 s, elites (x5 hp) every 45 s, and elites always drop a chest.
- Fusions (10) when spells of different elements are cast within 1.2 s (4 s cooldown); steam zones; hold a spell tile to charge it (up to 1.5 s).
- Spirit is a level-up spell (up to 12 spirits). Etched MagicGlyph icons everywhere (qa/icons.html sheet). Bestiary tab.
- QA: qa/v4.cjs <url> <vw> <vh> <tag>.

## Round 5 (Nov 3 2026)
- Free flight: Ground/Hover/Soar (FLY/SOAR/LAND button, F key), no meter; soar zooms out (~0.87); beyond-circle world to 2.6x arena radius; landing outside eases back to R-90 ("PULLED BACK TO THE CIRCLE"); far enemies (>1700px) despawn; shots die >1400px.
- Cataclysm (src/game/cataclysm.ts): meter from fusions/steam/synergy/combo/charge -> crack -> collapse -> scene by altitude (ground=Abyss, hover=Rift w/ Rift Sovereign elite, soar=Sky), 65s, reward chest, re-form, 150s cooldown; blocked during bosses/modals. Debug: __engine.triggerCataclysm(kind?).
- SFX (src/audio/sfx.ts + soundEngine buildChain w/ compressor+limiter): 24 synth recipes; dev-only window.__sfxm for offline renders (/tmp/sfx.cjs -> deploy/magic-deep-shots/sfx/*.wav).
- Artifacts: 33, rarity-weighted 3-card chests, wooden ground chests, boss chest "SELECT ATTRIBUTE"; pause screen lists held artifacts.
- QA: node qa/v5.cjs <url> <w> <h> <tag>.

## v6 round (Nov 3 2026)
- Perf: crowded LOD, glow/particle budgets, dynamic render scale, endless cap 150(+10). Endless m30 task 169→80 ms/frame (fps 2.7→7 headless swiftshader); regions m30 74.6→25.4 ms (5.3→15.3 fps). qa/results/perf-v6.md.
- Encyclopedia: codex generated from tuning.ts constants (112+ entries, pair matrix). qa/codex.cjs.
- Interactive background (toggle in settings). qa/ibg.cjs.
- All-pairs combos: 10 element pairs (FUSIONS in tuning.ts), each its own effect, sound pair_<key>, 4 s per-pair cooldown (minus fusion_core), cataclysm meter +22, HUD cata-feed, Pair Combos screen with live cooldown rings. qa/combos.cjs.
- Spirit roles (game/spiritRoles.ts, SPIRIT constants): guardians (block shots within 24px), hunters (dart at enemies within 280px every 1.1 s), Mender at 3+ (heal 0.6% max hp/s + loot magnet 240), Beacon at 5+ (170px aura, 45% slow, dmg ticks). Surge HUD button (18 s cd, x2.5, clear radius 260, cooldown ring). Buffs +4% dmg per 2 spirits, 3% DR per 3. Lethal-hit save at 4+ spirits (sacrifice one, 35% hp, 90 s cd, regrow 30 s). Wing formation while flying. Ascension I/II at 8/12 (dmg x1.25/x1.5, surge cd x0.8/x0.5). Level-up text names the unlock. qa/spirits.cjs (12 spirits + 120 enemies ≈ 28–33 fps headless).
- qa/v4.cjs forced-landing check retired (free flight since v5 has no meter).
- Final soak: qa/results/soak-v6-final.json (endless 20 min, 0 errors, heap 30→34 MB).
