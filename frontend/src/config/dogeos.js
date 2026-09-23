// DogeOS SDK configuration — updated for @dogeos/dogeos-sdk v4.0.0
// Docs: https://docs.dogeos.com/en/sdk

// DogeOS Chikyū Testnet chain definition
export const dogeOSChikyuTestnet = {
  id: 6281971,
  name: 'DogeOS Chikyū Testnet',
  nativeCurrency: {
    name: 'DOGE',
    symbol: 'DOGE',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.dogeos.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'DogeOS Blockscout',
      url: 'https://blockscout.testnet.dogeos.com',
    },
  },
  testnet: true,
};

// App metadata shown by WalletConnect-compatible wallets
const appUrl =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'https://dogefoodlab.xyz';

export const dogeosConfig = {
  // Your DogeOS clientId (from https://sdk.dogeos.com/register)
  clientId: process.env.REACT_APP_DOGEOS_CLIENT_ID,

  // Optional WalletConnect Cloud project ID
  walletConnectProjectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,

  // Default chain family presented in the connection modal
  defaultConnectChain: 'evm',

  // Chains the SDK should support
  chains: {
    evm: [dogeOSChikyuTestnet],
  },

  // dApp metadata
  metadata: {
    name: 'DogeFood Lab',
    description: 'Create treats, earn points, climb the leaderboard on DogeOS!',
    url: appUrl,
    icons: [
      'https://customer-assets.emergentagent.com/job_dogefoodlab/artifacts/ckey490s_20250812_154617.jpg',
    ],
  },

  // v4.0.0: login config — controls what login methods appear in the modal.
  // Social logins (Google/X) are no longer configured with a custom
  // clientId here — v4 manages authentication itself and uses its own
  // production defaults for those providers.
  login: {
    basicLogins: ['email', 'externalWallets'],
    socialLogins: [{ type: 'google' }, { type: 'x' }],
  },

  // v4.0.0: theme config — matches DogeFood Lab's gold + dark palette.
  // Uses heroui prefix (same as SDK's default, matches the modal CSS vars).
  theme: {
    prefix: 'heroui',
    themes: {
      light: {
        colors: {
          foreground: '#12122a',
          background: '#ffffff',
          content1: '#fafafa',
          primary: {
            DEFAULT: '#facc15',
            foreground: '#0b1738',
          },
        },
      },
      dark: {
        colors: {
          foreground: '#ffffff',
          background: '#04030f',
          content1: '#0a0f24',
          primary: {
            DEFAULT: '#facc15',
            foreground: '#0b1738',
          },
        },
      },
    },
    defaultTheme: 'dark',
  },
};
