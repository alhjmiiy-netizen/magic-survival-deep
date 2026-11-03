const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const [,, base, prefix, scen] = process.argv;
const VP = [[390,844,3],[360,800,3],[412,915,2],[412,915,2.6],[915,412,2.6]];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/ungoogled-chromium/chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const out = [];
  for (const [w,h,d] of (scen==='all'?VP:[[390,844,3]])) for (const s of (scen==='all'?['plain']:scen.split(','))) {
    const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:d, hasTouch:true, isMobile:true });
    const p = await ctx.newPage(); const errs=[]; p.on('console',m=>m.type()==='error'&&errs.push(m.text())); p.on('pageerror',e=>errs.push(e.message));
    if (s==='cssdead') await p.route(/assets\/.*\.css/, r => r.fulfill({status:404,body:''}));
    if (s==='css404') await p.route(/\.css$/, r => r.request().url().includes('/assets/') ? r.fulfill({status:404,body:''}) : r.continue());
    if (s==='slow') { const c = await ctx.newCDPSession(p); await c.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:50000,uploadThroughput:20000}); }
    if (s==='oldsw') { await p.goto('https://alhjmiiy-netizen.github.io/magic-survival-rebuild/',{waitUntil:'networkidle'}); await p.waitForTimeout(3000); }
    await p.goto(base,{waitUntil:'networkidle',timeout:120000}); await p.waitForTimeout(2500);
    if (s==='oldsw'||s==='reload') { await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(2500); }
    const info = await p.evaluate(async()=>({bg:getComputedStyle(document.body).backgroundColor, btn:(()=>{const x=document.querySelector('[data-mode]');return x&&getComputedStyle(x).backgroundColor})(), css:[...document.styleSheets].map(x=>x.href).filter(Boolean), sw:(await navigator.serviceWorker?.getRegistrations()||[]).map(r=>r.scope), caches: await caches.keys()}));
    const f=`/workspace/deploy/magic-deep-shots/${prefix}-${s}-${w}x${h}@${d}.png`; await p.screenshot({path:f});
    out.push({s,w,h,d,f,errs,...info}); await ctx.close();
  }
  console.log(JSON.stringify(out,null,1)); await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
