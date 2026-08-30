import React from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
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
 * multiInjectedProviderDiscovery is disabled because the DogeOS SDK owns
 * general wallet discovery (it auto-loads its own EIP-6963/WalletConnect
 * connectors internally — see getConnectors() in the SDK README) and to
 * avoid desktop browser extensions being double-registered.
 *
 * DO NOT also remove the explicit `injected()` connector below — unlike
 * general wallet discovery, it is NOT redundant with the DogeOS SDK.
 * MyDogeAutoConnect.jsx and MyDogeConnectBanner.jsx call wagmi's own
 * useConnect().connect({ connector }) directly to wire an
 * already-MyDoge-approved wallet into wagmi state (MyDoge's in-app
 * browser isn't reliably picked up by the DogeOS SDK's own discovery,
 * which is the entire reason those two components exist). They look
 * specifically for an `id === 'injected'` connector. With none
 * registered, that wiring silently no-ops: MyDoge approves the
 * connection at the provider level, but the app never reflects it as
 * connected, so returning wallet users get treated as logged out.
 */

const wagmiConfig = createConfig({
  chains: [dogeOSChikyuTestnet],
  connectors: [injected()],
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
