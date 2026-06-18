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

// SW strategy v8 (June 2026):
//   - We no longer auto-register the SW on page load.
//   - We no longer auto-unregister all SWs on page load (this used to
//     wipe out the push subscription on every visit).
//   - The push SW (`/service-worker.js` v8 — no fetch handler) is
//     registered LAZILY by NotificationContext when the user enables
//     notifications in Settings. That keeps MyDoge WebView happy and
//     avoids any update loop.
