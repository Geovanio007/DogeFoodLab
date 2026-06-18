import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTelegram } from './TelegramContext';
import {
  registerPushServiceWorker,
  unregisterPushServiceWorker,
} from '../serviceWorkerRegistration';

const NotificationContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) output[i] = rawData.charCodeAt(i);
  return output;
}

function getStoredPlayerAddress() {
  const playerData = localStorage.getItem('dogefood_player');
  if (!playerData) return 'anonymous';
  try {
    const parsed = JSON.parse(playerData);
    return parsed.guest_id || parsed.address || parsed.id || 'anonymous';
  } catch (_) {
    return 'anonymous';
  }
}

// Web Push is unavailable inside the MyDoge in-app WebView (and most mobile
// in-app browsers). Detect cleanly so we can fall back to local Notifications.
function webPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider = ({ children }) => {
  const { telegramUser, isTelegram } = useTelegram();

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem('dogefood_notifications_enabled') === 'true'
  );
  const [treatReadyNotify, setTreatReadyNotify] = useState(
    () => localStorage.getItem('dogefood_treat_ready_notify') !== 'false'
  );
  const [limitResetNotify, setLimitResetNotify] = useState(
    () => localStorage.getItem('dogefood_limit_reset_notify') !== 'false'
  );

  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ vapidPublicKey: '', botUsername: '' });
  const [lastError, setLastError] = useState(null);

  // Load server config (VAPID key + bot username) once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/notifications/config`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setConfig({
          vapidPublicKey: data.vapidPublicKey || data.publicKey || '',
          botUsername: data.botUsername || '',
        });
      } catch (_) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Track current browser permission state.
  useEffect(() => {
    if (!isTelegram && typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [isTelegram]);

  // Persist preferences.
  useEffect(() => {
    localStorage.setItem('dogefood_notifications_enabled', notificationsEnabled.toString());
  }, [notificationsEnabled]);
  useEffect(() => {
    localStorage.setItem('dogefood_treat_ready_notify', treatReadyNotify.toString());
  }, [treatReadyNotify]);
  useEffect(() => {
    localStorage.setItem('dogefood_limit_reset_notify', limitResetNotify.toString());
  }, [limitResetNotify]);

  // ── Telegram enable flow ────────────────────────────────────────────────────
  const enableTelegram = useCallback(async () => {
    if (!telegramUser?.id) {
      setLastError('Telegram user not detected. Open the game from inside Telegram.');
      return false;
    }
    const res = await fetch(`${BACKEND_URL}/api/notifications/telegram/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: telegramUser.id,
        username: telegramUser.username || '',
        first_name: telegramUser.first_name || '',
        treat_ready: treatReadyNotify,
        limit_reset: limitResetNotify,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLastError(data.detail || 'Failed to enable Telegram notifications.');
      return false;
    }

    // Backend tells us whether the bot has been /start'd by this user.
    // If not, surface a deep link so the user can press Start.
    if (data.requires_bot_start && config.botUsername) {
      setLastError(
        `Open https://t.me/${config.botUsername} and press Start once so the bot can message you.`
      );
    }
    return true;
  }, [telegramUser, treatReadyNotify, limitResetNotify, config.botUsername]);

  // ── Web push enable flow ────────────────────────────────────────────────────
  const enableWebPush = useCallback(async () => {
    if (!webPushSupported()) {
      // Fallback path for environments without Push API (e.g. some in-app
      // browsers). We still record the preference so the in-tab toast
      // notifications via Notification API can fire while the tab is open.
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        setPermissionStatus(perm);
        if (perm !== 'granted') {
          setLastError('Notification permission denied.');
          return false;
        }
      } else {
        setLastError('This browser does not support web notifications.');
        return false;
      }

      await fetch(`${BACKEND_URL}/api/notifications/web/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_address: getStoredPlayerAddress(),
          subscription: null,
          treat_ready: treatReadyNotify,
          limit_reset: limitResetNotify,
        }),
      }).catch(() => {});
      return true;
    }

    // 1. Ask the browser for permission (MyDoge wallet's built-in browser and
    //    all standard browsers will show their native prompt here).
    const perm = await Notification.requestPermission();
    setPermissionStatus(perm);
    if (perm !== 'granted') {
      setLastError(
        perm === 'denied'
          ? 'Notifications are blocked. Enable them in your browser settings to receive treat alerts.'
          : 'Notification permission not granted.'
      );
      return false;
    }

    // 2. Register the push service worker (lazy — only when needed).
    const reg = await registerPushServiceWorker();
    if (!reg) {
      setLastError('Failed to register service worker.');
      return false;
    }

    // 3. Get the VAPID public key from the backend (loaded into config).
    if (!config.vapidPublicKey) {
      setLastError('Server VAPID key not available yet. Please try again in a moment.');
      return false;
    }

    // 4. Subscribe to push with the VAPID key.
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
        });
      } catch (err) {
        console.error('pushManager.subscribe failed', err);
        setLastError('Failed to subscribe to push: ' + (err?.message || err));
        return false;
      }
    }

    // 5. Send subscription to backend so it can deliver pushes later.
    const res = await fetch(`${BACKEND_URL}/api/notifications/web/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_address: getStoredPlayerAddress(),
        subscription: subscription.toJSON(),
        treat_ready: treatReadyNotify,
        limit_reset: limitResetNotify,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLastError(data.detail || 'Failed to register subscription with server.');
      return false;
    }
    return true;
  }, [config.vapidPublicKey, treatReadyNotify, limitResetNotify]);

  // ── Public: enable notifications (routes Telegram vs web) ───────────────────
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      const ok = isTelegram && telegramUser
        ? await enableTelegram()
        : await enableWebPush();
      if (ok) setNotificationsEnabled(true);
      return ok;
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      setLastError(err?.message || 'Unexpected error enabling notifications.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isTelegram, telegramUser, enableTelegram, enableWebPush]);

  // ── Public: disable notifications ───────────────────────────────────────────
  const disableNotifications = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      if (isTelegram && telegramUser) {
        await fetch(`${BACKEND_URL}/api/notifications/telegram/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id: telegramUser.id }),
        }).catch(() => {});
      } else {
        await fetch(`${BACKEND_URL}/api/notifications/web/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_address: getStoredPlayerAddress() }),
        }).catch(() => {});

        // Best-effort: tear down the local push subscription so the browser
        // stops trying to wake the SW. We keep the SW registered so existing
        // toasts still work — uncomment the next line to fully uninstall.
        if (webPushSupported()) {
          try {
            const reg = await navigator.serviceWorker.getRegistration('/service-worker.js');
            const sub = reg && (await reg.pushManager.getSubscription());
            if (sub) await sub.unsubscribe();
          } catch (_) { /* ignore */ }
          // await unregisterPushServiceWorker();
        }
      }
    } catch (err) {
      console.error('Failed to disable notifications:', err);
    }
    setNotificationsEnabled(false);
    setIsLoading(false);
  }, [isTelegram, telegramUser]);

  // ── Public: update preferences (treat_ready / limit_reset toggles) ──────────
  const updatePreferences = useCallback(
    async (treatReady, limitReset) => {
      setTreatReadyNotify(treatReady);
      setLimitResetNotify(limitReset);

      if (!notificationsEnabled) return;

      try {
        if (isTelegram && telegramUser) {
          await fetch(`${BACKEND_URL}/api/notifications/telegram/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: telegramUser.id,
              treat_ready: treatReady,
              limit_reset: limitReset,
            }),
          });
        } else {
          await fetch(`${BACKEND_URL}/api/notifications/web/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              player_address: getStoredPlayerAddress(),
              treat_ready: treatReady,
              limit_reset: limitReset,
            }),
          });
        }
      } catch (err) {
        console.error('Failed to update notification preferences:', err);
      }
    },
    [notificationsEnabled, isTelegram, telegramUser]
  );

  // ── Public: foreground toast helper (still useful while tab is open) ────────
  const showLocalNotification = useCallback(
    (title, body, icon = '/dogefood-logo.png') => {
      if (!notificationsEnabled) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      try { new Notification(title, { body, icon, badge: icon }); } catch (_) {}
    },
    [notificationsEnabled]
  );

  // ── Public: schedule a treat-ready notification on the backend ──────────────
  const scheduleTreatReadyNotification = useCallback(
    async (treatName, readyTime) => {
      if (!notificationsEnabled || !treatReadyNotify) return;
      try {
        const body = { treat_name: treatName, ready_time: readyTime };
        if (isTelegram && telegramUser) body.telegram_id = telegramUser.id;
        else body.player_address = getStoredPlayerAddress();

        await fetch(`${BACKEND_URL}/api/notifications/schedule/treat-ready`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.error('Failed to schedule treat notification:', err);
      }
    },
    [notificationsEnabled, treatReadyNotify, isTelegram, telegramUser]
  );

  // ── Public: schedule a daily-limit-reset notification ───────────────────────
  const scheduleLimitResetNotification = useCallback(
    async (resetTime) => {
      if (!notificationsEnabled || !limitResetNotify) return;
      try {
        const body = { reset_time: resetTime };
        if (isTelegram && telegramUser) body.telegram_id = telegramUser.id;
        else body.player_address = getStoredPlayerAddress();

        await fetch(`${BACKEND_URL}/api/notifications/schedule/limit-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.error('Failed to schedule limit reset notification:', err);
      }
    },
    [notificationsEnabled, limitResetNotify, isTelegram, telegramUser]
  );

  const value = {
    notificationsEnabled,
    treatReadyNotify,
    limitResetNotify,
    permissionStatus,
    isLoading,
    isTelegramNotifications: isTelegram,
    botUsername: config.botUsername,
    lastError,

    requestPermission,
    disableNotifications,
    updatePreferences,
    showLocalNotification,
    scheduleTreatReadyNotification,
    scheduleLimitResetNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notificationsEnabled: false,
      treatReadyNotify: true,
      limitResetNotify: true,
      permissionStatus: 'default',
      isLoading: false,
      isTelegramNotifications: false,
      botUsername: '',
      lastError: null,
      requestPermission: async () => false,
      disableNotifications: async () => {},
      updatePreferences: async () => {},
      showLocalNotification: () => {},
      scheduleTreatReadyNotification: async () => {},
      scheduleLimitResetNotification: async () => {},
    };
  }
  return ctx;
};

export default NotificationContext;
