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
