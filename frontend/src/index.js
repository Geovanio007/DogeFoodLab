import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { installWalletErrorSwallow } from './lib/walletErrors';

// Swallow non-fatal wallet-connection errors thrown by the DogeOS SDK on
// mobile (e.g. "MyDoge not supported") so they don't crash / reload the
// app on iOS Safari / Android Chrome / Telegram WebView.
installWalletErrorSwallow();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// SW strategy: unregister everything and never re-register.
//
// Previously this block called navigator.serviceWorker.register() on every
// page load — which caused an infinite loop:
//   register() → browser fetches /service-worker.js → kill-switch activates
//   → unregisters itself → app re-registers on next load → repeat forever.
//
// The fix: only unregister. The permanent no-op /service-worker.js stays
// deployed so browsers that cached the old SW URL don't get a 404 rejection,
// but we never call register() again so no new SW is ever installed.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => {
        regs.forEach((r) => { try { r.unregister(); } catch (e) { /* noop */ } });
      })
      .catch(() => { /* noop */ });
  });
}
