# Rebuild notes
- [x] copied
- [x] node_modules copied via cp -a (tar --exclude=dist had broken lucide-react)
- [x] Task 3 hero imports in characters.ts; Task 4 HUD hero prop (App passes currentHero); Task 5 stats in constants.ts (INITIAL + BOSS_TEST_*), engine/App use them
- [x] screenshot removed (public/assets/aistudio deleted, MainMenu gradient bg)
- [ ] next: src/game/ArtKit.ts (glow sprites, rng), ArenaRenderer rewrite in arenas.ts, Visuals.ts rewrite, FX.ts, engine renderBackdrop
- [x] arena renderer done (arenas.ts + ArtKit.ts), vite base './', manifest relative, .nojekyll in public
- PERF: shadowBlur is the swiftshader killer (1500ms->30ms/frame). Removed from engine/weather; never use in Visuals. QA scripts in /workspace/qa (serve.sh, shot.js, base2.js, prof.js)
- [x] Visuals.ts rewritten (sprites), FX.ts, engine wired (projectiles/particles/FX hooks). next: visual iteration
- [x] QA: 844x390 + 390x844 touch, 0 console errors, 0 4xx; frame avg ~28-42ms (swiftshader). Boss spawn moved to (250,-150), boss hp 90000 (still dies in seconds vs lvl-8 evolved spells).
- [x] deployed: https://alhjmiiy-netizen.github.io/magic-survival-rebuild/ (main=dist, source branch=src)

## Round 2 (Nov 2 2026, user phone bug report)
- [x] 1 HUD redesign: HUD.tsx rewritten with orientation-aware absolute blocks (stats, timer, currency+pause, radar, powers strip, collapsible quests (collapsed by default), utility col, belt, joystick, dash). Banners moved to 32%/60%. Playwright rect check: 0 overlaps both orientations (qa/overlap.js).
- [x] 2+6 facing/float: Visuals.getMage(view front/side/back), dir8(), renderArchmage(faceAngle, moveAmt): hover lift+bob, shrinking ground shadow, lean, cloak afterimage trail. Engine faceAngle smoothed from last movement. Verified via qa/face.js crops (front/side/back differ). Enemies already face player.
- [x] 3 start spell select: StartSpellModal (LevelUpModal.tsx), engine paused + spells=[] until pick; boss test labelled, starts picked spell Lv5 + boosted stats (BOSS_TEST_PLAYER_STATS), boss hp 40000.
- [x] 4 passive magic: src/game/spells.ts (level-1 defs + applySpellLevel), engine autoCast with global stagger gap (0.35*0.75^n) and Fast Casting (cooldown *0.9^n); learnSpell/levelSpell/getUpgradeChoices/applyUpgrade; LevelUpModal driven by engine choices; manual cast removed; stats 100/5%/1.8x/0 CDR; early-wave enemy scaling.
- [x] 5 powers strip fed by onSpellsUpdate (+ Fast Casting chip).
- [x] 7 combos: engine.checkCombos uses canFormCombo (both Lv6) -> combo spell that casts both components boosted. QA: qa/flow.js.
- [x] SW: workbox skipWaiting/clientsClaim/cleanupOutdatedCaches, cacheId magic-survival-v2.

## Round 3 (2026-11-02 PST)
1. Floating joystick: full-screen touchpad under HUD (pointer capture, per-pointerId, R=52, deadzone 0.14, analog speed in engine). Fixed joystick removed. Dash fires on pointerdown so it works with a second finger. QA touch.js: base spawns at touch point, player moves R/L/U/D/diag at 844x390 & 390x844; HUD touch doesn't spawn it.
2. Magic bar: bottom-centre glass bar, 52px tiles, Lv badge, pips, cooldown ring (rAF via getCooldowns), tap = tooltip, toast + flash on learn/level. Items belt separate (right, above Dash, labelled ITEMS, potion icons + counts).
3. Cards: grid 2/4 cols, icon orb art, element frame, name + Lv badge, one-line effect (spellEffectText). Header visible and all cards in view at both sizes.
4. Polish: .glass-panel on menu tiles/bar, Research letter, level-up/start headers.
5. White screen: not reproduced (rapid level-ups, game over, quit-to-menu, 60s+ run all fine, heap ~8MB, 0 errors). Video looks like the browser/tab being killed. Hardening: ErrorBoundary recover screen, dark html background inline (no white flash on reload/SW update), stuck initial weather banner now clears.
