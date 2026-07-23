import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWalletClient } from 'wagmi';
import { useWalletConnect, useAccount as useDogeAccount } from '@dogeos/dogeos-sdk';
import { formatUnits } from 'viem';
import {
  ChevronLeft, Crown, Wallet, Loader2, Coins, Users, TrendingUp,
  ShoppingBag, GraduationCap, ShieldCheck, Gift, AlertTriangle, Check,
} from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { blockchainService } from '../services/blockchain';

/* ============================================================
   DogeFood Lab — LAB LAUNCHER (Creator Dashboard)
   MyDoge WebView-hardened, same rules as the other Lab Launcher
   screens.
   ============================================================ */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const shortAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const fmtDoge = (n) => parseFloat(n || '0').toLocaleString(undefined, { maximumFractionDigits: 2 });

const SummaryStat = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
    <Icon className="w-4 h-4 text-fuchsia-400 mb-1.5" />
    <p className="text-lg font-black text-white leading-none">{value}</p>
    <p className="text-[10px] text-slate-500 mt-1">{label}</p>
  </div>
);

const TokenRow = ({ token, pending, claiming, isOwner, onClaim, onOpen }) => {
  const graduated = token.status === 'graduated';
  const hasPending = pending && pending > 0n;
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5">
      <button onClick={() => onOpen(token.token_address)} className="w-full text-left flex items-center gap-2.5 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-white truncate">{token.name}</h3>
            {graduated
              ? <GraduationCap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              : null}
          </div>
          <span className="text-[11px] font-bold text-slate-500">${token.symbol} • {graduated ? 'Graduated' : 'Bonding'}</span>
        </div>
      </button>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat label="Market Cap" value={`${fmtDoge(token.market_cap_doge)}`} />
        <MiniStat label="Volume" value={`${fmtDoge(token.volume_doge)}`} />
        <MiniStat label="Holders" value={token.holders ?? 0} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-black/25 border border-white/[0.06] px-3 py-2.5">
        <div>
          <p className="text-[10px] text-slate-500">Unclaimed royalties</p>
          <p className="text-sm font-black text-fuchsia-300">
            {pending === null ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : `${formatUnits(pending, 18)} ${token.symbol}`}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => onClaim(token.token_address)}
            disabled={!hasPending || claiming}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            data-testid={`claim-royalty-${token.token_address}`}
          >
            {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
            {claiming ? 'Claiming…' : 'Claim'}
          </button>
        )}
      </div>
      <p className="text-[10px] text-slate-600 mt-1.5">Lifetime claimed: {formatUnits(BigInt(token.total_royalties_claimed || '0'), 18)} {token.symbol}</p>
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div>
    <p className="text-[9px] text-slate-600">{label}</p>
    <p className="text-xs font-bold text-slate-200 truncate">{value}</p>
  </div>
);

