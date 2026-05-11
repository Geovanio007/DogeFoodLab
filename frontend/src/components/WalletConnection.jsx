import React, { useState } from 'react';
import { useWalletConnect, useAccount as useDogeAccount } from '@dogeos/dogeos-sdk';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useWeb3 } from '../hooks/useWeb3';
import { useGame } from '../contexts/GameContext';
import { AlertTriangle, CheckCircle, Wifi, Wallet, LogOut } from 'lucide-react';

const shortAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

const WalletConnection = () => {
  const { address, isConnected, isCorrectNetwork, switchToDogeOS } = useWeb3();
  const { user, isNFTHolder, currentLevel, points } = useGame();
  const { openModal, disconnect, isConnecting } = useWalletConnect();
  // Pull address from DogeOS as a fallback in case the wagmi shim
  // hasn't propagated yet on first render.
  const { address: dogeAddress } = useDogeAccount();
  const [isAuthenticating] = useState(false);

  const effectiveAddress = address || dogeAddress;
  const effectiveConnected = isConnected || Boolean(dogeAddress);

  const handleNetworkSwitch = async () => {
    try {
      await switchToDogeOS();
    } catch (error) {
      console.error('Network switch failed:', error);
    }
  };

  const handleConnect = () => {
    try {
      openModal?.();
    } catch (error) {
      console.error('Failed to open DogeOS wallet modal:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect?.();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Network Status Indicator */}
      {effectiveConnected && (
        <div className="flex items-center gap-2">
          {isCorrectNetwork ? (
            <Badge className="bg-green-500 text-white flex items-center gap-1">
              <CheckCircle size={12} />
              DogeOS Chikyū
            </Badge>
          ) : (
            <Button
              onClick={handleNetworkSwitch}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1 text-sm px-3 py-1 h-auto"
            >
              <AlertTriangle size={12} />
              Switch to DogeOS
            </Button>
          )}
        </div>
      )}

      {/* User Stats (if connected and authenticated) */}
      {effectiveConnected && user && isCorrectNetwork && (
        <div className="flex items-center gap-2">
          {isNFTHolder && (
            <Badge className="vip-badge">VIP Scientist 👨‍🔬</Badge>
          )}
          <div className="glass-panel p-2 text-sm">
            <div className="text-xs text-gray-600">Level {currentLevel}</div>
            <div className="font-bold">{points} Points</div>
          </div>
        </div>
      )}

      {/* BETA Badge */}
      <Badge className="bg-blue-600 text-white flex items-center gap-1">
        <Wifi size={12} />
        BETA
      </Badge>

      {/* DogeOS Connect / Disconnect */}
      {effectiveConnected ? (
        <div className="flex items-center gap-2">
          <Badge className="bg-slate-800 text-white px-3 py-1 font-mono">
            {shortAddress(effectiveAddress)}
          </Badge>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="text-sm px-3 py-1 h-auto flex items-center gap-1"
          >
            <LogOut size={12} />
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={isConnecting || isAuthenticating}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex items-center gap-2 px-4 py-2 h-auto font-semibold"
        >
          <Wallet size={16} />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      )}
    </div>
  );
};

export default WalletConnection;
