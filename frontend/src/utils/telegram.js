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