const LabLauncherCreatorDashboard = () => {
  const { wallet: routeWallet } = useParams();
  const navigate = useNavigate();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isCorrectNetwork, switchToDogeOS } = useWeb3();
  const { openModal, isConnecting } = useWalletConnect();
  const { address: dogeAddress } = useDogeAccount();

  const myAddress = wagmiAddress || dogeAddress;
  const isConnected = wagmiConnected || Boolean(dogeAddress);
  const viewedWallet = (routeWallet || myAddress || '').toLowerCase();
  const isOwner = isConnected && myAddress && viewedWallet === myAddress.toLowerCase();

  const [dashboard, setDashboard] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingByToken, setPendingByToken] = useState({});
  const [claimingToken, setClaimingToken] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!viewedWallet) { setLoading(false); return; }
    setLoading(true);
    try {
      const [dashRes, claimsRes] = await Promise.all([
        fetch(`${API_URL}/api/lab-launcher/creators/${viewedWallet}/dashboard`),
        fetch(`${API_URL}/api/lab-launcher/creators/${viewedWallet}/royalty-claims?limit=10`),
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (claimsRes.ok) setClaims((await claimsRes.json()).claims || []);
    } catch (e) {
      console.warn('[CreatorDashboard] load failed:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, [viewedWallet]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Live on-chain pending-royalty reads, one per token
  useEffect(() => {
    if (!dashboard?.tokens?.length) return;
    let cancelled = false;
    dashboard.tokens.forEach((t) => {
      blockchainService.getPendingRoyalty(t.token_address).then((val) => {
        if (!cancelled) setPendingByToken((prev) => ({ ...prev, [t.token_address]: val }));
      });
    });
    return () => { cancelled = true; };
  }, [dashboard]);

  const totalVolume = useMemo(
    () => (dashboard?.tokens || []).reduce((sum, t) => sum + parseFloat(t.volume_doge || '0'), 0),
    [dashboard]
  );

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    try { await switchToDogeOS(); } finally { setSwitchingNetwork(false); }
  };

  const handleClaim = async (tokenAddress) => {
    if (!walletClient || !myAddress) return;
    setClaimingToken(tokenAddress);
    setClaimError('');
    const result = await blockchainService.claimRoyalty(walletClient, myAddress, tokenAddress);
    if (result.success) {
      const updated = await blockchainService.getPendingRoyalty(tokenAddress);
      setPendingByToken((prev) => ({ ...prev, [tokenAddress]: updated }));
      loadDashboard();
    } else {
      setClaimError(result.error || 'Claim failed');
    }
    setClaimingToken(null);
  };

  if (!viewedWallet) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center px-6 text-center">
        <Wallet className="w-8 h-8 text-slate-600 mb-3" />
        <p className="text-sm font-bold text-white mb-1">Connect your wallet</p>
        <p className="text-xs text-slate-500 mb-4">to see your Lab Launcher creator dashboard.</p>
        <button onClick={openModal} disabled={isConnecting} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-sm font-bold text-white disabled:opacity-60">
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-10">
      <div className="sticky top-0 z-20 bg-[#0a0e17]/95 border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/lab-launcher')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/5" aria-label="Back">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
          <Crown className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-black leading-none">{isOwner ? 'Your Dashboard' : 'Creator Dashboard'}</h1>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{shortAddress(viewedWallet)}</p>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin mb-3" />
            <p className="text-xs text-slate-500">Loading dashboard…</p>
          </div>
        ) : !dashboard || dashboard.total_tokens_created === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-slate-400 mb-1">{isOwner ? "You haven't launched a token yet." : "This wallet hasn't launched a token yet."}</p>
            {isOwner && (
              <button onClick={() => navigate('/lab-launcher/create')} className="mt-3 px-4 py-2 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-300 text-sm font-bold">
                Create a token
              </button>
            )}
          </div>
        ) : (
          <>
            {isOwner && !isConnected ? null : isOwner && !isCorrectNetwork && (
              <button onClick={handleSwitchNetwork} disabled={switchingNetwork} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-xs font-bold text-amber-300 disabled:opacity-60">
                {switchingNetwork ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />} Switch to DogeOS Testnet to claim royalties
              </button>
            )}

            {claimError && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-300 break-words">{claimError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <SummaryStat icon={Coins} label="Tokens Created" value={dashboard.total_tokens_created} />
              <SummaryStat icon={TrendingUp} label="Total Volume (DOGE)" value={fmtDoge(totalVolume)} />
              <SummaryStat icon={ShieldCheck} label="Royalty Claims" value={dashboard.total_royalty_claims} />
              <SummaryStat icon={ShoppingBag} label="In-Game Purchases" value={dashboard.in_game_purchases_using_creator_tokens} />
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Your Tokens
              </h2>
              <div className="space-y-2.5">
                {dashboard.tokens.map((t) => (
                  <TokenRow
                    key={t.token_address}
                    token={t}
                    pending={pendingByToken[t.token_address] ?? null}
                    claiming={claimingToken === t.token_address}
                    isOwner={isOwner && isCorrectNetwork}
                    onClaim={handleClaim}
                    onOpen={(addr) => navigate(`/lab-launcher/token/${addr}`)}
                  />
                ))}
              </div>
            </div>

            {claims.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Recent Claims</h2>
                <div className="space-y-1.5">
                  {claims.map((c, i) => (
                    <div key={`${c.tx_hash}-${i}`} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-slate-400 font-mono">{shortAddress(c.token_address)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-400">{formatUnits(BigInt(c.amount), 18)}</p>
                        <p className="text-[10px] text-slate-600">{timeAgo(c.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LabLauncherCreatorDashboard;
