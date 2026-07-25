import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWalletClient } from 'wagmi';
import { useWalletConnect, useAccount as useDogeAccount } from '@dogeos/dogeos-sdk';
import { formatUnits, parseUnits } from 'viem';
import {
  ChevronLeft, ShieldCheck, ShieldAlert, Lock, UserCheck, FileCheck,
  Share2, Globe, Send, AtSign, Loader2, ArrowUpRight, ArrowDownRight,
  Wallet, AlertTriangle, GraduationCap, Users, TrendingUp, Check,
} from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { blockchainService } from '../services/blockchain';

/* ============================================================
   DogeFood Lab — LAB LAUNCHER (Token Profile + Trading)
   MyDoge WebView-hardened, same rules as the other Lab Launcher
   screens: no backdrop-blur, no mix-blend-mode, -webkit- prefixed
   custom animations only.
   ============================================================ */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const REFRESH_MS = 20000;
const SLIPPAGE_BPS = 200n; // 2% — fixed rather than user-configurable, to keep this screen simple
const CURVE_PATH = 'M2,34 C10,34 16,33 22,29 C30,23 34,10 46,3';

const fmt = (wei, decimals = 4) => {
  if (wei === null || wei === undefined) return '0';
  try {
    const big = typeof wei === 'bigint' ? wei : BigInt(wei);
    const n = parseFloat(formatUnits(big, 18));
    if (!Number.isFinite(n)) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    if (n === 0) return '0';
    if (n < 0.0001) return n.toExponential(2);
    return n.toFixed(decimals);
  } catch {
    return '0';
  }
};

const shortAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

