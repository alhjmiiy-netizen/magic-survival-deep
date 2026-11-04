// node qa/prof.cjs <url> <mode> <minutes> : CPU-profile 3 s of the real loop at that game minute
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, mode, mins] = process.argv; const E = (p, f, a) => p.evaluate(f, a); const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 800);
  await p.locator('[data-action="start"]').click(); await p.locator(`[data-mode="${mode}"]`).click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="cataclysm"]').click(); await W(p, 1000);
  await E(p, () => { const e = __engine; for (const id of ['frost_nova','thunderstorm','arcane_missiles','spirit']) e.learnSpell(id); for (let k = 0; k < 12; k++) for (const s of e.spells) if (!s.isCombo && s.level < s.maxLevel) e.learnSpell(s.id); e.stats.maxHp = 1e9; e.stats.hp = 1e9; e.stats.maxXp = 1e12; e.pause(); });
  for (let m = 1; m <= +mins; m++) for (let c = 0; c < 6; c++) await E(p, () => { const e = __engine; e.stats.hp = e.stats.maxHp; e.soakSteps(300); });
  for (let i = 0; i < 6; i++) { const el = await p.$('[data-modal] [data-choice]'); if (!el) break; await el.click().catch(() => {}); await W(p, 60); }
  console.log(JSON.stringify(await E(p, () => __engine.perfStats())));
  await E(p, () => { window.__prof = {}; __engine.stats.hp = __engine.stats.maxHp; __engine.resume(); });
  await W(p, 1500); await E(p, () => { window.__prof = {}; window.__pf = 0; const f = () => { window.__pf++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
  await W(p, 3000);
  const { profile } = await cdp.send('Profiler.stop');
  const sec = await E(p, () => { const n = window.__pf; const r = {}; for (const [k, v] of Object.entries(window.__prof)) r[k] = +(v / n).toFixed(2); window.__prof = undefined; return { frames: n, r }; });
  console.log('sections ms/frame (flushed)', JSON.stringify(sec));
  const self = {}; const dt = profile.timeDeltas; const byId = {}; for (const n of profile.nodes) byId[n.id] = n;
  for (let i = 0; i < profile.samples.length; i++) { const n = byId[profile.samples[i]]; const k = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + (dt[i] || 0) / 1000; }
  console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => v.toFixed(0) + 'ms ' + k).join('\n'));
  await b.close();
})();
