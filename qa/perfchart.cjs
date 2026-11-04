// node qa/perfchart.cjs -> prints markdown table, writes v6-perf-chart.png
const fs = require('fs');
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const L = (f) => JSON.parse(fs.readFileSync(f)).rows;
const sets = {}; for (const v of ['before', 'after']) for (const m of ['endless', 'regions']) sets[`${v}-${m}`] = L(`/tmp/s6-${v}-${m}.json`);
const MIN = [5, 10, 15, 20, 30]; let md = '';
for (const m of ['endless', 'regions']) {
  md += `\n### ${m}\n| min | enemies b/a | update ms b/a | draw ms b/a | rt fps b/a | rt task ms/frame b/a | heap MB b/a |\n|---|---|---|---|---|---|---|\n`;
  for (const t of MIN) { const b = sets[`before-${m}`].find((r) => r.minute === t), a = sets[`after-${m}`].find((r) => r.minute === t); if (!b || !a) continue;
    const f = (k) => `${k(b)} / ${k(a)}`; md += `| ${t} | ${f((r) => r.stats.enemies)} | ${f((r) => r.updMs)} | ${f((r) => r.drawMs)} | ${f((r) => r.rt?.fps ?? '-')} | ${f((r) => r.rt?.taskMsPerFrame ?? '-')} | ${f((r) => r.heapMB)} |\n`; }
}
console.log(md); fs.writeFileSync('/tmp/perf-table.md', md);
const W = 1100, H = 300, pad = 50;
const chart = (title, key, mode) => { const series = ['before', 'after'].map((v) => sets[`${v}-${mode}`].map((r) => [r.minute, key(r)]));
  const mx = Math.max(1, ...series.flat().map((p) => p[1])); const X = (m) => pad + (m / 30) * (W / 2 - pad * 2), Y = (v) => H - pad - (v / mx) * (H - pad * 2);
  const path = (s) => s.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('');
  return `<svg width="${W / 2}" height="${H}" style="background:#111;font:12px sans-serif"><text x="10" y="18" fill="#fff">${title} (${mode})</text>
  <text x="10" y="${pad}" fill="#888">${mx.toFixed(1)}</text><line x1="${pad}" x2="${W / 2 - pad}" y1="${H - pad}" y2="${H - pad}" stroke="#555"/>
  ${[0, 5, 10, 15, 20, 25, 30].map((m) => `<text x="${X(m) - 6}" y="${H - pad + 16}" fill="#888">${m}</text>`).join('')}
  <path d="${path(series[0])}" stroke="#f87171" fill="none" stroke-width="2"/><path d="${path(series[1])}" stroke="#4ade80" fill="none" stroke-width="2"/>
  <text x="${W / 2 - 160}" y="18" fill="#f87171">before</text><text x="${W / 2 - 100}" y="18" fill="#4ade80">after</text></svg>`; };
const html = `<body style="margin:0;background:#000;display:flex;flex-wrap:wrap;width:${W}px">${['endless', 'regions'].map((m) => chart('draw ms / frame', (r) => r.drawMs, m) + chart('update ms / step', (r) => r.updMs, m)).join('')}${['endless', 'regions'].map((m) => chart('enemies', (r) => r.stats.enemies, m)).join('')}</body>`;
(async () => { const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', args: ['--no-sandbox'] }); const p = await b.newPage({ viewport: { width: W, height: H * 3 } }); await p.setContent(html); await p.screenshot({ path: '/workspace/deploy/magic-deep-shots/v6-perf-chart.png' }); await b.close(); })();
