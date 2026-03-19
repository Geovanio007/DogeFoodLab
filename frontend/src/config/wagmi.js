import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  coinbaseWallet,
  metaMaskWallet,
  okxWallet,
  trustWallet,
  rabbyWallet,
  phantomWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { defineChain } from 'viem';

// Define DogeOS ChikyÅ« Testnet chain
export const dogeOSDevnet = defineChain({
  id: 6281971,
  name: 'DogeOS ChikyÅ« Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Dogecoin',
    symbol: 'DOGE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.dogeos.com'],
      webSocket: ['wss://ws.rpc.testnet.dogeos.com'],
    },
    public: {
      http: ['https://rpc.testnet.dogeos.com'],
      webSocket: ['wss://ws.rpc.testnet.dogeos.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'DogeOS Explorer',
      url: 'https://explorer.testnet.dogeos.com',
    },
  },
  testnet: true,
});

// WalletConnect project ID - required for mobile wallet connections
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;
const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dogefoodlab.vercel.app';

const detectTelegramEnvironment = () => {
  if (typeof window === 'undefined') return false;

  const webApp = window.Telegram?.WebApp;
  const platform = webApp?.platform;
  const hasTelegramPlatform = typeof platform === 'string' && platform.length > 0 && platform !== 'unknown';
  const hasInitData = typeof webApp?.initData === 'string' && webApp.initData.length > 0;
  const hasUserInInitData = Boolean(webApp?.initDataUnsafe?.user?.id);
  const telegramUserAgent = /Telegram/i.test(window.navigator?.userAgent || '');

  return hasTelegramPlatform || hasInitData || hasUserInInitData || telegramUserAgent;
};

const isTelegramEnv = detectTelegramEnvironment();

// Fixed OKX deep link wallet - only override mobile URI for Telegram,
// keep QR code intact for desktop browser users
const okxDeepLinkWallet = ({ projectId: wcProjectId, walletConnectParameters }) => {
  const baseWallet = okxWallet({ projectId: wcProjectId, walletConnectParameters });

  // Only override mobile deep link, never remove qrCode
  return {
    ...baseWallet,
    mobile: {
      ...baseWallet.mobile,
      getUri: (uri) => `okx://main/wc?uri=${encodeURIComponent(uri)}`,
    },
    // Do NOT set qrCode: undefined â€” that breaks desktop connection
  };
};

export const wagmiConfig = getDefaultConfig({
  appName: 'DogeFood Lab Beta',
  projectId: projectId,
  chains: [dogeOSDevnet],
  ssr: false,
  multiInjectedProviderDiscovery: true, // Re-enabled so injected OKX extension is detected
  wallets: [
    {
      groupName: 'Recommended',
      wallets: isTelegramEnv
        ? [okxDeepLinkWallet, walletConnectWallet, coinbaseWallet]
        : [metaMaskWallet, okxDeepLinkWallet, coinbaseWallet, rainbowWallet, trustWallet, rabbyWallet, phantomWallet, walletConnectWallet, injectedWallet],
    },
  ],
  walletConnectParameters: {
    projectId: projectId,
    metadata: {
      name: 'DogeFood Lab',
      description: 'Create treats, earn points, climb the leaderboard on DogeOS!',
      url: appUrl,
      icons: ['https://customer-assets.emergentagent.com/job_dogefoodlab/artifacts/ckey490s_20250812_154617.jpg']
    }
  }
});
