import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

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
