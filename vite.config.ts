import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { transform as lcss, browserslistToTargets } from 'lightningcss';
import postcss from 'postcss';

// Version stamp: changes every build so stale caches self-heal.
const VER = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

/** Make Tailwind v4 output work on older Android Chrome/WebView: lower oklch/color-mix/nesting
 *  and unwrap @layer blocks (browsers without @layer drop the whole stylesheet = unstyled menu). */
function legacyCss() {
  return {
    name: 'msdeep-legacy-css',
    apply: 'build' as const,
    transformIndexHtml: (h: string) => h.replace('%MSDEEP_VER%', VER),
    async generateBundle(this: any, _o: any, bundle: any) {
      for (const f of Object.values<any>(bundle)) {
        if (f.type !== 'asset' || !f.fileName.endsWith('.css')) continue;
        let code = String(f.source);
        code = lcss({ filename: f.fileName, code: Buffer.from(code), minify: true,
          targets: browserslistToTargets(['chrome >= 79', 'safari >= 14', 'firefox >= 78']) }).code.toString();
        const root = postcss.parse(code);
        root.walkAtRules('layer', (r) => { if (r.nodes) r.replaceWith(r.nodes); else r.remove(); });
        // Chrome < 85 has no @property, and Tailwind's own fallback only targets Safari/Firefox:
        // emit every @property initial-value as a plain universal rule and drop @property.
        const inits: string[] = [];
        root.walkAtRules('property', (r) => {
          let iv: string | null = null;
          r.walkDecls('initial-value', (d) => { iv = d.value; });
          inits.push(`${r.params.trim()}:${iv === null ? 'initial' : iv}`);
          r.remove();
        });
        root.walkAtRules('supports', (r) => {
          if (/color-mix|margin-trim|apple-pay/.test(r.params)) r.remove(); // progressive-enhancement blocks / old fallback (replaced below)
        });
        if (inits.length) root.prepend(postcss.parse(`*,:before,:after,::backdrop{${inits.join(';')}}`));
        // Custom properties are not lowered by lightningcss: convert oklch() values in --vars to rgb.
        root.walkDecls(/^--/, (d) => {
          if (!/oklch\(/.test(d.value)) return;
          try {
            const out = lcss({ filename: 'v.css', code: Buffer.from(`a{color:${d.value}}`), minify: true,
              targets: { chrome: 79 << 16 } }).code.toString();
            const m = out.match(/color:([^;}]+)/); if (m && !/oklch/.test(m[1])) d.value = m[1];
          } catch { /* keep */ }
        });
        f.source = root.toString();
      }
      this.emitFile({ type: 'asset', fileName: 'sw-cleanup.js', source:
        `self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>(k.startsWith('msdeep-')||k.startsWith('magic-survival-deep-'))&&k.indexOf('${VER}')<0).map(k=>caches.delete(k)))))});` });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    define: { __MSDEEP_VER__: JSON.stringify(VER) },
    plugins: [
      react(),
      tailwindcss(),
      legacyCss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: './',
          name: 'Magic Survival: Deep',
          short_name: 'MS Deep',
          description: 'Dark fantasy action roguelike. Survive the void horde, evolve spells, and defeat the Colossus.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'any',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          // index.html is NOT precached: it is fetched network-first so a new deploy is always picked up.
          globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2,jpg}'],
          globIgnores: ['**/sw-cleanup.js'],
          navigateFallback: null,
          importScripts: ['sw-cleanup.js'],
          runtimeCaching: [
            { urlPattern: ({ request }: any) => request.mode === 'navigate',
              handler: 'NetworkFirst', options: { cacheName: `msdeep-pages-${VER}`, networkTimeoutSeconds: 4 } },
            { urlPattern: /\/assets\/.*-[A-Za-z0-9_-]{8}\.(js|css)$/,
              handler: 'CacheFirst', options: { cacheName: `msdeep-assets-${VER}`, expiration: { maxEntries: 80 } } },
          ],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          cacheId: `msdeep-${VER}`,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

