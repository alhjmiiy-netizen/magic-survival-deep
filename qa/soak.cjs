// v6 soak test: node qa/soak.cjs <url> <mode regions|endless> <minutes> <outJson> [bgOff]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const fs = require('fs');
const [,, url, mode, mins, out, bg] = process.argv;
const E = (p, f, a) => p.evaluate(f, a); const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--enable-precise-memory-info','--js-flags=--expose-gc'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 800);
  if (bg) await E(p, (v) => localStorage.setItem('msdeep_bg', v), bg);
  await p.locator('[data-action="start"]').click(); await p.locator(`[data-mode="${mode}"]`).click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="cataclysm"]').click(); await W(p, 1000);
  await E(p, () => { const e = __engine; for (const id of ['frost_nova','thunderstorm','arcane_missiles','spirit']) e.learnSpell(id); for (let k = 0; k < 12; k++) for (const s of e.spells) if (!s.isCombo && s.level < s.maxLevel) e.learnSpell(s.id); e.stats.maxHp = 1e9; e.stats.hp = 1e9; e.stats.maxXp = 1e12; e.pause(); });
  const rows = [];
  for (let m = 0; m <= +mins; m++) {
    if (m > 0) for (let c = 0; c < 6; c++) {
      await E(p, (m) => { const e = __engine; e.stats.hp = e.stats.maxHp; e.stats.maxXp = 1e12;
        if (m % 4 === 2) e.toggleFlight(true); if (m % 4 === 3) e.toggleFlight(false);
        if (m % 7 === 6 && e.cata.phase === 'idle') { e.cata.cooldown = 0; e.triggerCataclysm(); }
        e.__upd = (e.__upd || 0) + e.soakSteps(300); }, m);
    }
    // close modals
    for (let i = 0; i < 6; i++) { const el = await p.$('[data-modal] [data-choice]'); if (!el) break; await el.click().catch(() => {}); await W(p, 60); }
    await E(p, () => __engine.pause());
    await cdp.send('HeapProfiler.collectGarbage');
    const r = await E(p, () => { const e = __engine; const upd = (e.__upd || 0) / 6; e.__upd = 0; const t0 = performance.now(); const u1 = e.soakSteps(30); const draw = e.soakRender(20);
      return { stats: e.perfStats(), updMs: +(upd || u1).toFixed(3), drawMs: +draw.toFixed(3), heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(2), dom: document.getElementsByTagName('*').length, sound: window.__sound ? __sound.state().voices : null, phase: e.cata.phase, alt: e.flightState().alt, region: e.regionIdx, loot: e.lootItems.reduce((a, l) => (a[l.type] = (a[l.type] || 0) + 1, a), {}), lootFar: e.lootItems.filter(l => Math.hypot(l.x - e.playerX, l.y - e.playerY) > 900).length, domTop: (() => { const c = {}; for (const el of document.querySelectorAll('body *')) { const k = el.parentElement?.getAttribute('data-hud') || el.parentElement?.className?.toString().slice(0, 40); if (k) c[k] = (c[k] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4); })(), endless: e.inEndless }; });
    if (m % 5 === 0) { // real-time: run the actual RAF loop (React HUD included) for 3 s
      const M = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
      await E(p, () => { __engine.stats.hp = __engine.stats.maxHp; __engine.resume(); window.__fr = 0; const f = () => { window.__fr++; if (window.__fr < 1e9) requestAnimationFrame(f); }; requestAnimationFrame(f); });
      const a = await M(); await W(p, 3000); const z = await M(); const fr = await E(p, () => { const n = window.__fr; window.__fr = 1e9; __engine.pause(); return n; });
      const ms = (k) => ((z[k] - a[k]) * 1000) / Math.max(1, fr);
      r.rt = { fps: +(fr / 3).toFixed(1), scriptMsPerFrame: +ms('ScriptDuration').toFixed(2), styleLayoutMsPerFrame: +(ms('RecalcStyleDuration') + ms('LayoutDuration')).toFixed(2), taskMsPerFrame: +ms('TaskDuration').toFixed(2) };
      console.log('  rt', JSON.stringify(r.rt));
    }
    r.minute = m; rows.push(r);
    const s = r.stats; console.log(`m${m} upd ${r.updMs} draw ${r.drawMs} heap ${r.heapMB} dom ${r.dom} en ${s.enemies} pr ${s.projectiles} pa ${s.particles} dn ${s.damageNumbers} loot ${s.lootItems} z ${s.zones} lab ${s.labels} snd ${r.sound} ${r.phase} ${r.alt} reg ${r.region}`);
  }
  fs.writeFileSync(out, JSON.stringify({ rows, errs: errs.slice(0, 20) }, null, 1));
  console.log('errors', errs.length, errs.slice(0, 3));
  await b.close();
})();