let stylesInjected = false;
const TradeStyles = () => {
  useEffect(() => {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes lab-trade-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
      .lab-trade-curve-fill { -webkit-animation: lab-trade-shimmer 2.4s linear infinite; animation: lab-trade-shimmer 2.4s linear infinite; background-size: 200% 100%; }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
};

const AntiRugBadge = ({ icon: Icon, label, ok, alert }) => (
  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
    alert ? 'bg-rose-500/10 border-rose-500/30' : ok ? 'bg-lime-500/10 border-lime-500/20' : 'bg-white/[0.03] border-white/[0.06]'
  }`}>
    <Icon className={`w-3.5 h-3.5 ${alert ? 'text-rose-400' : ok ? 'text-lime-400' : 'text-slate-500'}`} />
    <span className={`text-[10px] font-bold ${alert ? 'text-rose-300' : ok ? 'text-lime-300' : 'text-slate-500'}`}>{label}</span>
  </div>
);

const BigCurve = ({ progressBps, graduated }) => {
  const pct = graduated ? 100 : Math.min(100, Math.max(0, progressBps / 100));
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-400">{graduated ? 'Graduated to DEX' : 'Bonding Progress'}</span>
        <span className={`text-xs font-black ${graduated ? 'text-lime-300' : 'text-amber-300'}`}>
          {graduated ? '100%' : `${pct.toFixed(1)}%`}
        </span>
      </div>
      <div className="relative h-14 w-full">
        <svg viewBox="0 0 48 36" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d={CURVE_PATH} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          <svg viewBox="0 0 48 36" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="big-curve-grad" x1="0" y1="0" x2="1" y2="0">
                {graduated ? (<><stop offset="0%" stopColor="#a3e635" /><stop offset="100%" stopColor="#4ade80" /></>)
                  : (<><stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#bef264" /></>)}
              </linearGradient>
            </defs>
            <path d={CURVE_PATH} fill="none" stroke="url(#big-curve-grad)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const LabLauncherToken = () => {
  const { address: tokenAddress } = useParams();
  const navigate = useNavigate();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isCorrectNetwork, switchToDogeOS } = useWeb3();
  const { openModal, isConnecting } = useWalletConnect();
  const { address: dogeAddress } = useDogeAccount();

  const address = wagmiAddress || dogeAddress;
  const isConnected = wagmiConnected || Boolean(dogeAddress);
  const lowerToken = (tokenAddress || '').toLowerCase();

  const [token, setToken] = useState(null);
  const [trades, setTrades] = useState([]);
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const [side, setSide] = useState('buy'); // 'buy' | 'sell'
  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState(null); // { tokensOut/dogeOut, fee }
  const [previewing, setPreviewing] = useState(false);
  const [myBalance, setMyBalance] = useState(0n);
  const [myAllowance, setMyAllowance] = useState(0n);
  const [txState, setTxState] = useState('idle'); // idle | approving | pending | success | error
  const [txError, setTxError] = useState('');
  const [txSig, setTxSig] = useState(null);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  const previewTimer = useRef(null);

  const loadProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tokenRes, tradesRes, holdersRes] = await Promise.all([
        fetch(`${API_URL}/api/lab-launcher/tokens/${lowerToken}`),
        fetch(`${API_URL}/api/lab-launcher/tokens/${lowerToken}/trades?limit=25`),
        fetch(`${API_URL}/api/lab-launcher/tokens/${lowerToken}/holders?limit=15`),
      ]);
      if (tokenRes.status === 404) { setNotFound(true); return; }
      if (!tokenRes.ok) throw new Error(`HTTP ${tokenRes.status}`);
      const tokenData = await tokenRes.json();
      setToken(tokenData);
      if (tradesRes.ok) setTrades((await tradesRes.json()).trades || []);
      if (holdersRes.ok) setHolders((await holdersRes.json()).holders || []);
      setNotFound(false);
    } catch (e) {
      console.warn('[LabLauncherToken] load failed:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, [lowerToken]);

  useEffect(() => {
    loadProfile();
    const interval = setInterval(() => loadProfile(true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadProfile]);

  useEffect(() => {
    if (!address || !tokenAddress) return;
    blockchainService.getTokenBalance(tokenAddress, address).then(setMyBalance);
    blockchainService.getTokenAllowance(tokenAddress, address).then(setMyAllowance);
  }, [address, tokenAddress, txState]);

  // Live on-chain preview, debounced
  useEffect(() => {
    clearTimeout(previewTimer.current);
    if (!amount || Number(amount) <= 0 || !token) { setPreview(null); return; }
    previewTimer.current = setTimeout(async () => {
      setPreviewing(true);
      try {
        const wei = parseUnits(amount, 18);
        const result = side === 'buy'
          ? await blockchainService.previewBuy(tokenAddress, wei)
          : await blockchainService.previewSell(tokenAddress, wei);
        setPreview(result);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 400);
    return () => clearTimeout(previewTimer.current);
  }, [amount, side, token, tokenAddress]);

  const graduated = token?.status === 'graduated';
  const isMyToken = address && token?.creator_wallet?.toLowerCase() === address.toLowerCase();
  const myBalanceFormatted = useMemo(() => parseFloat(formatUnits(myBalance, 18)), [myBalance]);

  const setQuickAmount = (fraction) => {
    if (side === 'sell') {
      const v = (myBalanceFormatted * fraction).toFixed(6);
      setAmount(v === '0.000000' ? '' : v);
    } else {
      setAmount(String(fraction));
    }
  };

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    try { await switchToDogeOS(); } finally { setSwitchingNetwork(false); }
  };

  const resetTx = () => { setTxState('idle'); setTxError(''); setTxSig(null); };

  const handleTrade = async () => {
    if (!walletClient || !amount || Number(amount) <= 0) return;
    const wei = parseUnits(amount, 18);

    if (side === 'buy') {
      setTxState('pending');
      const previewNow = await blockchainService.previewBuy(tokenAddress, wei);
      const minTokensOut = previewNow ? (previewNow.tokensOut * (10000n - SLIPPAGE_BPS)) / 10000n : 0n;
      const result = await blockchainService.buyToken(walletClient, address, tokenAddress, wei, minTokensOut);
      if (result.success) {
        setTxState('success'); setTxSig(result.txHash); setAmount(''); loadProfile(true);
      } else {
        setTxState('error'); setTxError(result.error);
      }
      return;
    }

    // sell
    if (myAllowance < wei) {
      setTxState('approving');
      const approveResult = await blockchainService.approveToken(walletClient, address, tokenAddress, wei);
      if (!approveResult.success) {
        setTxState('error'); setTxError(approveResult.error);
        return;
      }
      setMyAllowance(wei);
    }
    setTxState('pending');
    const previewNow = await blockchainService.previewSell(tokenAddress, wei);
    const minDogeOut = previewNow ? (previewNow.dogeOut * (10000n - SLIPPAGE_BPS)) / 10000n : 0n;
    const result = await blockchainService.sellToken(walletClient, address, tokenAddress, wei, minDogeOut);
    if (result.success) {
      setTxState('success'); setTxSig(result.txHash); setAmount(''); loadProfile(true);
    } else {
      setTxState('error'); setTxError(result.error);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/lab-launcher/token/${tokenAddress}`;
    if (navigator.share) {
      try { await navigator.share({ title: token?.name, url }); } catch { /* user cancelled the share sheet */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch { /* clipboard unavailable, no-op */ }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin mb-3" />
        <p className="text-xs text-slate-500">Loading token…</p>
      </div>
    );
  }

  if (notFound || !token) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-bold text-white mb-1">Token not found</p>
        <p className="text-xs text-slate-500 mb-4">It may still be indexing, or the address is wrong.</p>
        <button onClick={() => navigate('/lab-launcher')} className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-bold text-slate-300">
          Back to Launcher
        </button>
      </div>
    );
  }

  const canTrade = amount && Number(amount) > 0 && (side === 'buy' || myBalanceFormatted >= Number(amount));
  const needsApproval = side === 'sell' && amount && myAllowance < parseUnits(amount || '0', 18);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-10">
      <TradeStyles />

      <div className="sticky top-0 z-20 bg-[#0a0e17]/95 border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/lab-launcher')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/5" aria-label="Back">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/[0.06] overflow-hidden flex items-center justify-center shrink-0">
          {token.logo ? (
            <img src={token.logo} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span className="text-sm font-black text-amber-300">{token.symbol?.[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-sm font-black truncate">{token.name}</h1>
            {token.verified && <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
          </div>
          <span className="text-[11px] font-bold text-slate-500">${token.symbol}</span>
        </div>
        <button onClick={handleShare} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Share">
          {copied ? <Check className="w-4.5 h-4.5 text-lime-400" /> : <Share2 className="w-4.5 h-4.5 text-slate-400" />}
        </button>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Price" value={`${parseFloat(token.last_price_doge || '0').toFixed(8)}`} sub="DOGE" />
          <Stat label="Market Cap" value={`${parseFloat(token.market_cap_doge || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="DOGE" />
          <Stat label="Volume" value={`${parseFloat(token.volume_doge || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="DOGE" />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <Users className="w-3.5 h-3.5" /> {token.holders ?? 0} holders
          <span className="text-slate-700">•</span>
          <span>by {shortAddress(token.creator_wallet)}</span>
          {isMyToken && (
            <button
              onClick={() => navigate('/lab-launcher/creator')}
              className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded"
            >
              YOU · Dashboard
            </button>
          )}
        </div>

        <BigCurve progressBps={token.bonding_progress_bps || 0} graduated={graduated} />

        <div className="flex flex-wrap gap-1.5">
          <AntiRugBadge icon={UserCheck} label="Ownership Renounced" ok={token.anti_rug?.ownership_renounced} />
          <AntiRugBadge icon={Lock} label={graduated ? 'Liquidity Locked' : 'Locks at graduation'} ok={token.anti_rug?.liquidity_locked} />
          <AntiRugBadge icon={FileCheck} label="Contract Verified" ok={token.anti_rug?.contract_verified} />
          {token.anti_rug?.large_wallet_alert && (
            <AntiRugBadge icon={ShieldAlert} label={`Top holder ${token.anti_rug.top_holder_pct}%`} alert />
          )}
        </div>

        {token.description && <p className="text-sm text-slate-400">{token.description}</p>}

        {(token.website || token.telegram || token.twitter) && (
          <div className="flex gap-2">
            {token.website && <LinkChip icon={Globe} href={token.website} />}
            {token.telegram && <LinkChip icon={Send} href={`https://${token.telegram.replace(/^https?:\/\//, '')}`} />}
            {token.twitter && <LinkChip icon={AtSign} href={`https://x.com/${token.twitter.replace(/^@/, '')}`} />}
          </div>
        )}

        {graduated ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-center">
            <GraduationCap className="w-6 h-6 text-amber-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-amber-200">This token graduated to the DEX</p>
            <p className="text-xs text-amber-300/70 mt-1">Bonding curve trading is closed — swap it on DogeOS's DEX instead.</p>
            {token.dex_pair && <p className="text-[10px] font-mono text-slate-600 mt-2 break-all">{token.dex_pair}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => { setSide('buy'); setAmount(''); resetTx(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${side === 'buy' ? 'bg-lime-500/20 border border-lime-400/40 text-lime-300' : 'bg-white/[0.03] border border-transparent text-slate-500'}`}
                data-testid="trade-tab-buy"
              >
                Buy
              </button>
              <button
                onClick={() => { setSide('sell'); setAmount(''); resetTx(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${side === 'sell' ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300' : 'bg-white/[0.03] border border-transparent text-slate-500'}`}
                data-testid="trade-tab-sell"
              >
                Sell
              </button>
            </div>

            {side === 'sell' && (
              <p className="text-[11px] text-slate-500 mb-2">Your balance: {myBalanceFormatted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}</p>
            )}

            <div className="flex items-center gap-2 bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5 mb-2">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-lg font-bold text-white placeholder:text-slate-700 outline-none min-w-0"
                data-testid="trade-amount-input"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">{side === 'buy' ? 'DOGE' : token.symbol}</span>
            </div>

            <div className="flex gap-1.5 mb-3">
              {side === 'buy'
                ? [1, 5, 10, 25].map((v) => <QuickBtn key={v} onClick={() => setAmount(String(v))} label={`${v}`} />)
                : [0.25, 0.5, 0.75, 1].map((f) => <QuickBtn key={f} onClick={() => setQuickAmount(f)} label={f === 1 ? 'Max' : `${f * 100}%`} />)}
            </div>

            <div className="text-xs text-slate-500 min-h-[18px] mb-3">
              {previewing ? (
                <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Estimating…</span>
              ) : preview ? (
                side === 'buy'
                  ? <span>You'll get ≈ <b className="text-white">{fmt(preview.tokensOut, 2)} {token.symbol}</b> <span className="text-slate-600">(fee {fmt(preview.fee, 4)} DOGE)</span></span>
                  : <span>You'll get ≈ <b className="text-white">{fmt(preview.dogeOut, 4)} DOGE</b> <span className="text-slate-600">(fee {fmt(preview.fee, 4)} DOGE)</span></span>
              ) : null}
            </div>

            {txState === 'error' && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-300 break-words">{txError}</p>
              </div>
            )}
            {txState === 'success' && (
              <div className="flex items-center gap-2 rounded-lg bg-lime-500/10 border border-lime-500/30 px-3 py-2 mb-3">
                <Check className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <p className="text-[11px] text-lime-300">Trade confirmed{txSig ? ` — ${shortAddress(txSig)}` : ''}</p>
              </div>
            )}

            {!isConnected ? (
              <button onClick={openModal} disabled={isConnecting} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-bold text-white disabled:opacity-60">
                <Wallet className="w-4 h-4" /> {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            ) : !isCorrectNetwork ? (
              <button onClick={handleSwitchNetwork} disabled={switchingNetwork} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-sm font-bold text-amber-300 disabled:opacity-60">
                {switchingNetwork ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Switch Network
              </button>
            ) : (
              <button
                onClick={handleTrade}
                disabled={!canTrade || txState === 'pending' || txState === 'approving'}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-transform active:scale-[0.98] ${
                  side === 'buy' ? 'bg-gradient-to-r from-lime-500 to-lime-600' : 'bg-gradient-to-r from-rose-500 to-rose-600'
                }`}
                data-testid="trade-submit"
              >
                {txState === 'approving' && <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</>}
                {txState === 'pending' && <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>}
                {(txState === 'idle' || txState === 'success' || txState === 'error') && (needsApproval ? 'Approve & Sell' : side === 'buy' ? 'Buy' : 'Sell')}
              </button>
            )}
          </div>
        )}

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Recent Trades</h2>
          {trades.length === 0 ? (
            <p className="text-xs text-slate-600 py-4 text-center">No trades yet — be the first.</p>
          ) : (
            <div className="space-y-1.5">
              {trades.slice(0, 12).map((t, i) => (
                <div key={`${t.tx_hash}-${t.log_index ?? i}`} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.is_buy ? <ArrowUpRight className="w-3.5 h-3.5 text-lime-400 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    <span className="text-xs text-slate-400 truncate">{shortAddress(t.trader)}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${t.is_buy ? 'text-lime-400' : 'text-rose-400'}`}>{parseFloat(t.doge_amount || '0').toFixed(2)} DOGE</p>
                    <p className="text-[10px] text-slate-600">{timeAgo(t.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Top Holders
          </h2>
          {holders.length === 0 ? (
            <p className="text-xs text-slate-600 py-4 text-center">No holders yet.</p>
          ) : (
            <div className="space-y-1.5">
              {holders.slice(0, 10).map((h, i) => (
                <div key={h.wallet} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-600 w-4">{i + 1}</span>
                    <span className="text-xs text-slate-400">{shortAddress(h.wallet)}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">{h.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, sub }) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-sm font-black text-white truncate">{value}</p>
    {sub && <p className="text-[9px] text-slate-600">{sub}</p>}
  </div>
);

const QuickBtn = ({ onClick, label }) => (
  <button onClick={onClick} className="flex-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-slate-400 active:scale-95 transition-transform">
    {label}
  </button>
);

const LinkChip = ({ icon: Icon, href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
    <Icon className="w-3.5 h-3.5 text-slate-400" />
  </a>
);

export default LabLauncherToken;
