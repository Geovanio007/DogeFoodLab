// DogeOS SDK configuration
// Docs: https://docs.dogeos.com/en/sdk

// DogeOS Chikyū Testnet chain definition (matches the SDK's expected shape)
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
    : 'https://dogefoodlab.vercel.app';

export const dogeosConfig = {
  // Your DogeOS clientId (from https://sdk.dogeos.com/register)
  clientId: process.env.REACT_APP_DOGEOS_CLIENT_ID,
  // Optional WalletConnect Cloud project ID for WC sessions
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
    description:
      'Create treats, earn points, climb the leaderboard on DogeOS!',
    url: appUrl,
    icons: [
      'https://customer-assets.emergentagent.com/job_dogefoodlab/artifacts/ckey490s_20250812_154617.jpg',
    ],
  },
};
