import WebApp from '@twa-dev/sdk';

// Initialize Telegram WebApp
export const initTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    WebApp.ready();
    return true;
  }
  return false;
};

// Check if running inside Telegram
export const isTelegramWebApp = () => {
  return typeof window !== 'undefined' && 
         window.Telegram?.WebApp?.initData && 
         window.Telegram.WebApp.initData.length > 0;
};

// Get Telegram user data
export const getTelegramUser = () => {
  if (!isTelegramWebApp()) return null;
  try {
    const webApp = window.Telegram.WebApp;
    return webApp.initDataUnsafe?.user || null;
  } catch (error) {
    console.error('Error getting Telegram user:', error);
    return null;
  }
};

// Get Telegram init data for authentication
export const getTelegramInitData = () => {
  if (!isTelegramWebApp()) return null;
  try {
    return window.Telegram.WebApp.initData;
  } catch (error) {
    console.error('Error getting Telegram init data:', error);
    return null;
  }
};

const updateViewportHeight = () => {
  if (typeof window === 'undefined') return;
  try {
    const webApp = window.Telegram?.WebApp;
    const viewportHeight = webApp?.viewportStableHeight || webApp?.viewportHeight || window.innerHeight;
    document.documentElement.style.setProperty('--tg-viewport-height', `${viewportHeight}px`);
    document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);
    document.body.style.height = `${viewportHeight}px`;
    document.body.style.minHeight = `${viewportHeight}px`;
    document.body.style.maxHeight = `${viewportHeight}px`;
  } catch (error) {
    console.error('Error updating viewport height:', error);
  }
};

export const expandTelegramWebApp = () => {
  if (isTelegramWebApp()) {
    try {
      const webApp = window.Telegram.WebApp;
      webApp.expand();
      webApp.enableClosingConfirmation();
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
      document.body.classList.add('telegram-webapp');
      document.documentElement.classList.add('telegram-webapp');
      document.body.style.touchAction = 'manipulation';
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.body.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
      document.body.style.paddingLeft = 'env(safe-area-inset-left)';
      document.body.style.paddingRight = 'env(safe-area-inset-right)';
      updateViewportHeight();
      webApp.onEvent('viewportChanged', ({ isStateStable }) => {
        if (isStateStable) updateViewportHeight();
      });
      window.addEventListener('resize', () => {
        setTimeout(updateViewportHeight, 100);
      });
    } catch (error) {
      console.error('Error expanding Telegram WebApp:', error);
    }
  }
};

export const setTelegramHeaderColor = (color = '#1f2937') => {
  if (isTelegramWebApp()) {
    try {
      window.Telegram.WebApp.setHeaderColor(color);
    } catch (error) {
      console.error('Error setting Telegram header color:', error);
    }
  }
};

export const showTelegramMainButton = (text, onClick) => {
  if (isTelegramWebApp()) {
    try {
      const webApp = window.Telegram.WebApp;
      webApp.MainButton.text = text;
      webApp.MainButton.show();
      webApp.MainButton.onClick(onClick);
    } catch (error) {
      console.error('Error showing Telegram main button:', error);
    }
  }
};

export const hideTelegramMainButton = () => {
  if (isTelegramWebApp()) {
    try {
      window.Telegram.WebApp.MainButton.hide();
    } catch (error) {
      console.error('Error hiding Telegram main button:', error);
    }
  }
};

export const showTelegramPopup = (title, message, buttons = []) => {
  if (isTelegramWebApp()) {
    try {
      window.Telegram.WebApp.showPopup({ title, message, buttons });
    } catch (error) {
      console.error('Error showing Telegram popup:', error);
    }
  }
};

export const closeTelegramWebApp = () => {
  if (isTelegramWebApp()) {
    try {
      window.Telegram.WebApp.close();
    } catch (error) {
      console.error('Error closing Telegram WebApp:', error);
    }
  }
};

export const getTelegramTheme = () => {
  if (!isTelegramWebApp()) return null;
  try {
    return window.Telegram.WebApp.themeParams;
  } catch (error) {
    console.error('Error getting Telegram theme:', error);
    return null;
  }
};

export const isTelegramMobile = () => {
  if (!isTelegramWebApp()) return false;
  try {
    const webApp = window.Telegram.WebApp;
    const platform = webApp.platform;
    return platform === 'ios' || platform === 'android' || 
           window.innerWidth <= 768 || 
           /Mobi|Android/i.test(navigator.userAgent);
  } catch (error) {
    return window.innerWidth <= 768;
  }
};

