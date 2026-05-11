// NOTE: Legacy wagmi config file.
//
// Wallet connection has migrated to the official DogeOS SDK
// (see src/config/dogeos.js + src/components/Web3Provider.js).
// The DogeOS SDK sets up the underlying wagmi context internally, so
// existing wagmi hooks (useAccount, useSignMessage, useChainId,
// useSwitchChain, ...) continue to work throughout the app.
//
// This file is kept ONLY to preserve the `dogeOSDevnet` chain export
// used by other modules. RainbowKit and the manual wagmi config have
// been removed.

import { defineChain } from 'viem';

export const dogeOSDevnet = defineChain({
  id: 6281971,
  name: 'DogeOS Chikyū Testnet',
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
