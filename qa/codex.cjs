// Encyclopedia vs. game constants. Usage: node qa/codex.cjs <url> <tag>
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, url, tag = 'v6-ency'] = process.argv;
const S = (n) => `/workspace/deploy/magic-deep-shots/${tag}-${n}.png`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const base = '/';
  // 1. data-level checks: the generated text contains the real constants
  const data = await p.evaluate(async (base) => {
    const C = await import(base + 'src/game/codex.ts'); const D = await import(base + 'src/game/deep.ts'); const T = await import(base + 'src/game/tuning.ts');
    const SP = await import(base + 'src/game/spells.ts'); const EN = await import(base + 'src/game/enemies.ts'); const CA = await import(base + 'src/game/cataclysm.ts');
    const codex = C.buildCodex(); const fails = []; const byId = Object.fromEntries(codex.map((e) => [e.id, e]));
    const txt = (id) => { const e = byId[id]; return e ? [e.name, e.tag, ...e.lines, ...(e.stats || []).map((s) => s.join(': '))].join(' | ') : ''; };
    const need = (id, s) => { if (!txt(id).includes(s)) fails.push(`${id} missing "${s}"`); };
    for (const r of D.REGIONS) { need('region:' + r.id, C.fmtTime(r.duration)); need('region:' + r.id, r.boss.name); need('region:' + r.id, `every ${r.hazard.every} s`); }
    need('guide:modes', C.fmtTime(D.REGIONS[0].duration)); need('guide:modes', C.fmtTime(D.ENDLESS_BOSS_EVERY)); need('guide:modes', String(D.ENDLESS_CAP)); need('guide:modes', `${T.ELITE_EVERY} s`);
    need('guide:flight', String(T.FLIGHT_LIFT)); need('guide:flight', `×${T.SOAR_SPEED}`); need('guide:flight', `×${T.HOVER_SPEED}`); need('guide:flight', `+${Math.round((T.SOAR_DMG - 1) * 100)}%`); need('guide:flight', 'endless');
    need('guide:cataclysm', `${T.CATA_SCENE} s`); need('guide:cataclysm', C.fmtTime(T.CATA_CD)); need('guide:cataclysm', `+${T.CATA_GAIN.fusion}`);
    need('guide:charge', `${T.CHARGE_MAX} s`); need('fusion:rules', `${T.FUSION_CD} s`); need('fusion:rules', `${T.FUSION_WINDOW} s`);
    for (const id of SP.BASE_SPELL_IDS) { const s = SP.BASE_SPELLS[id]; need('magic:' + id, `${s.cooldown} s`); need('magic:' + id, String(s.damage)); }
    for (const a of D.ARTIFACTS) for (let l = 1; l <= a.max; l++) need('art:' + a.id, a.desc(l));
    for (const [t, d] of Object.entries(EN.ENEMY_DEFS)) { need('enemy:' + t, String(d.hp)); need('enemy:' + t, d.name); }
    for (const k of Object.keys(CA.SCENES)) need('scene:' + k, `${T.CATA_SCENE} s`);
    for (const k of Object.keys(T.FUSIONS)) if (!byId['fusion:' + k]) fails.push('no fusion entry ' + k);
    // stale numbers anywhere in the codex
    const all = codex.map((e) => [e.name, ...e.lines].join(' ')).join('\n');
    if (D.REGIONS[0].duration !== 180 && /3 min/.test(all)) fails.push('stale "3 min"');
    return { entries: codex.length, tabs: [...new Set(codex.map((e) => e.tab))], counts: { artifacts: codex.filter((e) => e.tab === 'artifacts').length, bestiary: codex.filter((e) => e.tab === 'bestiary').length, fusions: Object.keys(T.FUSIONS).length }, fails };
  }, base);
  // 2. UI: open the Grimoire, every tab renders, detail text == codex text
  await p.click('[data-nav="grimoire"]'); await p.waitForSelector('[data-testid="encyclopedia"]');
  const ui = {};
  for (const t of data.tabs) {
    await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(250);
    const n = await p.$$eval('[data-entry]', (e) => e.length); ui[t] = n;
    const first = await p.$('[data-entry]'); if (first) { await first.click(); await p.waitForTimeout(120); }
    await p.screenshot({ path: S(t) });
  }
  // detail panel spot check vs data for a region entry
  await p.click('[data-tab="world"]'); await p.click('[data-entry="region:r1"]'); await p.waitForTimeout(150);
  const detail = await p.$eval('[data-testid="codex-detail"]', (e) => e.textContent);
  const r1 = await p.evaluate(async (base) => { const C = await import(base + 'src/game/codex.ts'); const D = await import(base + 'src/game/deep.ts'); return C.fmtTime(D.REGIONS[0].duration); }, base);
  const detailOk = detail.includes(r1);
  const matrix = await p.$('[data-tab="fusions"]').then(async (x) => { await x.click(); await p.waitForTimeout(150); return p.$$eval('[data-testid="pair-matrix"] td', (td) => td.filter((t) => t.textContent !== '—').length); });
  const ok = data.fails.length === 0 && detailOk && matrix === data.counts.fusions * 2 && Object.values(ui).every((n) => n > 0) && !errs.length;
  console.log(JSON.stringify({ ok, ...data, ui, detailOk, matrixCells: matrix, errs }, null, 1));
  await b.close(); process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