export const getTelegramViewport = () => {
  if (!isTelegramWebApp()) {
    return { width: window.innerWidth, height: window.innerHeight, isExpanded: true, isStable: true };
  }
  try {
    const webApp = window.Telegram.WebApp;
    return {
      width: window.innerWidth,
      height: webApp.viewportHeight || window.innerHeight,
      stableHeight: webApp.viewportStableHeight || window.innerHeight,
      isExpanded: webApp.isExpanded,
      isStable: true
    };
  } catch (error) {
    return { width: window.innerWidth, height: window.innerHeight, isExpanded: true, isStable: true };
  }
};

export const optimizeForTelegramPlatform = () => {
  if (!isTelegramWebApp()) return;
  try {
    const isMobile = isTelegramMobile();
    if (isMobile) {
      document.body.style.fontSize = '16px';
      document.documentElement.style.fontSize = '16px';
      document.body.classList.add('telegram-mobile');
      document.body.style.overscrollBehavior = 'none';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
    } else {
      document.body.classList.add('telegram-desktop');
    }
    const themeParams = getTelegramTheme();
    if (themeParams) {
      const root = document.documentElement;
      if (themeParams.bg_color) root.style.setProperty('--tg-bg-color', themeParams.bg_color);
      if (themeParams.text_color) root.style.setProperty('--tg-text-color', themeParams.text_color);
      if (themeParams.button_color) root.style.setProperty('--tg-button-color', themeParams.button_color);
      if (themeParams.hint_color) root.style.setProperty('--tg-hint-color', themeParams.hint_color);
    }
  } catch (error) {
    console.error('Error optimizing for Telegram platform:', error);
  }
};

// REMOVED: installTelegramWalletDeepLinkBridge
// This function was intercepting wallet deep links and calling webApp.openLink()
// on non-https:// URLs (okx://, wc:// etc.) which Telegram cannot handle,
// causing the ERR_UNKNOWN_URL_SCHEME crash. WalletConnect handles its own
// redirect flow safely without needing this bridge.
export const installTelegramWalletDeepLinkBridge = () => {
  // Intentionally disabled - do not restore
  console.log('â„¹ï¸ Wallet deep-link bridge disabled (prevents ERR_UNKNOWN_URL_SCHEME)');
};

// ─── Safe wallet deep-link bridge ───────────────────────────────────────────
// Different from the disabled bridge above in one deliberate way: it NEVER
// calls webApp.openLink() on a raw non-https:// URL (that's what crashed
// before). It only acts on a small whitelist of wallets whose official
// https:// universal-link redirector is confirmed — that redirector is what
// gets handed to Telegram, and the wallet's own https domain is what
// re-opens the native app from there. Any URL that isn't on the whitelist —
// including schemes this doesn't recognize — falls straight through to the
// original window.open, completely unchanged. So the worst case for an
// unlisted wallet is today's existing behavior (it opens inside that
// wallet's own in-app browser), never a crash.
//
// Confirmed mappings only:
//   - OKX Wallet: https://web3.okx.com/build/docs/waas/app-universal-link
//   - MetaMask:   metamask://<path> -> https://metamask.app.link/<path>
// Add more here (with a source link in the comment) as specific wallets
// from the connect modal turn out to need it.
const WALLET_UNIVERSAL_LINKS = [
  { scheme: 'okx://', toHttps: (raw) => `https://www.okx.com/download?deeplink=${encodeURIComponent(raw)}` },
  { scheme: 'metamask://', toHttps: (raw) => `https://metamask.app.link/${raw.slice('metamask://'.length)}` },
];

let safeWalletBridgeInstalled = false;

export const installSafeWalletDeepLinkBridge = () => {
  if (safeWalletBridgeInstalled) return;
  if (typeof window === 'undefined' || !isTelegramWebApp()) return;

  const originalOpen = window.open.bind(window);
  safeWalletBridgeInstalled = true;

  window.open = (url, ...rest) => {
    try {
      if (typeof url === 'string') {
        const match = WALLET_UNIVERSAL_LINKS.find((w) => url.startsWith(w.scheme));
        if (match) {
          const httpsUrl = match.toHttps(url);
          window.Telegram.WebApp.openLink(httpsUrl, { try_instant_view: false });
          console.log('Redirected wallet deep link via Telegram openLink:', httpsUrl);
          // Minimal window-like stub so any caller that inspects the return
          // value (e.g. checking `.closed` to detect a blocked popup) reads
          // this as a successful hand-off rather than a failure.
          return { closed: false, close: () => {}, focus: () => {} };
        }
      }
    } catch (error) {
      console.error('[wallet-bridge] deep link conversion failed, falling back to default:', error);
    }
    return originalOpen(url, ...rest);
  };

  console.log('Safe wallet deep-link bridge installed (https-only, whitelisted wallets)');
};
