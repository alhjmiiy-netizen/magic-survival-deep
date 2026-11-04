// Spirit roles test. node qa/spirits.cjs <url> [tag]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const fs = require('fs');
const [,, url, tag = 'v6-spirit-roles'] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const W = (p, ms) => p.waitForTimeout(ms); const E = (p, f, a) => p.evaluate(f, a);
async function fps(p, ms = 3000) { return E(p, (ms) => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }), ms); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 600);
  await p.locator('[data-action="start"]').click(); await p.locator('[data-mode="regions"]').click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="spirit"]').click(); await W(p, 600);
  await E(p, () => { const e = __engine; e.stats.maxHp = 1000; e.stats.hp = 1000; e.stats.maxXp = 1e12; e.clearEnemies(); });
  const R = { levels: {}, texts: {} };
  for (let lv = 1; lv <= 12; lv++) {
    if (lv > 1) { R.texts[lv] = await E(p, () => { const e = __engine; for (let k = 0; k < 30; k++) { const c = e.getUpgradeChoices(20).find((q) => q.id === 'lvl:spirit'); if (c) return c.desc; } return null; }); await E(p, () => __engine.levelSpell('spirit')); }
    await W(p, 120);
    R.levels[lv] = await E(p, () => { __engine.syncSpirits(); const s = __engine.spiritState(); return { n: s.n, roles: s.roles, asc: s.asc, dmg: +s.buffs.dmg.toFixed(2), dr: +s.buffs.dr.toFixed(2) }; });
    if ([3, 5, 8, 12].includes(lv)) await p.screenshot({ path: S('n' + lv) });
  }
  // guardian blocks: fire shots at the player
  R.block = await E(p, async () => { const e = __engine; e.clearEnemies(); const b0 = e.spiritStats.blocked; const hp0 = e.stats.hp;
    for (let k = 0; k < 40; k++) { const a = (k / 40) * 6.28; e.enemyShots.push({ x: e.playerX + Math.cos(a) * 200, y: e.playerY + Math.sin(a) * 200, vx: -Math.cos(a) * 160, vy: -Math.sin(a) * 160, dmg: 5, color: '#f00', ground: false, life: 0, r: 6, src: 'test' }); }
    await new Promise((r) => setTimeout(r, 2500)); return { shots: 40, blocked: e.spiritStats.blocked - b0, hpLost: Math.round(hp0 - e.stats.hp) }; });
  // hunters
  R.hunt = await E(p, async () => { const e = __engine; const h0 = e.spiritStats.hunts; for (let i = 0; i < 6; i++) e.spawnEnemy('imp', 150 + i * 20, 40); await new Promise((r) => setTimeout(r, 2500)); return { hunts: e.spiritStats.hunts - h0 }; });
  // mender heal + magnet
  R.mender = await E(p, async () => { const e = __engine; e.clearEnemies(); e.stats.hp = 500; const h0 = e.spiritStats.healed, m0 = e.spiritStats.magnet; e.lootItems.push({ id: 'tl', x: e.playerX + 200, y: e.playerY, type: 'xp', value: 1, bobOffset: 0, magnetized: false }); await new Promise((r) => setTimeout(r, 2000)); return { healed: Math.round(e.spiritStats.healed - h0), hpNow: Math.round(e.stats.hp), magnet: e.spiritStats.magnet - m0 }; });
  // beacon slow + dps
  R.beacon = await E(p, async () => { const e = __engine; e.clearEnemies(); e.spawnEnemy('imp', 100, 0); const en = e.enemies[0]; en.hp = en.maxHp = 1e6; const t0 = e.spiritStats.beaconTicks; await new Promise((r) => setTimeout(r, 1500)); return { inAura: (en.beaconUntil ?? 0) > e.gameTimeSeconds, ticks: e.spiritStats.beaconTicks - t0, dmg: Math.round(1e6 - en.hp) }; });
  // surge via HUD
  await E(p, () => { const e = __engine; e.clearEnemies(); for (let i = 0; i < 16; i++) e.spawnEnemy('imp', Math.cos(i) * 260, Math.sin(i) * 200); });
  const sh0 = await E(p, () => __engine.spiritStats.surgeHits);
  await p.locator('[data-hud="surge"]').click(); await W(p, 250); await p.screenshot({ path: S('surge') });
  R.surge = await E(p, (sh0) => { const s = __engine.spiritState(); return { uses: s.stats.surges, hits: s.stats.surgeHits - sh0, cd: +s.surgeCd.toFixed(1), max: s.surgeMax }; }, sh0);
  await W(p, 600); R.surge.ring = await p.locator('[data-hud="surge"] [data-ring]').getAttribute('data-ring'); R.surge.ready = await p.locator('[data-hud="surge"]').getAttribute('data-ready');
  R.surge.blockedWhileCd = await E(p, () => __engine.spiritSurge() === false);
  await p.screenshot({ path: S('surge-cd') });
  // lethal save
  R.save = await E(p, () => { const e = __engine; e.clearEnemies(); const n0 = e.spirits.length; e.stats.hp = -5; e.handlePlayerDeath(); const s = e.spiritState(); const a = { n0, n1: s.n, hp: Math.round(e.stats.hp), saves: s.stats.saves, saveCd: Math.round(s.saveCd) }; a.secondHitNotSaved = e.trySpiritSave() === false && e.spiritState().stats.saves === 1; e.stats.hp = 1000; return a; });
  await E(p, () => { const e = __engine; e.spiritLost = []; e.stats.hp = 1000; e.isPaused && e.resume?.(); });
  await W(p, 400);
  // flying formation
  await E(p, () => __engine.toggleFlight(true)); await W(p, 1500);
  R.formation = await E(p, () => { const e = __engine; const s = e.spiritState(); const fa = e.playerAngle; const behind = e.spirits.filter((q) => (q.x - e.playerX) * Math.cos(fa) + (q.y - e.playerY) * Math.sin(fa) < 0).length; return { formation: s.formation, behind, n: s.n }; });
  await p.screenshot({ path: S('flying') });
  await E(p, () => __engine.toggleFlight(false)); await W(p, 600);
  // fps with 12 spirits + crowd
  await E(p, () => { const e = __engine; e.clearEnemies(); for (let i = 0; i < 150; i++) { const a = Math.random() * 6.28, r = 200 + Math.random() * 500; e.spawnEnemy('imp', Math.cos(a) * r, Math.sin(a) * r); } for (const q of e.enemies) q.hp = q.maxHp = 1e6; });
  await W(p, 500); R.fps = { spirits: await E(p, () => __engine.spirits.length), enemies: await E(p, () => __engine.enemies.length), fps: await fps(p) };
  await p.screenshot({ path: S('crowd') });
  // codex
  await E(p, () => { __engine.clearEnemies(); });
  await p.keyboard.press('Escape'); await W(p, 300);
  R.errors = errs; await b.close();
  const L = R.levels;
  R.ok = L[1].roles.guardian === 1 && L[2].roles.hunter === 1 && L[3].roles.mender === 1 && L[5].roles.beacon === 1 && L[8].asc === 1 && L[12].asc === 2 && L[12].n === 12
    && /Mender/.test(R.texts[3]) && /Beacon/.test(R.texts[5]) && /ASCENSION I\b/.test(R.texts[8]) && /ASCENSION II/.test(R.texts[12])
    && R.block.blocked > 0 && R.hunt.hunts > 0 && R.mender.healed > 0 && R.mender.magnet > 0 && R.beacon.inAura && R.beacon.dmg > 0
    && R.surge.uses === 1 && R.surge.hits > 0 && R.surge.ready === '0' && R.surge.blockedWhileCd && R.save.saves === 1 && R.save.hp > 0 && R.save.n1 === R.save.n0 - 1 && R.save.secondHitNotSaved
    && R.formation.formation === 'wing' && R.formation.behind >= R.formation.n * 0.8 && !errs.length;
  fs.writeFileSync(`qa/results/${tag}.json`, JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R));
})();
