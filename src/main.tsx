import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './ui.css';

createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);

declare const __MSDEEP_VER__: string;
// Self-heal: when a new service worker takes control of an already-controlled page, reload once.
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had || sessionStorage.getItem('msdeep_swreload') === __MSDEEP_VER__) return;
    sessionStorage.setItem('msdeep_swreload', __MSDEEP_VER__);
    location.reload();
  });
}

// Runtime guard: if the stylesheet failed to load or the browser lacks grid, show a readable fallback.
setTimeout(() => {
  try {
    const ok = getComputedStyle(document.documentElement).getPropertyValue('--ms-ok').trim() === '1';
    const grid = !!(window.CSS && CSS.supports && CSS.supports('display', 'grid'));
    if (!ok || !grid) {
      const d = document.createElement('div');
      d.id = 'ms-fb';
      d.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#000;color:#fff;padding:16px;font:16px sans-serif;text-align:center;border-top:2px solid #e5c158');
      d.innerHTML = 'The game\'s styles did not load on this browser. <button style="margin-left:8px;padding:10px 18px;background:#e5c158;color:#000;border:0;font-weight:bold" onclick="location.reload()">Reload</button>';
      document.body.appendChild(d);
    }
  } catch { /* ignore */ }
}, 2500);
