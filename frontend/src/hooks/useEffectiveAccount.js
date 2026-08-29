import { useAccount as useWagmiAccount } from 'wagmi';
import { useAccount as useDogeAccount } from '@dogeos/dogeos-sdk';

/**
 * Unified wallet connection state across wagmi and the DogeOS SDK.
 *
 * DogeOS is treated as authoritative. wagmi's automatic injected-wallet
 * discovery is disabled app-wide (see Web3Provider.js's
 * multiInjectedProviderDiscovery: false, added to fix a desktop
 * createEmitter crash), which means wagmi's own useAccount() can under-
 * report — it may show isConnected: false even while a desktop wallet is
 * genuinely connected through the DogeOS SDK.
 *
 * Any component that needs to know "is a wallet connected, what's the
 * address" for display, routing, or gating a data fetch should use this
 * hook instead of calling wagmi's useAccount() directly — that direct-call
 * pattern is what caused desktop wallet users to be treated as logged-out
 * (and shown a fresh/new-player experience) despite being connected.
 *
 * Components that actually SIGN something (useWriteContract,
 * useSendTransaction, useSignMessage) should keep calling wagmi's own
 * useAccount() alongside those calls instead of this hook — those need a
 * real wagmi connector behind the address, which this hook doesn't
 * guarantee (a DogeOS-only connection has no wagmi connector at all).
 */
export function useEffectiveAccount() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useWagmiAccount();
  const { address: dogeAddress } = useDogeAccount();
  const address = dogeAddress || wagmiAddress;
  const isConnected = Boolean(dogeAddress || wagmiConnected);
  return { address, isConnected };
}
