import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { GameProvider } from './contexts/GameContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TelegramProvider, useTelegram } from './contexts/TelegramContext';
import { AudioProvider } from './contexts/AudioContext';
import { MusicProvider } from './contexts/MusicContext';
import { VersionProvider } from './contexts/VersionContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { Web3Provider } from './components/Web3Provider';
import WalletErrorBoundary from './components/WalletErrorBoundary';
import MyDogeMobileHelper from './components/MyDogeMobileHelper';
import MyDogeAutoConnect from './components/MyDogeAutoConnect';
import MyDogeConnectBanner from './components/MyDogeConnectBanner';
import MenuErrorBoundary from './components/MenuErrorBoundary';
import DebugOverlay from './components/DebugOverlay';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import WelcomeScreen from './components/WelcomeScreen';
import LoadingScreen from './components/LoadingScreen';
import MainMenu from './components/MainMenu';
import ActiveTreatsStatus from './components/ActiveTreatsStatus';
import TreatNotifications from './components/TreatNotifications';
import UserRegistration from './components/UserRegistration';
import TelegramAuth from './components/TelegramAuth';
import UpdateNotification from './components/UpdateNotification';
import NotificationPrompt from './components/NotificationPrompt';
import { KernelOfWowBanner, useKernelOfWow } from './components/KernelOfWow';
import './App.css';

