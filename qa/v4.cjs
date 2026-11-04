const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, vw, vh, tag] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const res = {}; const W = (p, ms) => p.waitForTimeout(ms);
async function clearModals(p) { for (let i = 0; i < 6; i++) { const m = await p.$('[data-modal="levelup"] [data-choice], [data-modal="chest"] [data-choice]'); if (!m) break; await m.click(); await W(p, 150); } }
const E = (p, f, a) => p.evaluate(f, a);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: +vw, height: +vh }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 800);
  await p.locator('[data-action="start"]').tap(); await p.locator('[data-mode="regions"]').tap();
  await p.waitForSelector('[data-modal="startspell"]');
  res.startChoices = await p.$$eval('[data-modal="startspell"] [data-choice]', e => e.map(x => x.getAttribute('data-choice')));
  await p.locator('[data-choice="cataclysm"]').tap(); await W(p, 1200);
  await E(p, () => { __engine.learnSpell('frost_nova'); __engine.learnSpell('thunderstorm'); __engine.learnSpell('arcane_missiles'); __engine.stats.maxHp = 5000; __engine.stats.hp = 5000; __engine.stats.maxXp = 1e9; });
  await W(p, 600);
  res.hint = await p.$eval('[data-hud="flight-hint"]', e => e.textContent).catch(() => null);
  await p.screenshot({ path: S('flight-button') });
  // --- immunity test: ground crawlers stacked on player
  const hpTest = async (type, fly) => {
    await E(p, ([t, f]) => { __engine.clearEnemies(); __engine.setFlight?.(f); __engine.toggleFlight(f); __engine.flightMeter = 6; __engine.stats.hp = 3000; __engine.stats.mana = 0; for (let i = 0; i < 5; i++) { const id = __engine.spawnEnemy(t, 4, 4, false); const e = __engine.enemies.find(x => x.id === id); e.speed = 0; e.hp = e.maxHp = 1e9; } }, [type, fly]);
    await W(p, 700);
    const h0 = await E(p, () => { __engine.stats.mana = 0; return __engine.stats.hp; }); await W(p, 1000);
    return await E(p, (h0) => ({ drop: Math.round(h0 - __engine.stats.hp), air: __engine.flightState().airborne }), h0);
  };
  await E(p, () => { __engine.spells.forEach(s => s.currentCooldown = 999); });
  res.immunity = { crawlerGround: await hpTest('crawler', false), crawlerAir: await hpTest('crawler', true), wispAir: await hpTest('astral_wisp', true) };
  await E(p, () => { __engine.clearEnemies(); __engine.toggleFlight(false); __engine.flightMeter = 6; __engine.spells.forEach(s => s.currentCooldown = 0); });
  await W(p, 1500);
  // --- take off via HUD button
  await clearModals(p); await p.locator('[data-hud="flight"]').tap(); await W(p, 500);
  await E(p, () => { for (const [t, dx, dy] of [['crawler',150,40],['hellhound',-160,60],['ice_golem',120,-120],['astral_wisp',-120,-100],['magma_bomber',200,120],['shadow_fiend',-220,10]]) __engine.spawnEnemy(t, dx, dy); });
  await W(p, 700);
  res.flightAfterTap = await E(p, () => __engine.flightState());
  await p.screenshot({ path: S('hovering') });
  await W(p, 900);
  res.beamsSeen = 0;
  for (let i = 0; i < 12; i++) { const n = await E(p, () => __engine.beams.length + __engine.projectiles.filter(q => (q.z ?? 0) > 1).length); if (n > res.beamsSeen) { res.beamsSeen = n; await p.screenshot({ path: S('raining-spells') }); } await W(p, 120); }
  res.meterMid = await E(p, () => __engine.flightState());
  await p.screenshot({ path: S('meter') });
  res.forcedLanding = 'obsolete since v5 (free flight, no meter)';
  res.meterForced = await E(p, () => ({ ...__engine.flightState(), log: __engine.flightLog.slice(-3) }));
  await p.screenshot({ path: S('forced-landing') });
  await W(p, 800);
  res.retryDuringLock = await E(p, () => __engine.toggleFlight(true));
  await W(p, 2200);
  res.afterLock = await E(p, () => __engine.flightState());
  // --- keyboard F
  await E(p, () => { __engine.toggleFlight(false); __engine.flightMeter = 6; __engine.flightLock = 0; });
  await p.keyboard.press('f'); await W(p, 200); res.keyF = await E(p, () => __engine.flying); await p.keyboard.press('f'); await W(p, 900); res.keyF2 = await E(p, () => __engine.flightState());
  // --- pause respects flight
  await E(p, () => { __engine.toggleFlight(true); __engine.pause(); }); const m0 = await E(p, () => __engine.flightMeter); await W(p, 800); res.pauseMeter = [m0, await E(p, () => __engine.flightMeter)]; await E(p, () => { __engine.resume(); __engine.toggleFlight(false); });
  // --- fusion: fire then ice -> Steam Burst
  await E(p, () => { __engine.clearEnemies(); for (let i = 0; i < 10; i++) __engine.spawnEnemy('crawler', 140 + (i%5)*16, (i>>1)*14 - 30); __engine.fusionCd = 0; __engine.lastCast = null; __engine.noteCastForFusion('cataclysm'); __engine.noteCastForFusion('frost_nova'); });
  await W(p, 250);
  res.fusion = await E(p, () => ({ log: __engine.fusionLog, labels: __engine.labels.map(l => l.text), steam: __engine.zones.filter(z => z.steam).length }));
  await p.screenshot({ path: S('combo') });
  await W(p, 700);
  res.steamSlow = await E(p, () => { const z = __engine.zones.find(z => z.steam); if (!z) return null; const id = __engine.spawnEnemy('crawler', z.x - __engine.playerX, z.y - __engine.playerY); return { z: { x: z.x, y: z.y }, id }; });
  await p.screenshot({ path: S('steam') });
  await E(p, () => { __engine.fusionCd = 0; __engine.lastCast = null; __engine.noteCastForFusion('thunderstorm'); __engine.noteCastForFusion('arcane_missiles'); });
  res.fusion2 = await E(p, () => __engine.fusionLog);
  // --- charge via tile hold
  await E(p, () => { __engine.clearEnemies(); for (let i = 0; i < 8; i++) __engine.spawnEnemy('hellhound', 160 + i * 10, -40 + i * 12); __engine.toggleFlight(true); __engine.flightMeter = 6; });
  await clearModals(p); const tileBox = await p.locator('[data-power="cataclysm"]').boundingBox();
  await p.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + 20); await p.mouse.down(); await W(p, 1000);
  res.chargeMid = await E(p, () => __engine.chargeProgress());
  await p.screenshot({ path: S('charge') });
  await W(p, 700); await p.mouse.up(); await W(p, 120);
  res.chargeLog = await E(p, () => __engine.chargeLog);
  await p.screenshot({ path: S('charge-release') });
  await W(p, 300); await p.screenshot({ path: S('trail') });
  // --- frame time during flight + many enemies
  await E(p, () => { __engine.frameTimes.length = 0; __engine.spawnPack(); __engine.spawnPack(); });
  await W(p, 3000);
  res.fpsFlight = await E(p, () => ({ fps: __engine.fps(), enemies: __engine.enemies.length, shots: __engine.enemyShots.length }));
  // --- spirits via level-up
  await E(p, () => { __engine.toggleFlight(false); __engine.clearEnemies(); });
  for (const n of [1, 3, 8]) {
    await E(p, (n) => { const s = __engine.spells.find(x => x.id === 'spirit'); const have = s ? s.level : 0; if (!s) __engine.learnSpell('spirit'); for (let i = Math.max(1, have); i < n; i++) __engine.levelSpell('spirit'); for (let i = 0; i < 8; i++) __engine.spawnEnemy('crawler', 220 * Math.cos(i), 220 * Math.sin(i)); }, n);
    if (n === 3) await E(p, () => { __engine.toggleFlight(true); __engine.flightMeter = 6; });
    await W(p, 1800);
    res['spirits' + n] = await E(p, () => ({ n: __engine.spirits.length, log: __engine.spiritLog, hud: document.querySelector('[data-power="spirit"]')?.textContent }));
    await p.screenshot({ path: S('spirit-swarm-' + n) });
  }
  await E(p, () => __engine.toggleFlight(false));
  // --- level-up with spirit card
  await E(p, () => { __engine.clearEnemies(); __engine.addXp(__engine.stats.maxXp + 5); });
  await p.waitForSelector('[data-modal="levelup"]', { timeout: 4000 }).catch(() => {});
  res.levelupCards = await p.$$eval('[data-modal="levelup"] [data-choice]', e => e.map(x => x.getAttribute('data-choice')));
  await p.screenshot({ path: S('levelup') });
  await clearModals(p); await W(p, 400);
  // --- spirit level-up card (fresh spell list without spirit to guarantee offer)
  for (let k = 0; k < 8; k++) {
    await E(p, () => { __engine.spells = __engine.spells.filter(s => s.id !== 'spirit' && s.id !== 'arcane_missiles'); __engine.addXp(__engine.stats.maxXp + 5); });
    await p.waitForSelector('[data-modal="levelup"]', { timeout: 4000 }).catch(() => {});
    const c = await p.$$eval('[data-modal="levelup"] [data-choice]', e => e.map(x => x.getAttribute('data-choice')));
    if (c.some(x => x.includes('spirit'))) { res.spiritCard = c; await p.screenshot({ path: S('spirit-levelup') }); await p.locator('[data-choice*="spirit"]').first().click(); await W(p, 300); break; }
    await clearModals(p);
  }
  res.spiritPicked = await E(p, () => __engine.spells.find(s => s.id === 'spirit')?.count ?? 0);
  await clearModals(p);
  // --- enemy contact sheet (paused)
  await E(p, () => { __engine.clearEnemies(); __engine.setPlayerPos(0, 0); const T = ['astral_wisp','star_archer','ice_golem','frost_spitter','magma_bomber','fire_imp','lava_charger','crypt_phantom','bone_summoner','void_ooze','sun_seraph','radiant_sentinel']; T.forEach((t, i) => { const c = i % 6, r = Math.floor(i / 6); const id = __engine.spawnEnemy(t, (c - 2.5) * 110, -70 + r * 150); }); });
  await W(p, 120); await E(p, () => __engine.pause()); await W(p, 200);
  await p.screenshot({ path: S('enemy-sheet') });
  await E(p, () => { __engine.resume(); __engine.clearEnemies(); __engine.spawnEnemy('ice_golem', 140, 0, true); __engine.spawnEnemy('hellhound', -140, 20, true); __engine.spawnEnemy('sun_seraph', 0, -140, true); });
  await W(p, 500);
  res.elites = await E(p, () => __engine.enemySnapshot().filter(e => e.elite).map(e => e.type + ':' + e.maxHp));
  await p.screenshot({ path: S('elite') });
  // --- splitter / exploder / summoner behaviours
  await E(p, () => { __engine.clearEnemies(); const id = __engine.spawnEnemy('void_ooze', 60, 0); const e = __engine.enemies.find(x => x.id === id); e.hp = 1; __engine.damageEnemy(e, 50, '#fff'); });
  await W(p, 200); res.splitter = await E(p, () => __engine.enemySnapshot().filter(e => e.type === 'void_ooze').map(e => e.small));
  await E(p, () => { __engine.clearEnemies(); __engine.spells.forEach(s => s.currentCooldown = 99); __engine.stats.hp = 3000; __engine.stats.mana = 0; __engine.spawnEnemy('magma_bomber', 40, 0); });
  await W(p, 1500); res.bomber = await E(p, () => ({ hp: __engine.stats.hp, bombers: __engine.enemies.filter(e => e.type === 'magma_bomber').length }));
  await E(p, () => { __engine.clearEnemies(); __engine.spawnEnemy('star_archer', 260, 0); __engine.spawnEnemy('frost_spitter', -240, 0); });
  await W(p, 3500); res.shotsSeen = await E(p, () => __engine.enemyShots.map(s => s.src + (s.ground ? ':ground' : ':air')));
  await E(p, () => __engine.spells.forEach(s => s.currentCooldown = 0));
  // --- regions
  res.regions = [];
  for (let i = 0; i < 5; i++) {
    await E(p, (i) => { __engine.skipToRegion(i, false); __engine.stats.hp = __engine.stats.maxHp; __engine.spawnPack(); }, i);
    await W(p, 1800); await clearModals(p);
    res.regions.push(await E(p, () => ({ r: __engine.region.name, n: __engine.enemies.length, types: [...new Set(__engine.enemies.map(e => e.type))] })));
    await p.screenshot({ path: S('region-' + (i + 1)) });
  }
  // --- endless + death resets flight
  await E(p, () => { __engine.startEndless(); __engine.toggleFlight(true); });
  await W(p, 800); res.endless = await E(p, () => ({ endless: __engine.inEndless, fly: __engine.flying }));
  await E(p, () => { __engine.stats.hp = -1; __engine.handlePlayerDeath(); });
  await W(p, 400); res.afterDeath = await E(p, () => __engine.flightState());
  // --- Grimoire bestiary
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 600);
  const gb = await p.$('[data-nav="grimoire"]'); res.grimBtn = !!gb;
  if (gb) { await gb.click(); await W(p, 500); const t = await p.$('[data-tab="bestiary"]'); if (t) { await t.click(); await W(p, 500); res.bestiary = await p.$$eval('img[data-enemy]', e => e.length); await p.screenshot({ path: S('bestiary') }); } }
  res.errs = errs.slice(0, 10);
  console.log(JSON.stringify(res, null, 1)); await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
