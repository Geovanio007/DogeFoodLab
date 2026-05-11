import React from 'react';
import { useWalletConnect, useAccount as useDogeAccount } from '@dogeos/dogeos-sdk';
import { useAccount as useWagmiAccount, useChainId } from 'wagmi';
import { dogeOSChikyuTestnet } from '../config/dogeos';

/**
 * DogeConnectButton — drop-in replacement for RainbowKit's
 * `<ConnectButton.Custom>{({...}) => ...}</ConnectButton.Custom>` pattern,
 * powered by the DogeOS SDK.
 *
 * It exposes a render-prop with the same shape used by the existing UI:
 *   {
 *     account: { address, displayName },
 *     chain:   { id, name, unsupported },
 *     openConnectModal, openAccountModal, openChainModal,
 *     mounted, authenticationStatus
 *   }
 */
const DogeConnectButton = ({ children }) => {
  const { openModal, isConnected, isConnecting, disconnect } = useWalletConnect();
  const { address: dogeAddress, chainId: dogeChainId } = useDogeAccount();
  // Wagmi context is provided internally by DogeOS's WalletConnectProvider,
  // so these still work for any code already relying on wagmi.
  const { address: wagmiAddress, isConnected: wagmiConnected } = useWagmiAccount();
  const wagmiChainId = useChainId();

  const address = dogeAddress || wagmiAddress;
  const connected = Boolean(address) || isConnected || wagmiConnected;

  // chainId can come back as hex from EVM providers — normalize to number.
  const rawChainId = dogeChainId || wagmiChainId;
  let numericChainId = null;
  if (rawChainId != null) {
    numericChainId =
      typeof rawChainId === 'string' && rawChainId.startsWith('0x')
        ? parseInt(rawChainId, 16)
        : parseInt(rawChainId, 10);
    if (Number.isNaN(numericChainId)) numericChainId = null;
  }

  const supportedChainId = dogeOSChikyuTestnet.id;
  const unsupported =
    connected && numericChainId != null && numericChainId !== supportedChainId;

  const account = connected
    ? {
        address,
        displayName: address
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : '',
      }
    : null;

  const chain = connected
    ? {
        id: numericChainId,
        name: !unsupported ? dogeOSChikyuTestnet.name : 'Unsupported',
        unsupported,
      }
    : null;

  const openConnectModal = () => {
    try {
      openModal?.();
    } catch (e) {
      console.error('DogeOS openModal failed:', e);
    }
  };

  // The DogeOS SDK exposes a single modal that also surfaces account / chain
  // actions, so account/chain modals map to the same `openModal` call.
  // If disconnect is desired from the "account modal", consumers can call
  // `disconnect` from `useWalletConnect` directly.
  const openAccountModal = openConnectModal;
  const openChainModal = openConnectModal;

  return children({
    account,
    chain,
    openConnectModal,
    openAccountModal,
    openChainModal,
    disconnect,
    mounted: true,
    authenticationStatus: connected ? 'authenticated' : 'unauthenticated',
    isConnecting,
  });
};

export default DogeConnectButton;
