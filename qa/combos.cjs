// All-pairs combo test. node qa/combos.cjs <url> [tag]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const fs = require('fs');
const [,, url, tag = 'v6-combos'] = process.argv;
const DIR = '/workspace/deploy/magic-deep-shots/'; const S = (n) => `${DIR}${tag}-${n}.png`;
const W = (p, ms) => p.waitForTimeout(ms); const E = (p, f, a) => p.evaluate(f, a);
const SP = { fire: 'cataclysm', ice: 'frost_nova', lightning: 'thunderstorm', arcane: 'arcane_missiles', spirit: 'spirit', poison: 'poison_cloud', wind: 'cyclone', earth: 'stone_spikes', water: 'tidal_wave', light: 'holy_smite' };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await W(p, 600);
  await p.locator('[data-action="start"]').click(); await p.locator('[data-mode="regions"]').click();
  await p.waitForSelector('[data-modal="startspell"]'); await p.locator('[data-choice="frost_nova"]').click(); await W(p, 800);
  await E(p, (SP) => { const e = __engine; e.stats.maxHp = 1e9; e.stats.hp = 1e9; e.stats.maxXp = 1e12; for (const id of Object.values(SP)) if (!e.spells.find((s) => s.id === id)) e.learnSpell(id); for (let i = 0; i < 8; i++) e.learnSpell('spirit'); e.clearEnemies();
    window.__played = []; const s = window.__sound; const o = s.play.bind(s); s.play = (n, v) => { window.__played.push(n); return o(n, v); }; }, SP);
  const keys = await E(p, () => __engine.pairState().map((q) => q.key));
  const R = { pairs: {}, keys };
  const shots = [];
  for (const k of keys) {
    const [a, c] = k.split('+');
    const r = await E(p, ({ a, c, k, SP }) => { const e = __engine; e.clearEnemies(); e.pairCd = {}; e.lastByEl = {}; e.cata.meter = 0; e.cata.pending = false; e.cata.recent = []; e.cata.phase = 'idle'; e.cata.cdUntil = 0; e.cata.t = 0;
      for (let i = 0; i < 14; i++) e.spawnEnemy('imp', 140 + (i % 4) * 30, -60 + Math.floor(i / 4) * 40);
      for (const q of e.enemies) { q.hp = q.maxHp = 1e7; }
      const hp0 = e.enemies.reduce((s, q) => s + q.hp, 0); const m0 = e.cata.meter; const l0 = e.pairLog.length; window.__played = []; const z0 = e.zones.length, b0 = e.beams.length;
      e.noteCastForFusion(SP[a]); e.noteCastForFusion(SP[c]);
      const last = e.pairLog[e.pairLog.length - 1];
      return { triggered: e.pairLog.length - l0, key: last?.key, hits: last?.hits, dmg: Math.round(hp0 - e.enemies.reduce((s, q) => s + q.hp, 0)), meter: Math.round(e.cata.meter - m0), sound: window.__played.includes('pair_' + k), cd: +(e.pairCd[k] ?? 0).toFixed(2), zones: e.zones.length - z0, beams: e.beams.length - b0, frozen: e.enemies.filter((q) => (q.frozenUntil ?? 0) > performance.now()).length, feed: e.cataclysmState().feed.map((f) => f.txt) };
    }, { a, c, k, SP });
    // immediate repeat must be blocked by the per-pair cooldown
    r.repeatBlocked = await E(p, ({ a, c, SP }) => { const e = __engine; const l0 = e.pairLog.length; e.noteCastForFusion(SP[a]); e.noteCastForFusion(SP[c]); return e.pairLog.length === l0; }, { a, c, SP });
    await W(p, 140); const f = S('pair-' + k.replace('+', '_')); await p.screenshot({ path: f }); shots.push([k, f]);
    if (a === 'cataclysm') await W(p, 10);
    if (!r.triggered) await W(p, 1);
    await E(p, () => { const e = __engine; if (e.cata.phase !== 'idle' || e.cata.pending) { e.cata.meter = 0; e.cata.pending = false; } });
    R.pairs[k] = r;
  }
  // chaining: different pairs while another is cooling down
  R.chain = await E(p, (SP) => { const e = __engine; e.pairCd = {}; e.lastByEl = {}; const l0 = e.pairLog.length; e.noteCastForFusion(SP.fire); e.noteCastForFusion(SP.ice); e.noteCastForFusion(SP.lightning); e.noteCastForFusion(SP.arcane); return { fired: e.pairLog.slice(l0).map((q) => q.key), cds: Object.fromEntries(Object.entries(e.pairCd).filter(([, v]) => v > 0).map(([k, v]) => [k, +v.toFixed(2)])) }; }, SP);
  // cooldown expiry in game time (~4 s)
  const t0 = await E(p, () => __engine.gameTimeSeconds);
  await p.waitForFunction(() => (__engine.pairCd['fire+ice'] ?? 0) === 0, null, { timeout: 30000 });
  R.cdExpiry = { gameSeconds: +(await E(p, () => __engine.gameTimeSeconds) - t0).toFixed(2), retrigger: await E(p, (SP) => { const e = __engine; e.lastByEl = {}; const l0 = e.pairLog.length; e.noteCastForFusion(SP.fire); e.noteCastForFusion(SP.ice); return e.pairLog.length - l0; }, SP) };
  await W(p, 150); await p.screenshot({ path: S('feed') });
  R.feedHud = await p.locator('[data-hud="cata-feed"]').count();
  // sounds: offline render each pair sound, check non-silent + distinct
  R.sfx = await E(p, async (keys) => { const out = {}; for (const k of keys) { const ac = new OfflineAudioContext(1, 44100 * 2.4, 44100); __sfxm.SFX['pair_' + k](ac, ac.destination, 0, 1); const buf = await ac.startRendering(); const d = buf.getChannelData(0); let ss = 0, zc = 0; for (let i = 1; i < d.length; i++) { ss += d[i] * d[i]; if ((d[i] > 0) !== (d[i - 1] > 0)) zc++; } out[k] = { rms: +Math.sqrt(ss / d.length).toFixed(4), zcr: Math.round(zc / 2.4) }; } return out; }, keys);
  // combos screen
  await E(p, () => { const e = __engine; e.pairCd['fire+spirit'] = 2.5; });
  await p.keyboard.press('Escape'); await W(p, 400);
  const btn = p.locator('[aria-label="Combos"]'); if (await btn.count()) await btn.first().click(); await W(p, 500);
  R.screen = await E(p, () => ({ open: !!document.querySelector('[data-modal="combos"]'), cards: document.querySelectorAll('[data-modal="combos"] [data-pair]').length, icons: document.querySelectorAll('[data-modal="combos"] [data-pair-icon]').length, counts: document.querySelectorAll('[data-modal="combos"] [data-count]').length, stale: /3\.5s|2\.2s|2,450/.test(document.querySelector('[data-modal="combos"]')?.textContent ?? '') }));
  await p.screenshot({ path: S('screen') });
  await p.locator('[data-modal="combos"] [data-pair="lightning+spirit"]').click(); await W(p, 200); await p.screenshot({ path: S('screen-detail') });
  R.errors = errs; await b.close();
  // contact sheet
  const { execSync } = require('child_process');
  fs.writeFileSync('/tmp/sheet.py', `
from PIL import Image, ImageDraw
import json
shots=json.loads(${JSON.stringify(JSON.stringify(shots))})
W,H=300,200; C=9; sheet=Image.new('RGB',(W*C,(H+24)*((len(shots)+C-1)//C)),(10,10,20)); d=ImageDraw.Draw(sheet)
for i,(k,f) in enumerate(shots):
  im=Image.open(f).convert('RGB').resize((W,H)); x=(i%C)*W; y=(i//C)*(H+24); sheet.paste(im,(x,y+24)); d.text((x+8,y+6),k,fill=(255,255,255))
sheet.save('${DIR}'+'${tag}'+'-sheet.png')`);
  execSync('python3 /tmp/sheet.py');
  const P = Object.values(R.pairs);
  R.bad = Object.entries(R.pairs).filter(([, q]) => !(q.triggered === 1 && q.hits > 0 && q.dmg > 0 && q.sound && q.meter > 0 && q.cd > 3.9 && q.repeatBlocked)).map(([k]) => k);
  R.ok = P.length === 45 && P.every((q) => q.triggered === 1 && q.hits > 0 && q.dmg > 0 && q.sound && q.meter > 0 && q.cd > 3.9 && q.repeatBlocked && q.feed.length) && R.chain.fired.length === 2 && R.cdExpiry.retrigger === 1 && R.screen.cards === 45 && R.screen.icons >= 45 && !R.screen.stale && new Set(Object.values(R.sfx).map((s) => s.zcr)).size >= 40 && Object.values(R.sfx).every((s) => s.rms > 0.01) && !errs.length;
  fs.writeFileSync(`qa/results/${tag}.json`, JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
})();
