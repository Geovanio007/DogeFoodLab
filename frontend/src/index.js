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

// SW handling strategy:
//   1. Unregister any pre-existing (potentially broken) SW.
//   2. Then register the kill-switch SW at /service-worker.js.
//
// Registering — instead of just unregistering — gives the browser an explicit
// opportunity to check for SW updates on every page load, which is what
// actually replaces the old broken SW on affected users' devices.
// The kill-switch SW activates immediately, claims clients, wipes caches,
// then unregisters itself. After that no SW remains, page loads natively.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Best-effort cleanup of legacy registrations
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => { try { r.unregister(); } catch (e) { /* noop */ } });
    }).catch(() => { /* noop */ });

    // Then explicitly register the kill-switch so the browser refetches
    // /service-worker.js and replaces any older broken version.
    navigator.serviceWorker.register('/service-worker.js')
      .then((r) => { try { r.update(); } catch (e) { /* noop */ } })
      .catch(() => { /* noop — failures here are non-fatal */ });
  });
}