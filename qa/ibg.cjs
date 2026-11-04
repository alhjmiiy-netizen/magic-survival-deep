// Interactive background test. node qa/ibg.cjs <url> <tag>
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, tag = 'v6-ibg'] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const W = (p, ms) => p.waitForTimeout(ms); const E = (p, f, a) => p.evaluate(f, a);
async function fps(p, ms = 2500) { return E(p, (ms) => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }), ms); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 600 }, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 600);
  await p.locator('[data-action="start"]').click(); await p.locator('[data-mode="regions"]').click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="frost_nova"]').click(); await W(p, 800);
  await E(p, () => { const e = __engine; e.stats.maxHp = 1e9; e.stats.hp = 1e9; e.stats.maxXp = 1e12; e.clearEnemies(); });
  const R = {}; R.start = await E(p, () => __engine.ibgState());
  // touch: walk onto a prop
  R.touch = await E(p, () => { const e = __engine; const pr = e.ibg.propList().find((q) => q.down <= 0); const loot0 = e.lootItems.length; e.setPlayerPos(pr.x, pr.y); e.ibg.update(0.016, e.gameTimeSeconds, e.playerX, e.playerY, e.origin, e.ibgReward, e.ibgSfx); return { s: e.ibgState(), lootAdded: e.lootItems.length - loot0 }; });
  // spell hit: damage an enemy standing on a prop
  R.hit = await E(p, () => { const e = __engine; const pr = e.ibg.propList().find((q) => q.down <= 0); e.spawnEnemy('imp', pr.x - e.playerX, pr.y - e.playerY); const en = e.enemies[e.enemies.length - 1]; en.x = pr.x; en.y = pr.y; const b0 = e.ibg.log.breaks; e.damageEnemy(en, 1, '#fff', 'fire'); return { broke: e.ibg.log.breaks - b0, s: e.ibgState() }; });
  // reward cap: break everything repeatedly
  R.cap = await E(p, () => { const e = __engine; for (let k = 0; k < 6; k++) { for (const q of e.ibg.propList()) e.ibg.hitAt(q.x, q.y, 10, e.gameTimeSeconds, e.ibgReward, e.ibgSfx); e.ibg.props.forEach((q) => (q.down = 0)); } const s = e.ibgState(); return { rewardsLastMin: s.rewardsLastMin, capped: s.capped, cap: 8 }; });
  // magic reaction
  R.magic = await E(p, async () => { const e = __engine; const w0 = e.ibg.log.waves; for (const sp of e.spells) sp.currentCooldown = 0; e.castGapTimer = 0; e.spawnEnemy('imp', 120, 0); await new Promise((r) => setTimeout(r, 900)); return e.ibg.log.waves - w0; });
  await p.screenshot({ path: S('r1') });
  // tap ripple vs joystick drag (real touch input)
  const r0 = (await E(p, () => __engine.ibgState())).ripples;
  await p.touchscreen.tap(600, 380); await W(p, 120);
  const afterTap = await E(p, () => ({ rip: __engine.ibgState().ripples, joy: [__engine.joystickX ?? null, __engine.joystickY ?? null] }));
  await p.screenshot({ path: S('ripple') });
  const pos0 = await E(p, () => [__engine.playerX, __engine.playerY]);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 450, y: 300 }] });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 450 + i * 6, y: 300 }] }); await W(p, 40); }
  await W(p, 600); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await W(p, 100);
  const pos1 = await E(p, () => [__engine.playerX, __engine.playerY]);
  R.input = { ripplesFromTap: afterTap.rip - r0, ripplesFromDrag: (await E(p, () => __engine.ibgState().ripples)) - afterTap.rip, dragMovedPlayer: Math.round(pos1[0] - pos0[0]) };
  // HUD buttons still work: flight button tap must not make a ripple
  const rb = (await E(p, () => __engine.ibgState())).ripples; await p.locator('[data-hud="flight"]').tap(); await W(p, 300);
  R.input.buttonRipple = (await E(p, () => __engine.ibgState())).ripples - rb; R.input.flewAfterButton = await E(p, () => __engine.flightState().flying);
  await W(p, 900); await p.screenshot({ path: S('flying') });
  await E(p, () => __engine.toggleFlight(false));
  // sets per region + scenes
  R.sets = {};
  for (const i of [1, 2, 3, 4]) { await E(p, (i) => { __engine.skipToRegion(i); __engine.clearEnemies(); }, i); await W(p, 700); for (let k = 0; k < 4; k++) { const m = await p.$('[data-modal] [data-choice]'); if (!m) break; await m.click(); await W(p, 150); } R.sets['r' + (i + 1)] = (await E(p, () => __engine.ibgState())).set; await p.screenshot({ path: S('r' + (i + 1)) }); }
  for (const k of ['sky', 'abyss', 'rift']) { await E(p, (k) => { const e = __engine; e.cata.phase = 'idle'; e.cata.cooldown = 0; e.triggerCataclysm(k); }, k); await W(p, 4200); for (let j = 0; j < 4; j++) { const m = await p.$('[data-modal] [data-choice]'); if (!m) break; await m.click(); await W(p, 150); } R.sets[k] = (await E(p, () => ({ set: __engine.ibgState().set, phase: __engine.cata.phase }))); await p.screenshot({ path: S(k) }); }
  // FPS on vs off + toggle via Settings persistence
  await E(p, () => { const e = __engine; e.cata.phase = 'idle'; for (let i = 0; i < 60; i++) e.spawnEnemy('imp', Math.cos(i) * 300, Math.sin(i) * 300); });
  R.fpsOn = await fps(p);
  await E(p, () => { localStorage.setItem('msd.gfx.v1', JSON.stringify({ reducedEffects: false, interactiveBg: false })); });
  R.fpsOff = null;
  const mod = await E(p, async () => { const g = await import('/src/game/gfxSettings.ts'); g.setGfx('interactiveBg', false); await new Promise((r) => setTimeout(r, 300)); return __engine.ibgState(); });
  R.fpsOff = await fps(p); R.offState = { enabled: mod.enabled, gfx: mod.gfx };
  await E(p, async () => { const g = await import('/src/game/gfxSettings.ts'); g.setGfx('interactiveBg', true); });
  R.errs = errs;
  const ok = R.start.props > 0 && R.touch.lootAdded === 1 && R.hit.broke >= 1 && R.cap.rewardsLastMin <= 8 && R.cap.capped > 0 && R.magic >= 1 && R.input.ripplesFromTap === 1 && R.input.ripplesFromDrag === 0 && R.input.dragMovedPlayer > 0 && R.input.buttonRipple === 0 && R.input.flewAfterButton && R.sets.r3 === 'r3' && R.sets.sky.set === 'sky' && R.sets.abyss.set === 'abyss' && R.sets.rift.set === 'rift' && !R.offState.enabled && !errs.length;
  console.log(JSON.stringify({ ok, ...R }, null, 1)); await b.close(); process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
