const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, vw, vh, tag, secs] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const res = { samples: [] }; const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: +vw, height: +vh }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 800);
  await p.locator('[data-mode="endless"]').tap();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="arcane_missiles"]').tap(); await W(p, 1200);
  res.banner = await p.$eval('[data-hud="region-banner"]', e => e.textContent).catch(() => null);
  await p.screenshot({ path: S('e1-banner') });
  // joystick drag (touch) in a circle-ish
  const end = Date.now() + (+secs) * 1000; let shot = false, n = 0;
  while (Date.now() < end) {
    const m = await p.$('[data-modal="levelup"] [data-choice], [data-modal="chest"] [data-choice]'); if (m) await m.click();
    await p.evaluate(() => { __engine.stats.hp = __engine.stats.maxHp; });
    if (++n % 8 === 0) { const s = await p.evaluate(() => ({ t: Math.round(__engine.endlessTime), en: __engine.enemies.length, pa: __engine.particles.length, boss: __engine.currentBoss?.name ?? null, k: __engine.enemiesDefeated, fps: __engine.fps() })); res.samples.push(s); if (!shot && s.en > 30) { await p.screenshot({ path: S('e2-wave') }); shot = true; } if (s.boss) await p.screenshot({ path: S('e3-endless-boss') }); }
    await W(p, 500);
  }
  await p.screenshot({ path: S('e4-late') });
  res.pause = await p.locator('[data-hud="pause"], [aria-label="Pause"]').count();
  await p.evaluate(() => { __engine.stats.hp = 0; });
  await p.waitForSelector('[data-gameover="score"]', { timeout: 8000 }).catch(() => {});
  res.gameover = await p.$eval('[data-gameover="score"]', e => e.textContent).catch(() => null);
  await p.screenshot({ path: S('e5-gameover') });
  await p.reload({ waitUntil: 'networkidle' }); await W(p, 800);
  res.menuBest = await p.$eval('[data-mode="endless"]', e => e.textContent);
  res.savedMode = await p.evaluate(() => localStorage.getItem('msdeep_mode'));
  res.sw = await p.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  res.errors = errs; console.log(JSON.stringify(res, null, 1)); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
