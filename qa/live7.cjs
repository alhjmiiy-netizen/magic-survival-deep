// v7 live smoke: node qa/live7.cjs <url> <w> <h> <tag>
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, w, h, tag] = process.argv; const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const W = (p, ms) => p.waitForTimeout(ms); const E = (p, f, a) => p.evaluate(f, a);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 500 })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const R = {};
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 800); await p.screenshot({ path: S('menu') });
  await p.locator('[data-action="start"]').click(); await p.locator('[data-mode="regions"]').click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="frost_nova"]').click(); await W(p, 800);
  await E(p, () => { const e = __engine; e.stats.maxHp = 1e9; e.stats.hp = 1e9; });
  // travel far
  R.travel = await E(p, async () => { const e = __engine; e.setPlayerPos(250000, -180000); await new Promise((r) => setTimeout(r, 1500)); const s = e.debugState(); return { ...s, radar: document.querySelector('[data-hud="radar"]')?.getAttribute('data-world') }; });
  await p.screenshot({ path: S('far') });
  // level-up with new spells
  await E(p, () => { __engine.clearEnemies(); __engine.addXp(__engine.stats.maxXp + 5); });
  await p.waitForSelector('[data-modal="levelup"]', { timeout: 5000 }).catch(() => {});
  R.levelup = await p.$$eval('[data-modal="levelup"] [data-choice]', (e) => e.map((x) => x.getAttribute('data-choice')));
  await p.screenshot({ path: S('levelup') });
  for (let i = 0; i < 6; i++) { const m = await p.$('[data-modal="levelup"] [data-choice], [data-modal="chest"] [data-choice]'); if (!m) break; await m.click(); await W(p, 200); }
  // new spells firing
  R.spells = await E(p, async () => { const e = __engine; for (const id of ['meteor_shower', 'poison_cloud', 'cyclone', 'stone_spikes', 'tidal_wave', 'holy_smite', 'gravity_well']) e.learnSpell(id, 5); for (let i = 0; i < 40; i++) e.spawnEnemy('imp', (Math.random() - 0.5) * 600, (Math.random() - 0.5) * 400); });
  const dismiss = async () => { for (let i = 0; i < 6; i++) { const m = await p.$('[data-modal="levelup"] [data-choice], [data-modal="chest"] [data-choice]'); if (!m) break; await m.click(); await W(p, 150); } };
  for (let i = 0; i < 16; i++) { await dismiss(); await E(p, () => { if (__engine.enemies?.length < 15) for (let k = 0; k < 15; k++) __engine.spawnEnemy('imp', (Math.random() - 0.5) * 600, (Math.random() - 0.5) * 400); }).catch(() => {}); await W(p, 500); }
  await dismiss();
  R.spells = await E(p, () => { const e = __engine; return { owned: e.spells.map((s) => s.id), casts: e.magic2.log.casts, ents: e.magic2.active }; });
  await p.screenshot({ path: S('spells') });
  R.fps = await E(p, () => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else r(Math.round(n / 4)); }; requestAnimationFrame(f); }));
  await p.screenshot({ path: S('minimap'), clip: await p.locator('[data-hud="radar"]').boundingBox().then((bb) => bb ? { x: Math.max(0, bb.x - 10), y: Math.max(0, bb.y - 10), width: bb.width + 20, height: bb.height + 20 } : undefined) });
  await dismiss(); await p.keyboard.press('Escape'); await W(p, 400); const btn = p.locator('[aria-label="Combos"]'); if (await btn.count()) await btn.first().click(); await W(p, 600);
  R.combos = await E(p, () => ({ open: !!document.querySelector('[data-modal="combos"]'), cards: document.querySelectorAll('[data-modal="combos"] [data-pair]').length }));
  await p.screenshot({ path: S('combos') });
  R.errs = errs; R.ok = R.travel.arenaR !== undefined && R.levelup.length > 0 && Object.keys(R.spells.casts).length >= 5 && R.combos.cards === 45 && !errs.length;
  console.log(JSON.stringify(R)); await b.close(); process.exit(R.ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
