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

// OKX wallet with deep link only outside Telegram
const okxDeepLinkWallet = ({ projectId: wcProjectId, walletConnectParameters }) => {
  const baseWallet = okxWallet({ projectId: wcProjectId, walletConnectParameters });
  if (isTelegramEnv) return baseWallet;
  return {
    ...baseWallet,
    mobile: {
      ...baseWallet.mobile,
      getUri: (uri) => `okx://main/wc?uri=${encodeURIComponent(uri)}`,
    },
  };
};

// In Telegram's in-app browser, ALL wallet deep links (okx://, metamask://, 
// coinbase://, etc.) cause ERR_UNKNOWN_URL_SCHEME crashes.
// Only walletConnectWallet uses safe https:// URLs and works reliably in Telegram.
const telegramWallets = [walletConnectWallet];

const regularWallets = [
  metaMaskWallet,
  okxDeepLinkWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  rabbyWallet,
  phantomWallet,
  walletConnectWallet,
  injectedWallet,
];

export const wagmiConfig = getDefaultConfig({
  appName: 'DogeFood Lab Beta',
  projectId: projectId,
  chains: [dogeOSDevnet],
  ssr: false,
  multiInjectedProviderDiscovery: true,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: isTelegramEnv ? telegramWallets : regularWallets,
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
