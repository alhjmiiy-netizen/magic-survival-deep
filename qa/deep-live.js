const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, vw, vh, tag] = process.argv; const res = {};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: +vw, height: +vh }, hasTouch: true, isMobile: true })).newPage();
  const errs = [], bad = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message)); p.on('response', r => r.status() >= 400 && bad.push(r.status() + ' ' + r.url()));
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  res.title = await p.title(); res.modes = await p.$$eval('[data-mode]', e => e.map(x => x.dataset.mode));
  await p.locator('[data-mode="regions"]').tap(); await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="cataclysm"]').tap();
  await p.waitForTimeout(2000);
  await p.evaluate(() => { __engine.learnSpell('frost_nova'); for (let i = 0; i < 7; i++) { __engine.levelSpell('cataclysm'); __engine.levelSpell('frost_nova'); } __engine.evolveSpell('cataclysm'); __engine.grantArtifact('crown'); __engine.skipToRegion(2, false); __engine.regionTime = 150; });
  const fps = await p.evaluate(() => new Promise(r => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 300) requestAnimationFrame(f); else { const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]); d.sort((a, b) => a - b); const avg = d.reduce((a, b) => a + b, 0) / d.length; r({ avgMs: +avg.toFixed(1), p95Ms: +d[Math.floor(d.length * .95)].toFixed(1), fps: +(1000 / avg).toFixed(1), enemies: __engine.enemies.length, particles: __engine.particles.length, workMs: __engine.fps() }); } }; requestAnimationFrame(f); }));
  res.fps = fps; res.state = await p.evaluate(() => ({ region: __engine.region.name, syn: __engine.synergies, spells: __engine.spells.map(s => s.name), sw: !!navigator.serviceWorker?.controller }));
  await p.screenshot({ path: `/workspace/deploy/magic-deep-shots/live-${tag}.png` });
  res.errors = errs; res.bad = bad; console.log(JSON.stringify(res)); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
