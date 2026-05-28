import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { unregister as unregisterServiceWorker } from './serviceWorkerRegistration';
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

// Service worker registration disabled to prevent net::ERR_FAILED in MyDoge wallet webview.
// /public/service-worker.js is now a self-destruct script that uninstalls any
// previously-registered SW from existing users on their next visit.
unregisterServiceWorker();