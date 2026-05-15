import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
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

// Register service worker for update detection and caching
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    console.log('[App] New version available!');
  },
  onSuccess: (registration) => {
    console.log('[App] Content cached for offline use.');
  }
});