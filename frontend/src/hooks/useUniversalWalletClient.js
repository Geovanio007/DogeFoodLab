import { useMemo } from 'react';
import { useWalletClient } from 'wagmi';
import { useAccount as useDogeAccount } from '@dogeos/dogeos-sdk';
import { createWalletClient, custom } from 'viem';
import { dogeOSDevnet } from '../config/wagmi';

/**
 * useUniversalWalletClient
 *
 * Returns a viem wallet client for signing/sending on-chain transactions,
 * regardless of how the player connected.
 *
 * THE PROBLEM THIS SOLVES:
 * wagmi's useWalletClient() (and therefore useSendTransaction() /
 * useWriteContract(), which use it internally) only returns something
 * when wagmi's OWN connector is actively connected. In this app, that is
 * only true for wallets explicitly bridged into wagmi — currently just
 * MyDoge, via MyDogeAutoConnect.jsx / MyDogeConnectBanner.jsx wiring an
 * injected() connector (see Web3Provider.js for why).
 *
 * Every other DogeOS SDK connection — email/social-login embedded
 * wallets, or an external wallet connected through the DogeOS modal
 * rather than wagmi's own connect flow — reports as connected via the
 * SDK's OWN useAccount() (address is set), but wagmi's connector state
 * never reflects it. useWalletClient() then silently returns nothing,
 * so anything built on it either throws ("Connector not connected", as
 * in LabFeed's tip flow) or no-ops silently (as in LabLauncherToken's
 * buy/sell, which just returns early when walletClient is falsy) —
 * even though the UI shows the player as connected.
 *
 * THE FIX:
 * If wagmi already has a real, connected wallet client, use it — nothing
 * changes for MyDoge or any future wallet that does get wagmi-bridged.
 * Otherwise, if the DogeOS SDK reports a connected wallet with a
 * currentProvider exposing a standard EIP-1193 request() method, wrap
 * that provider in a viem wallet client so the exact same
 * sendTransaction() / writeContract() calls work either way.
 *
 * CAVEAT — please read before assuming this is fully verified:
 * DogeOS SDK's currentProvider is typed as `any` by the SDK itself; this
 * relies on it exposing a standard request() method, which is normal for
 * EIP-1193 providers but isn't explicitly documented by the SDK. This has
 * been verified to compile and to preserve all existing wagmi-connected
 * behavior unchanged, but has NOT been exercised against a live
 * embedded/social-login or non-MyDoge external wallet session. Please
 * test an actual tip / token buy with a non-MyDoge connection before
 * treating this as fully confirmed working.
 */
export function useUniversalWalletClient() {
  const { data: wagmiWalletClient } = useWalletClient();
  const { address: dogeAddress, currentProvider } = useDogeAccount();

  const fallbackClient = useMemo(() => {
    if (wagmiWalletClient) return null; // wagmi already has a real client — nothing to do
    if (!dogeAddress || !currentProvider || typeof currentProvider.request !== 'function') {
      return null;
    }
    try {
      return createWalletClient({
        account: dogeAddress,
        chain: dogeOSDevnet,
        transport: custom(currentProvider),
      });
    } catch (e) {
      console.warn('[useUniversalWalletClient] failed to wrap DogeOS provider:', e?.message || e);
      return null;
    }
  }, [wagmiWalletClient, dogeAddress, currentProvider]);

  const walletClient = wagmiWalletClient || fallbackClient;

  return {
    walletClient,
    isReady: Boolean(walletClient),
    isUsingFallback: !wagmiWalletClient && Boolean(fallbackClient),
  };
}
