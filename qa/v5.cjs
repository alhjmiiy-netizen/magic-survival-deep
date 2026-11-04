const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, vw, vh, tag, full] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const res = {}; const W = (p, ms) => p.waitForTimeout(ms); const E = (p, f, a) => p.evaluate(f, a);
async function clearModals(p) { for (let i = 0; i < 6; i++) { const m = await p.$('[data-modal="levelup"] [data-choice], [data-modal="chest"] [data-choice]'); if (!m) break; await m.click(); await W(p, 150); } }
async function fps(p, ms = 3000) { return E(p, (ms) => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }), ms); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: +vw, height: +vh }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 800);
  await p.locator('[data-action="start"]').tap(); await p.locator('[data-mode="regions"]').tap();
  await p.waitForSelector('[data-modal="startspell"]');
  await p.locator('[data-choice="cataclysm"]').tap(); await W(p, 1200);
  await E(p, () => { __engine.learnSpell('frost_nova'); __engine.learnSpell('thunderstorm'); __engine.learnSpell('arcane_missiles'); __engine.stats.maxHp = 50000; __engine.stats.hp = 50000; __engine.stats.maxXp = 1e9; });
  await W(p, 500);
  res.hint = await p.$eval('[data-hud="flight-hint"]', e => e.textContent).catch(() => null);
  res.meterUiGone = (await p.$('[data-hud="flight-meter"]')) === null && (await p.$('[data-flight-ring]')) === null;
  res.audio = await E(p, () => __sound.state());
  // ---- flight: unlimited, no lockout
  await clearModals(p); await p.locator('[data-hud="flight"]').tap(); await W(p, 800);
  res.hover = await E(p, () => __engine.flightState());
  await p.screenshot({ path: S('hover') });
  await W(p, 7000); res.after7s = await E(p, () => __engine.flightState()); // old limit was 6s
  // soar: hold a direction
  const key = 'ArrowRight';
  await p.keyboard.down(key); await W(p, 1500); res.soar = await E(p, () => __engine.flightState()); await p.screenshot({ path: S('soar') });
  await E(p, () => { __engine.playerX = __engine.arenaRadius + 600; __engine.playerY = 0; }); await W(p, 900);
  res.outside = await E(p, () => __engine.flightState()); await p.screenshot({ path: S('outside-circle') });
  await p.keyboard.up(key); await W(p, 600);
  res.outsideHover = await E(p, () => __engine.flightState());
  // world edge
  await E(p, () => { __engine.playerX = __engine.worldR + 400; }); await W(p, 300); res.worldEdge = await E(p, () => __engine.flightState());
  // land outside -> pull-back, no damage
  await E(p, () => { __engine.playerX = __engine.arenaRadius + 500; __engine.playerY = 0; __engine.clearEnemies(); }); await W(p, 200);
  const hp0 = await E(p, () => { __engine.toggleFlight(false); return __engine.stats.hp; });
  await W(p, 1200); await p.screenshot({ path: S('pulled-back') });
  res.landOutside = await E(p, (hp0) => ({ ...__engine.flightState(), hpDrop: hp0 - __engine.stats.hp, labels: __engine.labels.map(l => l.text) }), hp0);
  // F key toggle repeatedly (no lockout)
  const fk = []; for (let i = 0; i < 4; i++) { await p.keyboard.press('f'); await W(p, 150); fk.push(await E(p, () => __engine.flying)); } res.keyF = fk;
  // immunity
  const hpTest = async (type, fly) => { await E(p, ([t, f]) => { __engine.clearEnemies(); __engine.toggleFlight(f); __engine.stats.hp = 30000; __engine.stats.mana = 0; for (let i = 0; i < 5; i++) { const id = __engine.spawnEnemy(t, 4, 4, false); const e = __engine.enemies.find(x => x.id === id); e.speed = 0; e.hp = e.maxHp = 1e9; } __engine.spells.forEach(s => s.currentCooldown = 999); }, [type, fly]); await W(p, 800); const h0 = await E(p, () => __engine.stats.hp); await W(p, 1000); return E(p, (h0) => ({ drop: Math.round(h0 - __engine.stats.hp), alt: __engine.flightState().alt }), h0); };
  res.immunity = { crawlerGround: await hpTest('crawler', false), crawlerAir: await hpTest('crawler', true), wispAir: await hpTest('astral_wisp', true) };
  await E(p, () => { __engine.clearEnemies(); __engine.toggleFlight(false); __engine.spells.forEach(s => s.currentCooldown = 0); __engine.playerX = 0; __engine.playerY = 0; });
  // despawn far
  await E(p, () => { __engine.toggleFlight(true); for (let i = 0; i < 6; i++) __engine.spawnEnemy('crawler', 2000, i * 30); }); await W(p, 300);
  res.despawned = await E(p, () => __engine.despawned);
  await E(p, () => __engine.toggleFlight(false)); await W(p, 1200);
  // ---- cataclysm meter via 3 distinct fusions
  await E(p, () => { __engine.clearEnemies(); for (let i = 0; i < 8; i++) __engine.spawnEnemy('crawler', 150 + i * 10, 20); });
  const fus = [['cataclysm','frost_nova'],['thunderstorm','frost_nova'],['arcane_missiles','cataclysm']];
  for (const [a, c] of fus) { await E(p, ([a, c]) => { __engine.fusionCd = 0; __engine.lastCast = null; __engine.noteCastForFusion(a); __engine.noteCastForFusion(c); }, [a, c]); await W(p, 250); }
  res.meterAfterFusions = await E(p, () => ({ ...__engine.cataclysmState(), fusions: __engine.fusionLog.slice(-3) }));
  await p.screenshot({ path: S('cata-meter') });
  // the natural trigger should follow (ground -> abyss) unless blocked
  await p.waitForFunction(() => __engine.cata.phase === 'crack', null, { timeout: 4000 }).catch(() => {});
  await W(p, 1300); await p.screenshot({ path: S('crack') });
  res.crack = await E(p, () => __engine.cataclysmState());
  await p.waitForFunction(() => __engine.cata.phase === 'collapse', null, { timeout: 4000 }).catch(() => {});
  await W(p, 600); await p.screenshot({ path: S('collapse') }); res.collapse = await E(p, () => __engine.cataclysmState());
  await p.waitForFunction(() => __engine.cata.phase === 'scene', null, { timeout: 4000 }).catch(() => {});
  await W(p, 600); await p.screenshot({ path: S('title-abyss') }); await W(p, 4000); await clearModals(p);
  await p.screenshot({ path: S('scene-abyss') }); res.fpsScene = { abyss: await fps(p) };
  res.sceneAbyss = await E(p, () => ({ ...__engine.cataclysmState(), enemies: __engine.enemies.length, regionT: __engine.deepState().regionTime ?? null }));
  // end the scene quickly
  const chests0 = await E(p, () => __engine.chestLog.length);
  await E(p, () => { __engine.cata.left = 0.3; }); await W(p, 800);
  res.sceneEnd = await E(p, () => ({ ...__engine.cataclysmState(), chestsOnGround: __engine.lootItems.filter(l => l.type === 'chest').length }));
  await p.screenshot({ path: S('reward-chest') });
  // walk onto chest
  await E(p, () => { const c = __engine.lootItems.find(l => l.type === 'chest'); if (c) { __engine.playerX = c.x; __engine.playerY = c.y; } }); await W(p, 500);
  res.chestModal = await p.$$eval('[data-modal="chest"] [data-choice]', e => e.map(x => [x.getAttribute('data-choice'), x.getAttribute('data-rarity')])).catch(() => []);
  res.chestTitle = await p.$eval('[data-modal="chest"]', e => e.textContent.slice(0, 60)).catch(() => null);
  await p.screenshot({ path: S('chest-modal') });
  await clearModals(p); await W(p, 1800);
  res.afterReform = await E(p, () => __engine.cataclysmState());
  // sky + rift via debug hook (cooldown ignored)
  for (const k of ['sky', 'rift']) {
    await E(p, (k) => { __engine.toggleFlight(k === 'sky' || k === 'rift'); return __engine.triggerCataclysm(k); }, k);
    await W(p, 1500); await p.screenshot({ path: S('crack-' + k) });
    await p.waitForFunction(() => __engine.cata.phase === 'collapse', null, { timeout: 4000 }).catch(() => {});
    await W(p, 700); await p.screenshot({ path: S('collapse-' + k) });
    await p.waitForFunction(() => __engine.cata.phase === 'scene', null, { timeout: 6000 }).catch(() => {});
    await W(p, 900); await p.screenshot({ path: S('title-' + k) }); await W(p, 3500); await clearModals(p);
    if (k === 'sky') await p.keyboard.down('ArrowUp');
    await W(p, 600); await p.screenshot({ path: S('scene-' + k) }); res.fpsScene[k] = await fps(p);
    if (k === 'sky') await p.keyboard.up('ArrowUp');
    res['scene_' + k] = await E(p, () => ({ ...__engine.cataclysmState(), sov: __engine.enemies.filter(e => e.name === 'Rift Sovereign').length, enemies: __engine.enemies.length }));
    await E(p, () => { __engine.cata.left = 0.2; }); await W(p, 2500); await clearModals(p);
    await E(p, () => { for (const l of __engine.lootItems.filter(l => l.type === 'chest')) { __engine.playerX = l.x; __engine.playerY = l.y; } }); await W(p, 400); await clearModals(p); await W(p, 300);
  }
  await E(p, () => __engine.learnSpell('spirit')); await W(p, 300);
  res.toastBox = await p.$eval('[data-hud="magic-toast"]', e => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }).catch(() => null);
  res.spellBarTop = await p.$eval('[data-hud="magic-toast"]', e => Math.round(e.parentElement.getBoundingClientRect().top)).catch(() => null);
  await p.screenshot({ path: S('toast') });
  res.blockedByBoss = await E(p, () => { const id = __engine.spawnEnemy('crawler', 300, 0); const e = __engine.enemies.find(x => x.id === id); e.isBoss = true; __engine.currentBoss = e; const r = __engine.triggerCataclysm('ground'); e.isBoss = false; __engine.currentBoss = null; __engine.clearEnemies(); return r; });
  // ---- artifacts: pass/fail per artifact
  res.artifacts = await E(p, () => {
    const out = []; const ids = (window.__ARTS || []);
    return out;
  });
  const artIds = await E(p, () => Object.keys(__engine.artifactProbe()) && __engine.allArtifactIds());
  const fails = [], passes = [];
  for (const id of artIds) {
    const r = await E(p, (id) => { const saved = { ...__engine.artifacts }; const st = { ...__engine.stats }; __engine.artifacts = {}; const before = JSON.stringify(__engine.artifactProbe());
      const lg = __engine.flightLog.length; __engine.grantArtifact(id); const after = JSON.stringify(__engine.artifactProbe());
      let changed = before !== after;
      // restore
      __engine.artifacts = saved; Object.assign(__engine.stats, st);
      return { changed, d: changed ? Object.entries(JSON.parse(after)).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(JSON.parse(before)[k])).map(([k, v]) => `${k}:${JSON.stringify(JSON.parse(before)[k])}->${JSON.stringify(v)}`).join(' ') : '' }; }, id);
    (r.changed ? passes : fails).push(`${id}  ${r.d}`);
  }
  res.artifactPass = passes; res.artifactFail = fails;
  res.choices = await E(p, () => { const c = { normal: 0, rare: 0, epic: 0 }; for (let i = 0; i < 300; i++) for (const x of __engine.artifactChoices(3)) c[x.rarity]++; return c; });
  // pause screen artifacts
  await E(p, () => { __engine.grantArtifact('second_heart'); __engine.grantArtifact('firefly'); __engine.grantArtifact('ether_arrow'); });
  await W(p, 400);
  await p.screenshot({ path: S('relics-hud') });
  await p.keyboard.press('Escape'); await W(p, 600);
  res.pauseArtifacts = await p.$$eval('[data-pause-artifact]', e => e.map(x => x.getAttribute('data-pause-artifact')));
  await p.screenshot({ path: S('pause-artifacts') });
  await p.keyboard.press('Escape'); await W(p, 500);
  res.fpsGround = await fps(p);
  res.sound = await E(p, () => ({ ...__sound.state(), errors: __sound.errors, plays: __sound.log.length, names: [...new Set(__sound.log.map(l => l.name))].slice(0, 40) }));
  res.errors = errs;
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
