import React from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletConnectProvider } from '@dogeos/dogeos-sdk';
import '@dogeos/dogeos-sdk/style.css';
import { dogeosConfig, dogeOSChikyuTestnet } from '../config/dogeos';

/**
 * Wallet provider stack for the app.
 *
 * Stack (outside → inside):
 *   QueryClientProvider       ← required by wagmi v2
 *     WagmiProvider           ← supplies wagmi React context
 *       WalletConnectProvider ← supplies the DogeOS SDK context
 *
 * Wagmi is kept as a thin EVM read/context layer. Wallet discovery is
 * deliberately disabled here because the DogeOS SDK owns wallet connection
 * handling. This also prevents desktop browser extensions discovered through
 * EIP-6963 from being auto-registered as wagmi connectors during startup.
 */

const wagmiConfig = createConfig({
  chains: [dogeOSChikyuTestnet],
  transports: {
    [dogeOSChikyuTestnet.id]: http(),
  },
  multiInjectedProviderDiscovery: false,
  ssr: false,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <WalletConnectProvider config={dogeosConfig}>
          {children}
        </WalletConnectProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
