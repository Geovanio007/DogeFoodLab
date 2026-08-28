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
 *   QueryClientProvider        ← required by wagmi v2
 *     WagmiProvider            ← supplies wagmi React context (useAccount, etc.)
 *       QueryClientProvider    ← dedicated instance for the DogeOS SDK, see below
 *         WalletConnectProvider← supplies the DogeOS SDK context (modal, etc.)
 *
 * The DogeOS SDK manages its own internal multi-chain wallet state, but the
 * rest of the app already uses wagmi v2 hooks (`useAccount`, `useSignMessage`,
 * `useChainId`, `useSwitchChain`, ...), so we keep a thin wagmi setup wired
 * to the DogeOS Chikyū Testnet for EVM read calls.
 *
 * WalletConnectProvider gets its OWN QueryClient instance rather than
 * reusing wagmi's. Per DogeOS's SDK docs (docs.dogeos.com/en/sdk/
 * troubleshooting), sharing one react-query client between wagmi and the
 * SDK lets the SDK's internal connection-state queries resolve against
 * wagmi's cache instead of its own, so its pending-request tracking (keyed
 * internally by a message id, `M_ID`) reads back undefined - this is the
 * documented cause of "Cannot read properties of undefined (reading
 * 'M_ID')" firing repeatedly (it's on the SDK's polling interval, which is
 * why it floods the debug console rather than firing once).
 */

const wagmiConfig = createConfig({
  chains: [dogeOSChikyuTestnet],
  connectors: [injected()],
  transports: {
    [dogeOSChikyuTestnet.id]: http(),
  },
  ssr: false,
});

const queryClient = new QueryClient();
const dogeosQueryClient = new QueryClient();

export function Web3Provider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={dogeosQueryClient}>
          <WalletConnectProvider config={dogeosConfig}>
            {children}
          </WalletConnectProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
