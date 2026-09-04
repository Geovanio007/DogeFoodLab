import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useWalletConnect, useAccount as useDogeAccount } from '@dogeos/dogeos-sdk';
import {
  ChevronLeft, Rocket, ImageIcon, Globe, Send, AtSign, Loader2,
  CheckCircle2, AlertTriangle, ExternalLink, PartyPopper, Wallet,
} from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { useUniversalWalletClient } from '../hooks/useUniversalWalletClient';
import { blockchainService } from '../services/blockchain';

/* ============================================================
   DogeFood Lab — LAB LAUNCHER (Create Token)
   Name + symbol go on-chain via LaunchpadFactory.createToken();
   description/logo/website/telegram/twitter are off-chain metadata
   saved to the backend right after the on-chain tx confirms.

   MyDoge WebView-hardened, same rules as LabLauncher.jsx.
   ============================================================ */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const MAX_NAME = 32;
const MAX_SYMBOL = 10;
const MAX_DESCRIPTION = 280;

const isValidUrl = (v) => {
  if (!v) return true;
  try { new URL(v); return true; } catch { return false; }
};

const STEPS = {
  FORM: 'form',
  DEPLOYING: 'deploying',
  SAVING: 'saving',
  SUCCESS: 'success',
  ONCHAIN_ERROR: 'onchain_error',
  METADATA_ERROR: 'metadata_error',
};

