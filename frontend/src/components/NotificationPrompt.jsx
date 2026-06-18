import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, BellOff, Check, X, Smartphone, Monitor, ExternalLink } from 'lucide-react';

// ─── Full-screen prompt shown on first launch (optional) ─────────────────────
const NotificationPrompt = ({ onClose }) => {
  const {
    requestPermission,
    isTelegramNotifications,
    isLoading: contextLoading,
    botUsername,
    lastError,
  } = useNotifications();

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const success = await requestPermission();
      setResult(success ? 'success' : 'failed');
      if (success) setTimeout(() => onClose?.(), 1500);
    } catch (e) {
      console.error('Error enabling notifications:', e);
      setResult('failed');
    }
    setIsLoading(false);
  };

  if (result === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Notifications Enabled!</h3>
          <p className="text-white/80 text-sm">
            {isTelegramNotifications
              ? "You'll receive messages from our bot when your treats are ready!"
              : "You'll be notified when your treats are ready and when you can create more."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          data-testid="notif-prompt-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Bell className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-xl font-bold text-white text-center mb-2">Never Miss a Treat!</h3>
        <p className="text-slate-300 text-sm text-center mb-4">Get notified when:</p>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-white text-sm">Your treats are ready to collect</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-white text-sm">Daily limit resets — time to brew!</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mb-4">
          {isTelegramNotifications ? (
            <>
              <Smartphone className="w-4 h-4" />
              <span>Via Telegram Bot Message</span>
            </>
          ) : (
            <>
              <Monitor className="w-4 h-4" />
              <span>Via Browser Push Notification</span>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-colors"
            data-testid="notif-prompt-not-now"
          >
            Not Now
          </button>
          <button
            onClick={handleEnable}
            disabled={isLoading || contextLoading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="notif-prompt-enable"
          >
            {isLoading || contextLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Enable
              </>
            )}
          </button>
        </div>

        {result === 'failed' && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {lastError ||
              (isTelegramNotifications
                ? 'Failed to enable notifications. Make sure you have started our bot.'
                : 'Failed to enable notifications. Please check your browser settings.')}
            {isTelegramNotifications && botUsername && (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-blue-300 hover:text-blue-200 underline flex items-center gap-1"
                data-testid="notif-prompt-bot-link"
              >
                Open @{botUsername} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Settings page panel (rendered inside Settings.jsx) ──────────────────────
export const NotificationSettings = ({ isDarkMode = true }) => {
  // MyDoge wallet browser does not support push notifications — hide the section entirely
  if (/MyDoge/i.test(navigator.userAgent)) {
    return (
      <div className={`p-4 rounded-xl text-sm ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
        Push notifications are not supported in the MyDoge browser.
      </div>
    );
  }

  const {
    notificationsEnabled,
    treatReadyNotify,
    limitResetNotify,
    permissionStatus,
    isLoading,
    isTelegramNotifications,
    botUsername,
    lastError,
    requestPermission,
    disableNotifications,
    updatePreferences,
  } = useNotifications();

  const [localLoading, setLocalLoading] = useState(false);

  const handleToggle = async () => {
    setLocalLoading(true);
    try {
      if (notificationsEnabled) await disableNotifications();
      else await requestPermission();
    } catch (e) {
      console.error('Error toggling notifications:', e);
    }
    setLocalLoading(false);
  };

  const busy = isLoading || localLoading;
  const labelMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const labelText = isDarkMode ? 'text-white' : 'text-slate-800';
  const cardBg = isDarkMode ? 'bg-slate-700/40' : 'bg-slate-50';

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className={`flex items-center justify-between p-3 rounded-xl ${cardBg}`}>
        <div className="flex items-center gap-3">
          {notificationsEnabled ? (
            <Bell className="w-5 h-5 text-green-400" />
          ) : (
            <BellOff className={`w-5 h-5 ${labelMuted}`} />
          )}
          <div>
            <h4 className={`font-medium ${labelText}`}>Push Notifications</h4>
            <p className={`text-xs ${labelMuted}`}>
              {isTelegramNotifications ? 'Via Telegram Bot' : 'Via Browser Push (works when tab is closed)'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={busy}
          data-testid="notifications-master-toggle"
          className={`w-12 h-7 rounded-full transition-colors relative ${
            notificationsEnabled ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
          } ${busy ? 'opacity-50' : ''}`}
        >
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          )}
        </button>
      </div>

      {/* Per-event toggles */}
      {notificationsEnabled && (
        <div className="pl-8 space-y-3 border-l-2 border-slate-700/40 ml-2">
          <div className="flex items-center justify-between">
            <div>
              <h5 className={`text-sm ${labelText}`}>Treat Ready</h5>
              <p className={`text-xs ${labelMuted}`}>When treats finish brewing</p>
            </div>
            <button
              onClick={() => updatePreferences(!treatReadyNotify, limitResetNotify)}
              data-testid="notifications-treat-ready-toggle"
              className={`w-10 h-6 rounded-full transition-colors relative ${
                treatReadyNotify ? 'bg-amber-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  treatReadyNotify ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h5 className={`text-sm ${labelText}`}>Limit Reset</h5>
              <p className={`text-xs ${labelMuted}`}>When daily limit refreshes</p>
            </div>
            <button
              onClick={() => updatePreferences(treatReadyNotify, !limitResetNotify)}
              data-testid="notifications-limit-reset-toggle"
              className={`w-10 h-6 rounded-full transition-colors relative ${
                limitResetNotify ? 'bg-blue-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  limitResetNotify ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Error / guidance messages */}
      {lastError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {lastError}
          {isTelegramNotifications && botUsername && (
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="notifications-open-bot-link"
              className="mt-2 inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 underline"
            >
              Open @{botUsername} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {!notificationsEnabled && !isTelegramNotifications && permissionStatus === 'denied' && (
        <p className="text-red-400 text-xs">
          Notifications are blocked. Enable them in your browser settings, then toggle this again.
        </p>
      )}
    </div>
  );
};

export default NotificationPrompt;
