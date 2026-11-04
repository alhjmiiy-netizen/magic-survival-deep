// v7 endless-world travel test. node qa/travel.cjs <url> <w> <h> <tag>
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, w = '900', h = '600', tag = 'v7-travel'] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
const W = (p, ms) => p.waitForTimeout(ms); const E = (p, f, a) => p.evaluate(f, a);
async function fps(p, ms = 2000) { return E(p, (ms) => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }), ms); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 600);
  await p.locator('[data-action="start"]').click(); await p.locator('[data-mode="regions"]').click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="frost_nova"]').click(); await W(p, 800);
  const god = () => E(p, () => { const e = __engine; e.stats.maxHp = 1e9; e.stats.hp = 1e9; e.stats.maxXp = 1e12; });
  await god();
  const R = { fails: [], legs: [] };
  const st = () => E(p, () => { const e = __engine; return { local: [Math.round(e.playerX), Math.round(e.playerY)], abs: e.absPos(), origin: { ...e.origin }, rebases: e.rebaseCount, chunks: e.world.size, wstats: { ...e.world.stats }, ibgChunks: e.ibg.chunkProps.size, props: e.ibg.props.length, enemies: e.enemies.length, loot: e.lootItems.length, particles: e.particles.length, flying: e.flying, fx: e.flightState(), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null }; });
  // 1. real keyboard travel in all 8 directions, ground then flight
  const dirs = [['d'], ['a'], ['w'], ['s'], ['d', 'w'], ['a', 's'], ['d', 's'], ['a', 'w']];
  for (const fly of [false, true]) {
    await E(p, (f) => __engine.toggleFlight(f), fly);
    for (const ks of dirs) {
      const a = await st();
      for (const k of ks) await p.keyboard.down(k);
      await W(p, 2500);
      for (const k of ks) await p.keyboard.up(k);
      const z = await st(); await god();
      const moved = Math.round(Math.hypot(z.abs.x - a.abs.x, z.abs.y - a.abs.y));
      R.legs.push({ fly, ks: ks.join(''), moved, pulled: z.fx.pulling });
      if (moved < 300) R.fails.push(`${fly ? 'fly' : 'ground'} ${ks.join('')} moved only ${moved}`);
    }
  }
  // 2. one long run east on the ground (no wall): ~12 s
  { const a = await st(); await E(p, () => __engine.toggleFlight(false)); await p.keyboard.down('d'); await W(p, 12000); await p.keyboard.up('d'); const z = await st(); R.longEast = { from: a.abs.x, to: z.abs.x, moved: Math.round(z.abs.x - a.abs.x) }; if (R.longEast.moved < 1500) R.fails.push('long east run blocked: ' + R.longEast.moved); }
  await god();
  // 3. far coordinates: teleport to 1e4, 1e5, 1e6, -1e6 in each axis; check rebase + rendering + determinism
  const spots = [[10000, 0], [100000, 0], [0, -100000], [1000000, 1000000], [-1000000, 1000000], [-1000000, -1000000], [3000000, -2000000]];
  R.far = [];
  for (const [x, y] of spots) {
    await E(p, ([x, y]) => { const e = __engine; e.setPlayerPos(x - e.origin.x, y - e.origin.y); }, [x, y]);
    await W(p, 700); await god();
    await p.keyboard.down('d'); await W(p, 900); await p.keyboard.up('d');
    const z = await st(); const f = await fps(p, 1200);
    R.far.push({ target: [x, y], abs: [Math.round(z.abs.x), Math.round(z.abs.y)], local: z.local, rebases: z.rebases, chunks: z.chunks, enemies: z.enemies, fps: f });
    if (Math.abs(z.local[0]) > 45000 || Math.abs(z.local[1]) > 45000) R.fails.push('no rebase at ' + x + ',' + y);
    if (Math.abs(z.abs.x - x) > 3000 || Math.abs(z.abs.y - y) > 3000) R.fails.push('abs drift at ' + x + ',' + y + ' -> ' + JSON.stringify(z.abs));
    const nm = Math.abs(x) >= 1e6 ? (x > 0 ? 'e' : 'w') + Math.round(Math.abs(x) / 1e6) + 'M' : Math.round(Math.hypot(x, y) / 1000) + 'k';
    await p.screenshot({ path: S(`${w}x${h}-${nm}${y < 0 ? 'n' : y > 0 ? 's' : ''}`) });
  }
  // 4. determinism: same place looks the same (pixel compare of ground after going away and back)
  R.determinism = await E(p, async () => {
    const e = __engine; const cv = document.querySelector('canvas');
    const grab = () => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.drawImage(cv, cv.width / 2 - 300, cv.height / 2 + 60, 64, 64, 0, 0, 64, 64); return g.getImageData(0, 0, 64, 64).data; };
    const go = (x, y) => { e.setPlayerPos(x - e.origin.x, y - e.origin.y); e.clearEnemies(); };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    go(523456, -77777); e.toggleFlight(false); await wait(900); const a = grab();
    go(-900000, 400000); await wait(700); go(523456, -77777); await wait(900); const b = grab();
    let diff = 0; for (let i = 0; i < a.length; i += 4) diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    return { meanDiff: +(diff / (a.length / 4) / 3).toFixed(2) };
  });
  // 5. minimap shot + radar data
  R.radar = await E(p, () => document.querySelector('[data-hud="radar"]')?.getAttribute('data-world'));
  const rb = await p.locator('[data-hud="radar"]').boundingBox();
  if (rb) await p.screenshot({ path: S(`${w}x${h}-minimap`), clip: { x: Math.max(0, rb.x - 60), y: Math.max(0, rb.y - 10), width: rb.width + 70, height: rb.height + 40 } });
  // 6. cataclysm far away: ground shatters around player
  await E(p, () => { const e = __engine; e.cata.cdUntil = 0; e.currentBoss = null; });
  R.cata = await E(p, () => __engine.triggerCataclysm('abyss'));
  await W(p, 1500); await p.screenshot({ path: S(`${w}x${h}-cata-crack`) });
  await W(p, 3000); await god(); await p.screenshot({ path: S(`${w}x${h}-cata-scene`) });
  R.cataState = await E(p, () => ({ phase: __engine.cata.phase, log: __engine.cata.log.slice(-4) }));
  R.final = await st(); R.errors = errs;
  if (R.final.chunks > 36) R.fails.push('chunk LRU leak ' + R.final.chunks);
  if (R.final.ibgChunks > 49) R.fails.push('ibg chunk leak ' + R.final.ibgChunks);
  if (errs.length) R.fails.push('errors: ' + errs.slice(0, 3).join(' | '));
  console.log(JSON.stringify(R, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
