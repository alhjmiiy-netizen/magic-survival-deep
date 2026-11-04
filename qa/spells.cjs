// v7 new-magic test. node qa/spells.cjs <url> [tag] [soakSeconds]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const fs = require('fs');
const [,, url, tag = 'v7-spells', soakS = '90'] = process.argv;
const DIR = '/workspace/deploy/magic-deep-shots/'; const S = (n) => `${DIR}${tag}-${n}.png`;
const W = (p, ms) => p.waitForTimeout(ms); const E = (p, f, a) => p.evaluate(f, a);
const IDS = ['meteor_shower', 'chain_lightning', 'electric_zone', 'satellite_orbs', 'poison_cloud', 'cyclone', 'gale_scythe', 'stone_spikes', 'gravity_well', 'tidal_wave', 'holy_smite', 'magic_circle'];
async function start(b, w, h) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 600);
  await p.locator('[data-action="start"]').click(); await p.locator('[data-mode="regions"]').click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="frost_nova"]').click(); await W(p, 800);
  await E(p, () => { const e = __engine; e.stats.maxHp = 1e9; e.stats.hp = 1e9; e.stats.maxXp = 1e12; e.clearEnemies(); window.__played = []; const s = window.__sound; const o = s.play.bind(s); s.play = (n, v) => { window.__played.push(n); return o(n, v); }; });
  return p;
}
const fps = (p, ms) => E(p, (ms) => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: +(n * 1000 / (t - t0)).toFixed(1), worstMs: Math.round(worst) }); }; requestAnimationFrame(f); }), ms);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await start(b, 900, 600); const R = { spells: {} };
  for (const id of IDS) {
    const r = await E(p, async (id) => {
      const e = __engine; const sl = () => e.spells.find((s) => s.id === id);
      e.spells = e.spells.filter((s) => s.id === 'frost_nova'); e.magic2.reset(); e.clearEnemies();
      e.learnSpell(id); const sp = sl(); if (!sp) return { err: 'not learned' };
      const lv = []; for (let l = 1; l <= 8; l++) { if (l > 1) e.levelSpell(id); const s = sl(); lv.push({ l: s.level, count: s.count, area: s.area, dmg: s.damage, cd: +s.cooldown.toFixed(2), text: window.__spellText ? '' : undefined }); }
      const hit = async (tierLabel) => {
        e.clearEnemies(); for (let i = 0; i < 24; i++) e.spawnEnemy('imp', 80 + (i % 6) * 45, -120 + Math.floor(i / 6) * 60);
        for (const q of e.enemies) { q.hp = q.maxHp = 1e7; }
        const hp0 = e.enemies.reduce((s, q) => s + q.hp, 0); window.__played = []; const c0 = e.magic2.log.casts[id] ?? 0;
        e.autoCastRaw(e.eff(sl()));
        for (let w = 0; w < 30 && (w < 13 || hp0 - e.enemies.reduce((s, q) => s + q.hp, 0) <= 0); w++) await new Promise((r) => setTimeout(r, 200));
        return { tier: tierLabel, casts: (e.magic2.log.casts[id] ?? 0) - c0, dmg: Math.round(hp0 - e.enemies.reduce((s, q) => s + q.hp, 0)), sound: window.__played.includes('sp_' + id), ents: e.magic2.active };
      };
      for (const s of e.spells) if (s.id !== id) s.currentCooldown = 1e9; sl().currentCooldown = 1e9;
      const base = await hit(0);
      const ev = []; for (let t = 1; t <= 2; t++) { const ok = e.evolveSpell(id); ev.push({ ok, tier: sl().tier, name: (window.__evoName ?? '') }); }
      sl().currentCooldown = 1e9; const evo = await hit(2);
      return { lv, base, ev, evo, hud: !!document.querySelector(`[data-power="${id}"]`) };
    }, id);
    // shot mid-cast with evolved form
    await E(p, (id) => { const e = __engine; e.clearEnemies(); for (let i = 0; i < 30; i++) e.spawnEnemy('imp', -300 + (i % 10) * 65, -160 + Math.floor(i / 10) * 140); for (const q of e.enemies) q.hp = q.maxHp = 1e7; e.autoCastRaw(e.eff(e.spells.find((s) => s.id === id))); }, id);
    await W(p, id === 'meteor_shower' ? 450 : id === 'gravity_well' ? 1200 : 350); await p.screenshot({ path: S(id) });
    r.levelsOk = r.lv.length === 8 && r.lv[7].l === 8 && (r.lv[7].count > r.lv[0].count || r.lv[7].area > r.lv[0].area) && r.lv[7].dmg > r.lv[0].dmg;
    r.ok = !r.err && r.levelsOk && r.base.casts === 1 && r.base.dmg > 0 && r.base.sound && r.ev.every((q) => q.ok) && r.evo.dmg > 0 && r.hud;
    R.spells[id] = r; console.log(id, r.ok, r.base.dmg, r.evo.dmg);
  }
  // level-up: new magic guaranteed while slots are free; slot cap
  R.levelup = await E(p, () => { const e = __engine; e.spells = e.spells.filter((s) => s.id === 'frost_nova'); let withNew = 0, fresh = 0; const N = 300; for (let i = 0; i < N; i++) { const c = e.getUpgradeChoices(4); if (c.some((q) => q.kind === 'new')) withNew++; if (c.some((q) => q.kind === 'new' && !['thunderstorm', 'cataclysm', 'arcane_missiles', 'spirit'].includes(q.id.slice(4)))) fresh++; }
    const ids = ['meteor_shower', 'chain_lightning', 'poison_cloud', 'cyclone', 'stone_spikes', 'tidal_wave', 'holy_smite']; for (const id of ids) e.learnSpell(id); const full = e.getUpgradeChoices(4); return { N, withNew, fresh, ownedAtCap: e.spells.filter((s) => !s.isCombo).length, newOfferedAtCap: full.some((q) => q.kind === 'new') }; });
  // FPS with all spells maxed + evolved
  await E(p, (IDS) => { const e = __engine; for (const id of IDS) { if (!e.spells.find((s) => s.id === id)) e.learnSpell(id); const s = e.spells.find((q) => q.id === id); while (s.level < 8) e.levelSpell(id); while ((s.tier ?? 0) < 2 && e.evolveSpell(id)); s.currentCooldown = 0; } e.clearEnemies(); for (let i = 0; i < 160; i++) { const a = Math.random() * 6.28, d = 150 + Math.random() * 500; e.spawnEnemy('imp', Math.cos(a) * d, Math.sin(a) * d); } }, IDS);
  await W(p, 1500); R.fpsAll = await fps(p, 6000); R.fpsAll.enemies = await E(p, () => __engine.enemies.length); R.fpsAll.ents = await E(p, () => __engine.magic2.active);
  await p.screenshot({ path: S('all-spells') });
  // soak: all spells, natural spawns
  const soakMs = +soakS * 1000; const t0 = Date.now(); const samples = [];
  while (Date.now() - t0 < soakMs) { await E(p, () => { const e = __engine; e.stats.hp = e.stats.maxHp; if (document.querySelector('[data-modal="levelup"]')) { const b = document.querySelector('[data-modal="levelup"] [data-choice]'); b && b.click(); } }); const f = await fps(p, 2000); samples.push({ ...f, heap: await E(p, () => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6)), enemies: await E(p, () => __engine.enemies.length), ents: await E(p, () => __engine.magic2.active) }); }
  R.soak = { seconds: +soakS, avgFps: +(samples.reduce((a, s) => a + s.fps, 0) / samples.length).toFixed(1), minFps: Math.min(...samples.map((s) => s.fps)), heapFirst: samples[0].heap, heapLast: samples[samples.length - 1].heap, maxEnts: Math.max(...samples.map((s) => s.ents)), maxEnemies: Math.max(...samples.map((s) => s.enemies)) };
  R.casts = await E(p, () => __engine.magic2.log.casts);
  await p.screenshot({ path: S('soak-end') });
  R.errors = p.errs;
  // portrait HUD with 8+ magics
  const q = await start(b, 390, 844);
  await E(q, () => { const e = __engine; for (const id of ['meteor_shower', 'chain_lightning', 'poison_cloud', 'cyclone', 'stone_spikes', 'tidal_wave', 'holy_smite']) e.learnSpell(id); });
  await W(q, 800);
  R.portraitHud = await E(q, () => { const el = document.querySelector('[data-hud="powers"]'); const r = el.getBoundingClientRect(); return { tiles: el.querySelectorAll('[data-power]').length, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), vw: innerWidth, fits: r.left >= 0 && r.right <= innerWidth }; });
  await q.screenshot({ path: S('portrait-hud') });
  R.portraitErrors = q.errs;
  await b.close();
  R.allOk = Object.values(R.spells).every((s) => s.ok) && R.levelup.withNew === R.levelup.N && R.levelup.ownedAtCap === 8 && !R.levelup.newOfferedAtCap && R.portraitHud.fits && R.portraitHud.tiles === 8 && !R.errors.length;
  fs.writeFileSync(`qa/results/${tag}.json`, JSON.stringify(R, null, 1));
  console.log(JSON.stringify({ ...R, spells: Object.fromEntries(Object.entries(R.spells).map(([k, v]) => [k, { ok: v.ok, base: v.base.dmg, evo: v.evo.dmg, lv1: v.lv[0], lv8: v.lv[7] }])) }, null, 1));
})();