const LabLauncherCreate = () => {
  const navigate = useNavigate();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { walletClient } = useUniversalWalletClient();
  const { isCorrectNetwork, switchToDogeOS } = useWeb3();
  const { openModal, isConnecting } = useWalletConnect();
  const { address: dogeAddress } = useDogeAccount();

  const address = wagmiAddress || dogeAddress;
  const isConnected = wagmiConnected || Boolean(dogeAddress);

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [website, setWebsite] = useState('');
  const [telegram, setTelegram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [logoError, setLogoError] = useState(false);

  const [step, setStep] = useState(STEPS.FORM);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null); // { tokenAddress, txHash }
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  useEffect(() => { setLogoError(false); }, [logo]);

  const errors = useMemo(() => {
    const e = {};
    if (name.length > 0 && name.trim().length === 0) e.name = 'Name is required';
    if (name.length > MAX_NAME) e.name = `Keep it under ${MAX_NAME} characters`;
    if (symbol.length > 0 && !/^[A-Z0-9]+$/.test(symbol)) e.symbol = 'Letters and numbers only, no spaces';
    if (symbol.length > MAX_SYMBOL) e.symbol = `Keep it under ${MAX_SYMBOL} characters`;
    if (!isValidUrl(logo)) e.logo = 'Not a valid URL';
    if (!isValidUrl(website)) e.website = 'Not a valid URL';
    return e;
  }, [name, symbol, logo, website]);

  const canSubmit =
    name.trim().length > 0 &&
    symbol.trim().length > 0 &&
    Object.keys(errors).length === 0 &&
    isConnected &&
    isCorrectNetwork;

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    try {
      await switchToDogeOS();
    } finally {
      setSwitchingNetwork(false);
    }
  };

  const saveMetadata = async (tokenAddress) => {
    const res = await fetch(`${API_URL}/api/lab-launcher/tokens/${tokenAddress}/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creator_wallet: address,
        description: description.trim() || null,
        logo: logo.trim() || null,
        website: website.trim() || null,
        telegram: telegram.trim() || null,
        twitter: twitter.trim() || null,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !walletClient) return;
    setStep(STEPS.DEPLOYING);
    setErrorMessage('');

    const deployResult = await blockchainService.createLabLauncherToken(
      walletClient,
      address,
      name.trim(),
      symbol.trim().toUpperCase()
    );

    if (!deployResult.success) {
      setErrorMessage(deployResult.error || 'Transaction failed or was rejected.');
      setStep(STEPS.ONCHAIN_ERROR);
      return;
    }

    setResult({ tokenAddress: deployResult.tokenAddress, txHash: deployResult.txHash });
    setStep(STEPS.SAVING);

    try {
      await saveMetadata(deployResult.tokenAddress);
      setStep(STEPS.SUCCESS);
    } catch (e) {
      console.warn('[LabLauncherCreate] metadata save failed:', e?.message || e);
      setStep(STEPS.METADATA_ERROR);
    }
  };

  const retryMetadata = async () => {
    if (!result?.tokenAddress) return;
    setStep(STEPS.SAVING);
    try {
      await saveMetadata(result.tokenAddress);
      setStep(STEPS.SUCCESS);
    } catch {
      setStep(STEPS.METADATA_ERROR);
    }
  };

  const busy = step === STEPS.DEPLOYING || step === STEPS.SAVING;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-10">
      <div className="sticky top-0 z-20 bg-[#0a0e17]/95 border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/lab-launcher')}
          disabled={busy}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-lime-400 flex items-center justify-center">
          <Rocket className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-black leading-none">Create Token</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Free to launch — gas only</p>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {(step === STEPS.FORM || step === STEPS.ONCHAIN_ERROR) && (
          <>
            {/* Live preview - signature element, mirrors the discovery card */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden flex items-center justify-center shrink-0">
                  {logo && !logoError ? (
                    <img src={logo} alt="" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
                  ) : (
                    <span className="text-lg font-black text-amber-300">{(symbol || name || '?')[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{name || 'Your token name'}</h3>
                  <span className="text-[11px] font-bold text-slate-500">${symbol.toUpperCase() || 'SYMBOL'}</span>
                </div>
              </div>
              {description && <p className="text-xs text-slate-400 mt-2.5 line-clamp-2">{description}</p>}
            </div>

            {step === STEPS.ONCHAIN_ERROR && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-rose-300">The on-chain transaction didn't go through</p>
                  <p className="text-[11px] text-rose-400/80 mt-0.5 break-words">{errorMessage}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Nothing was deployed or charged — safe to try again.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Field label="Token Name" required error={errors.name}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={MAX_NAME}
                  placeholder="Doge Snacks"
                  className={inputClass(errors.name)}
                  data-testid="create-token-name"
                />
              </Field>

              <Field label="Symbol" required error={errors.symbol} hint="Uppercase, no spaces">
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  maxLength={MAX_SYMBOL}
                  placeholder="SNACK"
                  className={inputClass(errors.symbol)}
                  data-testid="create-token-symbol"
                />
              </Field>

              <Field label="Description" hint={`${description.length}/${MAX_DESCRIPTION}`}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                  rows={3}
                  placeholder="What's this token about?"
                  className={inputClass() + ' resize-none'}
                  data-testid="create-token-description"
                />
              </Field>

              <Field label="Logo URL" error={errors.logo} icon={ImageIcon}>
                <input
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://…"
                  className={inputClass(errors.logo)}
                  data-testid="create-token-logo"
                />
              </Field>

              <Field label="Website" optional error={errors.website} icon={Globe}>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://…"
                  className={inputClass(errors.website)}
                />
              </Field>

              <Field label="Telegram" optional icon={Send}>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="t.me/yourgroup"
                  className={inputClass()}
                />
              </Field>

              <Field label="X (Twitter)" optional icon={AtSign}>
                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@yourtoken"
                  className={inputClass()}
                />
              </Field>
            </div>

            <div className="mt-5">
              {!isConnected ? (
                <button
                  onClick={openModal}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  <Wallet className="w-4 h-4" /> {isConnecting ? 'Connecting…' : 'Connect Wallet'}
                </button>
              ) : !isCorrectNetwork ? (
                <button
                  onClick={handleSwitchNetwork}
                  disabled={switchingNetwork}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-sm font-bold text-amber-300 active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {switchingNetwork ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Switch to DogeOS Testnet
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-300 to-lime-400 text-sm font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
                  data-testid="create-token-submit"
                >
                  <Rocket className="w-4 h-4" /> Launch Token
                </button>
              )}
              <p className="text-[10px] text-slate-600 text-center mt-2">
                No launch fee — you only pay network gas. Every trade after that carries a small fee.
              </p>
            </div>
          </>
        )}

        {(step === STEPS.DEPLOYING || step === STEPS.SAVING) && (
          <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="create-token-busy">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-4" />
            <p className="text-sm font-bold text-white">
              {step === STEPS.DEPLOYING ? 'Confirm in your wallet…' : 'Saving your token details…'}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-[260px]">
              {step === STEPS.DEPLOYING
                ? 'Deploying your token on-chain. This needs a signature and a few seconds to confirm.'
                : 'Almost done — just writing the description, logo, and links.'}
            </p>
          </div>
        )}

        {step === STEPS.METADATA_ERROR && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-4" />
            <p className="text-sm font-bold text-white">Your token is live on-chain</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-[280px]">
              Just couldn't save the description/logo/links. You can retry that now, or fix it later — the token itself is already deployed and tradeable.
            </p>
            <p className="text-[11px] font-mono text-slate-600 mt-3 break-all px-4">{result?.tokenAddress}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={retryMetadata} className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
                Retry
              </button>
              <button onClick={() => navigate(`/lab-launcher/token/${result.tokenAddress}`)} className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-slate-300 text-xs font-bold">
                Skip, view token
              </button>
            </div>
          </div>
        )}

        {step === STEPS.SUCCESS && (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="create-token-success">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-4">
              <PartyPopper className="w-7 h-7 text-amber-300" />
            </div>
            <p className="text-base font-black text-white">${symbol.toUpperCase()} is live</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-[260px]">
              It's on the bonding curve now — anyone can buy in until it graduates.
            </p>
            <p className="text-[11px] font-mono text-slate-600 mt-3 break-all px-4">{result?.tokenAddress}</p>
            <div className="flex flex-col gap-2 mt-5 w-full">
              <button
                onClick={() => navigate(`/lab-launcher/token/${result.tokenAddress}`)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-300 to-lime-400 text-sm font-bold text-white flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> View Token
              </button>
              <button
                onClick={() => navigate('/lab-launcher')}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold text-slate-300"
              >
                Back to Launcher
              </button>
              {result?.txHash && (
                <a
                  href={`https://explorer.testnet.dogeos.com/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-[11px] text-slate-600 mt-1"
                >
                  View transaction <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const inputClass = (error) =>
  `w-full bg-white/[0.04] border ${error ? 'border-rose-500/50' : 'border-white/[0.08]'} rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-amber-400/50 transition-colors`;

const Field = ({ label, required, optional, hint, error, icon: Icon, children }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="flex items-center gap-1 text-xs font-bold text-slate-300">
        {Icon && <Icon className="w-3 h-3 text-slate-500" />}
        {label}
        {required && <span className="text-amber-400">*</span>}
        {optional && <span className="text-slate-600 font-normal">(optional)</span>}
      </label>
      {hint && !error && <span className="text-[10px] text-slate-600">{hint}</span>}
    </div>
    {children}
    {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
  </div>
);

export default LabLauncherCreate;