// Lazy-load heavy route components for faster initial page load
const GameLabRedesign = lazy(() => import('./components/GameLabRedesign'));
const SeasonTwoLab = lazy(() => import('./components/SeasonTwoLab'));
const LabArena = lazy(() => import('./components/LabArena'));
const MyTreats = lazy(() => import('./components/MyTreats'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const Settings = lazy(() => import('./components/Settings'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const Tournament = lazy(() => import('./components/Tournament'));
const Marketplace = lazy(() => import('./components/Marketplace'));
const AutoMixerSubscription = lazy(() => import('./components/AutoMixerSubscription'));

// Inner App component that has access to wagmi and telegram hooks
const InnerApp = () => {
  const { address, isConnected } = useAccount();
  const { isTelegram, telegramUser, isAuthenticated: isTelegramAuthenticated, isLoading: isTelegramLoading } = useTelegram();
  const { notificationsEnabled, permissionStatus } = useNotifications();
  const { currentHolder: kernelHolder } = useKernelOfWow();
  
  const [showWelcome, setShowWelcome] = useState(true); // Start with true, will be updated
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showTelegramAuth, setShowTelegramAuth] = useState(false);
  const [userRegistered, setUserRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [authType, setAuthType] = useState(null); // 'wallet', 'telegram', or 'linked'
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  
  // Guest user state - read from localStorage
  const [guestUser, setGuestUser] = useState(() => {
    const stored = localStorage.getItem('dogefood_player');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Listen for guest user registration events
  useEffect(() => {
    const handlePlayerRegistered = () => {
      const stored = localStorage.getItem('dogefood_player');
      if (stored) {
        try {
          setGuestUser(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing guest user:', e);
        }
      }
    };
    
    window.addEventListener('dogefood_player_registered', handlePlayerRegistered);
    return () => window.removeEventListener('dogefood_player_registered', handlePlayerRegistered);
  }, []);

  // Show notification prompt after user is ready to play (after 10 seconds, once per session)
  // Skip entirely for MyDoge wallet browser — it does not support push notifications
  useEffect(() => {
    if (isMyDogeBrowser) return; // MyDoge wallet browser: skip notification prompt
    const hasSeenPrompt = sessionStorage.getItem('dogefood_notification_prompt_shown');
    const isUserReady = !showWelcome && !isLoading && !isCheckingRegistration;
    
    if (isUserReady && !notificationsEnabled && permissionStatus !== 'denied' && !hasSeenPrompt) {
      const timer = setTimeout(() => {
        // Notification prompt disabled for all browsers
        // setShowNotificationPrompt(true);
        sessionStorage.setItem('dogefood_notification_prompt_shown', 'true');
      }, 10000); // Show after 10 seconds of gameplay
      
      return () => clearTimeout(timer);
    }
  }, [showWelcome, isLoading, isCheckingRegistration, notificationsEnabled, permissionStatus, isMyDogeBrowser]);

  // Handle welcome screen visibility based on Telegram status
  useEffect(() => {
    if (!isTelegramLoading) {
      // If in Telegram, skip welcome screen entirely
      if (isTelegram) {
        setShowWelcome(false);
      } else if (window.location.pathname !== '/') {
        // If on a specific route, skip welcome
        setShowWelcome(false);
      }
    }
  }, [isTelegram, isTelegramLoading]);

  // Check registration status for both wallet and Telegram authentication.
  //
  // Hardened against the menu-crash on MyDoge in-app browser:
  //   1. `inFlightRef` guards against the effect re-firing while a previous
  //      check is still in flight (TelegramContext can recreate
  //      `telegramUser` on every render, kicking this effect repeatedly).
  //   2. `AbortController` cancels stale fetches before they resolve so we
  //      never setState on data from a previous render.
  //   3. JSON parsing is wrapped in try/catch so an HTML/empty 5xx body
  //      can't throw an uncaught SyntaxError that blanks the menu.
  const checkInFlightRef = useRef(false);
  useEffect(() => {
    const controller = new AbortController();

    const checkRegistrationStatus = async () => {
      if (isTelegramLoading || showWelcome || isLoading) return;
      if (checkInFlightRef.current) return;
      checkInFlightRef.current = true;

      setIsCheckingRegistration(true);

      try {
        if (isTelegram && isTelegramAuthenticated && telegramUser) {
          console.log("🤖 Checking Telegram user registration");
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/player/telegram/${telegramUser.id}`,
            { signal: controller.signal }
          );
          if (response.ok) {
            let playerData = {};
            try { playerData = await response.json(); } catch (_) { /* ignore parse */ }
            if (controller.signal.aborted) return;
            setUserRegistered(true);
            setAuthType(playerData.auth_type || 'telegram');
            setShowTelegramAuth(false);
            console.log("✅ Telegram user already registered:", playerData.nickname);
          } else if (response.status === 404) {
            if (controller.signal.aborted) return;
            setUserRegistered(false);
            setShowTelegramAuth(true);
            setAuthType('telegram');
            console.log("📝 Telegram user needs registration");
          }

        } else if (!isTelegram && address && isConnected) {
          console.log("💳 Checking wallet user registration");
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/player/${address}`,
            { signal: controller.signal }
          );
          if (response.ok) {
            let playerData = null;
            try { playerData = await response.json(); } catch (_) { /* ignore parse */ }
            if (controller.signal.aborted) return;
            if (playerData && playerData.nickname) {
              setUserRegistered(true);
              setAuthType(playerData.auth_type || 'wallet');
              setShowRegistration(false);
              console.log("✅ Wallet user already registered:", playerData.nickname);
            } else {
              setUserRegistered(false);
              setShowRegistration(true);
              setAuthType('wallet');
            }
          } else if (response.status === 404) {
            if (controller.signal.aborted) return;
            setUserRegistered(false);
            setShowRegistration(true);
            setAuthType('wallet');
          }

        } else {
          if (controller.signal.aborted) return;
          setUserRegistered(false);
          setShowRegistration(false);
          setShowTelegramAuth(false);
          setAuthType(null);
        }

      } catch (error) {
        if (error?.name === 'AbortError') return; // cancelled — ignore
        console.error("Error checking registration status:", error);
        if (controller.signal.aborted) return;
        setUserRegistered(false);
        setShowRegistration(false);
        setShowTelegramAuth(false);
      } finally {
        checkInFlightRef.current = false;
        if (!controller.signal.aborted) setIsCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();

    return () => {
      controller.abort();
      checkInFlightRef.current = false;
    };
  }, [address, isConnected, isTelegram, isTelegramAuthenticated, telegramUser, isTelegramLoading, showWelcome, isLoading]);

  const handlePlayNow = () => {
    setShowWelcome(false);
    setIsLoading(true);
    
    // Loading screen duration
    setTimeout(() => {
      setIsLoading(false);
    }, 3500);
  };

  // Get the effective player address (wallet or telegram or guest)
  // IMPORTANT: use UPPERCASE `TG_` because that is the canonical form used by
  // the migration (`/api/admin/merge-duplicate-telegram-players`). The
  // canonical player document in MongoDB has `address: "TG_<id>"` so any
  // direct `find_one({address: ...})` lookups (e.g. arena join, activity
  // $lookup) match correctly without case-sensitivity issues. Endpoints that
  // route through `find_player_by_address` (e.g. /api/player/{address}/profile
  // called by MainMenu with lowercase) handle both cases regardless.
  const effectiveAddress = address || (telegramUser ? `TG_${telegramUser.id}` : null) || (guestUser ? (guestUser.guest_id || guestUser.id) : null);

  return (
    <GameProvider>
      <div className="App">
        {/* Welcome Screen - First screen users see */}
        {showWelcome && (
          <WelcomeScreen onPlayNow={handlePlayNow} />
        )}

        {/* Loading Screen - After clicking Play Now */}
        {!showWelcome && isLoading && (
          <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
        )}

        {/* Registration Status Checking */}
        {!showWelcome && !isLoading && isCheckingRegistration && (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
            <Card className="glass-panel max-w-md mx-auto">
              <CardContent className="text-center py-8 space-y-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-white/90">Checking registration status...</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Telegram Authentication - Show when Telegram user needs registration */}
        {!showWelcome && !isLoading && !isCheckingRegistration && showTelegramAuth && (
          <TelegramAuth 
            onAuthComplete={(data) => {
              console.log('Telegram auth complete:', data);
              setShowTelegramAuth(false);
              setUserRegistered(true);
            }} 
          />
        )}

        {/* Main Application - After loading screen, show main menu */}
        {!showWelcome && !isLoading && !isCheckingRegistration && !showTelegramAuth && (
          <Router>
            {/* Kernel of Wow Banner - Shows current holder globally */}
            {kernelHolder?.has_holder && (
              <KernelOfWowBanner currentHolder={kernelHolder} />
            )}
            
            {/* Always show main routes after loading - authentication is optional */}
            <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<MenuErrorBoundary><MainMenu playerAddress={effectiveAddress || 'GUEST_USER'} /></MenuErrorBoundary>} />
              <Route path="/lab" element={<SeasonTwoLab playerAddress={effectiveAddress || 'GUEST_USER'} />} />
              <Route path="/lab/legacy" element={<GameLabRedesign playerAddress={effectiveAddress || 'GUEST_USER'} />} />
              <Route path="/nfts" element={<MyTreats />} />
              <Route path="/dashboard" element={<SeasonTwoLab playerAddress={effectiveAddress || 'GUEST_USER'} />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/tournament" element={<Tournament />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/auto-mixer" element={<AutoMixerSubscription playerAddress={effectiveAddress || 'GUEST_USER'} />} />
              <Route path="/arena" element={<LabArena playerAddress={effectiveAddress || 'GUEST_USER'} />} />
            </Routes>
            </Suspense>
            {/* Global Treat Notifications */}
            <TreatNotifications />
          </Router>
        )}

        {/* Notification Permission Prompt (web push). For Telegram users we
            don't show this — they enable notifications from Settings, and the
            backend messages them via the bot. */}
        {showNotificationPrompt && !isTelegram && !isMyDogeBrowser && (
          <NotificationPrompt onClose={() => setShowNotificationPrompt(false)} />
        )}
      </div>
    </GameProvider>
  );
};

// Main App component that wraps with providers
// Detected once at module load — never changes during a session
const isMyDogeBrowser = typeof navigator !== 'undefined' && /MyDoge/i.test(navigator.userAgent);

function App() {
  return (
    <>
      <DebugOverlay />
      <ThemeProvider>
      <VersionProvider>
        <AudioProvider>
          <MusicProvider>
            <TelegramProvider>
              <WalletErrorBoundary>
                <Web3Provider>
                  <NotificationProvider>
                    <InnerApp />
                    <UpdateNotification />
                    <MyDogeAutoConnect />
                    <MyDogeConnectBanner />
                    <MyDogeMobileHelper />
                  </NotificationProvider>
                </Web3Provider>
              </WalletErrorBoundary>
            </TelegramProvider>
          </MusicProvider>
        </AudioProvider>
      </VersionProvider>
      </ThemeProvider>
      <DebugToggleZone />
    </>
  );
}

/**
 * Tiny invisible 24x24 box pinned to the bottom-right corner of the
 * viewport. Tapping it 5 times within 3 seconds force-enables the
 * DebugOverlay — this is the only way to reach debug mode inside the
 * MyDoge in-app browser, which has no URL bar.
 */
function DebugToggleZone() {
  const counter = React.useRef({ count: 0, firstTap: 0 });
  const onTap = () => {
    const now = Date.now();
    if (now - counter.current.firstTap > 3000) {
      counter.current = { count: 1, firstTap: now };
      return;
    }
    counter.current.count += 1;
    if (counter.current.count >= 5) {
      try { window.localStorage?.setItem('dogefood_debug', '1'); } catch (_) { /* ignore */ }
      window.location.reload();
    }
  };
  return (
    <div
      data-testid="debug-toggle-zone"
      onClick={onTap}
      aria-hidden
      style={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        width: 28,
        height: 28,
        zIndex: 100001,
        opacity: 0,
        cursor: 'default',
      }}
    />
  );
}

export default App;
