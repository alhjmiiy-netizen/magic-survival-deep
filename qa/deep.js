const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, vw, vh, tag, endlessSec] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const res = {};
const W = (p, ms) => p.waitForTimeout(ms);
async function clearModals(p) { for (let i = 0; i < 6; i++) { const m = await p.$('[data-modal="levelup"] [data-choice], [data-modal="chest"] [data-choice]'); if (!m) break; await m.click(); await W(p, 150); } }
async function play(p, ms) { const end = Date.now() + ms; while (Date.now() < end) { await clearModals(p); await p.evaluate(() => { __engine.stats.hp = __engine.stats.maxHp; }); await W(p, 300); } }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: +vw, height: +vh }, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 800);
  res.title = await p.title();
  res.modes = await p.$$eval('[data-mode]', e => e.map(x => x.getAttribute('data-mode')));
  await p.screenshot({ path: S('1-menu') });
  await p.locator('[data-mode="regions"]').tap();
  await p.waitForSelector('[data-modal="startspell"]');
  await p.locator('[data-choice="thunderstorm"]').tap();
  await W(p, 900);
  res.banner = await p.$eval('[data-hud="region-banner"]', e => e.textContent).catch(() => null);
  await p.screenshot({ path: S('2-region-banner') });
  // Evolution: level thunder to 5 -> EVOLVE card
  await p.evaluate(() => { for (let i = 0; i < 4; i++) __engine.levelSpell('thunderstorm'); __engine.addXp(__engine.stats.maxXp); });
  await p.waitForSelector('[data-modal="levelup"]');
  res.evoCard = await p.$$eval('[data-kind="evolve"]', e => e.map(x => x.textContent.slice(0, 80)));
  await p.screenshot({ path: S('3-evolve-card') });
  await p.locator('[data-kind="evolve"]').first().tap(); await W(p, 700);
  res.afterEvo = await p.evaluate(() => __engine.spells.map(s => `${s.id}:${s.name}:L${s.level}:T${s.tier ?? 0}`));
  await play(p, 2000);
  res.hudTier = await p.$$eval('[data-power] [data-tier]', e => e.map(x => x.closest('[data-power]').getAttribute('data-power') + '=T' + x.getAttribute('data-tier') + (x.querySelector('[data-star]') ? '★' : '')));
  await p.screenshot({ path: S('4-evolved-hud') });
  // final form via engine
  res.final = await p.evaluate(() => { for (let i = 0; i < 3; i++) __engine.levelSpell('thunderstorm'); const ok = __engine.evolveSpell('thunderstorm'); return { ok, sp: __engine.spells.find(s => s.id === 'thunderstorm').name }; });
  // all evolutions
  res.allEvo = await p.evaluate(() => { const out = []; for (const id of ['frost_nova', 'cataclysm', 'arcane_missiles']) { __engine.learnSpell(id); for (let i = 0; i < 8; i++) __engine.levelSpell(id); __engine.evolveSpell(id); const n1 = __engine.spells.find(s => s.id === id).name; __engine.evolveSpell(id); out.push(id + ': ' + n1 + ' -> ' + __engine.spells.find(s => s.id === id).name + ' L' + __engine.spells.find(s => s.id === id).level); } return out; });
  await clearModals(p);
  await W(p, 400);
  await p.screenshot({ path: S('5-synergy-toast') });
  await play(p, 3000);
  res.synergies = await p.evaluate(() => __engine.synergies);
  res.synPanel = await p.$$eval('[data-synergy]', e => e.map(x => x.getAttribute('data-synergy')));
  res.zones = await p.evaluate(() => __engine.zones.length);
  // artifacts
  res.arts = await p.evaluate(() => { for (const id of ['eye','hourglass','lodestone','titan','phoenix','prism','sigil','slayer','crown']) __engine.grantArtifact(id); __engine.grantArtifact('crown'); return __engine.artifacts; });
  await W(p, 600);
  res.artRow = await p.$$eval('[data-artifact]', e => e.map(x => x.getAttribute('data-artifact') + ':' + x.textContent));
  await p.screenshot({ path: S('6-artifact-row') });
  // chest via elite drop path
  await p.evaluate(() => __engine.openChest('Elite Chest'));
  await p.waitForSelector('[data-modal="chest"]');
  await p.screenshot({ path: S('7-chest') });
  await clearModals(p);
  // regions: skip to each + boss
  res.regions = [];
  for (let i = 0; i < 5; i++) {
    await p.evaluate((i) => __engine.skipToRegion(i, true), i);
    await play(p, 1500);
    const r = await p.evaluate(() => ({ region: __engine.region.name, arena: __engine.currentArena.id, phase: __engine.regionPhase, boss: __engine.currentBoss?.name, hazards: __engine.hazards.length }));
    res.regions.push(r);
    if (i === 2) await p.screenshot({ path: S('8-boss') });
    // kill boss -> chest -> next region
    await p.evaluate(() => { const bz = __engine.currentBoss; if (bz) bz.hp = 1; });
    await play(p, 2500);
    res.regions[i].after = await p.evaluate(() => ({ idx: __engine.regionIdx, phase: __engine.regionPhase, endless: __engine.inEndless, boss: !!__engine.currentBoss, bossKills: __engine.bossKills }));
  }
  // endless
  await p.evaluate(() => { __engine.frameTimes.length = 0; if (!__engine.inEndless) __engine.startEndless(); __engine.endlessTime = 110; });
  await play(p, (+endlessSec || 60) * 1000);
  res.endless = await p.evaluate(() => ({ t: __engine.endlessTime.toFixed(0), enemies: __engine.enemies.length, particles: __engine.particles.length, boss: __engine.currentBoss?.name, kills: __engine.enemiesDefeated, fps: __engine.fps() }));
  await p.screenshot({ path: S('9-endless') });
  // pause button
  res.pauseBtn = !!(await p.$('[data-hud="pause"], [aria-label="Pause"]'));
  // game over
  await clearModals(p);
  await p.evaluate(() => { __engine.revived = true; __engine.artifacts.phoenix = 0; __engine.stats.hp = 0; });
  await W(p, 1500);
  res.gameover = await p.$eval('[data-gameover="score"]', e => e.textContent).catch(() => null);
  res.best = await p.evaluate(() => localStorage.getItem('msdeep_best_v1'));
  await p.screenshot({ path: S('10-gameover') });
  res.errors = errs;
  console.log(JSON.stringify(res, null, 1)); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
