import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Rocket, Search, X, Plus, ArrowUpDown, ShieldCheck,
  Flame, Sparkles, GraduationCap, Gem, Dog, Heart, Loader2, Users, Crown,
} from 'lucide-react';

/* ============================================================
   DogeFood Lab — LAB LAUNCHER (Discovery)
   Browse/search/sort every community-created token on the bonding
   curve launcher. Read-only feed; buying/selling happens on the
   token profile screen.

   MyDoge WebView-hardened, following LabFeed.jsx / LabSurge.jsx:
   ✅ No backdrop-filter / backdrop-blur
   ✅ No filter:blur() on layout elements
   ✅ No mix-blend-mode
   ✅ All custom animations carry -webkit- prefixes
   ============================================================ */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const PAGE_SIZE = 20;

const TABS = [
  { key: 'trending', label: 'Trending', icon: Flame },
  { key: 'new', label: 'New', icon: Sparkles },
  { key: 'graduated', label: 'Graduated', icon: GraduationCap },
  { key: 'highest_volume', label: 'Volume', icon: Gem },
  { key: 'most_holders', label: 'Holders', icon: Dog },
  { key: 'community_favorites', label: 'Favorites', icon: Heart },
];

const SORTS = [
  { key: '', label: 'Default for tab' },
  { key: 'volume', label: 'Volume' },
  { key: 'market_cap', label: 'Market cap' },
  { key: 'holders', label: 'Holders' },
  { key: 'newest', label: 'Newest' },
  { key: 'graduated', label: 'Graduation date' },
];

function formatCompact(dogeString) {
  const n = parseFloat(dogeString || '0');
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function shortAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Styles injected once at module load — same pattern as LabFeed.jsx.
let stylesInjected = false;
const LabLauncherStyles = () => {
  useEffect(() => {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes lab-launcher-shimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      .lab-launcher-curve-fill {
        -webkit-animation: lab-launcher-shimmer 2.4s linear infinite;
        animation: lab-launcher-shimmer 2.4s linear infinite;
        background-size: 200% 100%;
      }
      @keyframes lab-launcher-pop {
        0% { transform: scale(0.96); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .lab-launcher-card-in {
        -webkit-animation: lab-launcher-pop 0.25s ease-out;
        animation: lab-launcher-pop 0.25s ease-out;
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
};

// Signature element: the bonding curve itself as the progress indicator,
// not a generic bar. Same SVG path drawn twice - a dim track, and a
// bright, clipped-to-progress copy on top of it.
const CURVE_PATH = 'M2,34 C10,34 16,33 22,29 C30,23 34,10 46,3';

const BondingCurveIndicator = ({ progressBps, graduated }) => {
  const pct = graduated ? 100 : Math.min(100, Math.max(0, progressBps / 100));
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {graduated ? 'Graduated' : 'Bonding'}
        </span>
        <span className={`text-[10px] font-bold ${graduated ? 'text-lime-300' : 'text-amber-300'}`}>
          {graduated ? 'DEX live' : `${pct.toFixed(1)}%`}
        </span>
      </div>
      <div className="relative h-9 w-full">
        <svg viewBox="0 0 48 36" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d={CURVE_PATH} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          <svg viewBox="0 0 48 36" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`curve-grad-${graduated ? 'g' : 'b'}`} x1="0" y1="0" x2="1" y2="0">
                {graduated ? (
                  <>
                    <stop offset="0%" stopColor="#a3e635" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="100%" stopColor="#bef264" />
                  </>
                )}
              </linearGradient>
            </defs>
            <path
              d={CURVE_PATH}
              fill="none"
              stroke={`url(#curve-grad-${graduated ? 'g' : 'b'})`}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

const TokenCard = ({ token, onOpen }) => {
  const graduated = token.status === 'graduated';
  return (
    <button
      onClick={() => onOpen(token.token_address)}
      className="lab-launcher-card-in w-full text-left rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 active:scale-[0.98] transition-transform"
      data-testid="lab-launcher-token-card"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden flex items-center justify-center shrink-0">
          {token.logo ? (
            <img src={token.logo} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span className="text-lg font-black text-amber-300">{(token.symbol || '?')[0]}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-white truncate">{token.name}</h3>
            {token.verified && (
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-label="Verified" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-bold text-slate-500">${token.symbol}</span>
            <span className="text-[11px] text-slate-600">by {shortAddress(token.creator_wallet)}</span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <div>
              <span className="text-slate-500">MCap </span>
              <span className="font-bold text-white">{formatCompact(token.market_cap_doge)} DOGE</span>
            </div>
            <div className="flex items-center gap-0.5 text-slate-500">
              <Users className="w-3 h-3" />
              <span className="font-bold text-slate-300">{token.holders ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <BondingCurveIndicator progressBps={token.bonding_progress_bps || 0} graduated={graduated} />
      </div>
    </button>
  );
};

const LabLauncher = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trending');
  const [sort, setSort] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [tokens, setTokens] = useState([]);
  const offsetRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const sentinelRef = useRef(null);
  const inFlightRef = useRef(false);
  const searchInputRef = useRef(null);

  const loadPage = useCallback(async (nextOffset, replace, opts = {}) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const params = new URLSearchParams();
      params.set('limit', PAGE_SIZE);
      params.set('offset', nextOffset);
      const tab = opts.tab ?? activeTab;
      const s = opts.sort ?? sort;
      const q = opts.search ?? search;
      if (tab) params.set('tab', tab);
      if (s) params.set('sort', s);
      if (q.trim()) params.set('search', q.trim());

      const res = await fetch(`${API_URL}/api/lab-launcher/tokens?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTokens((prev) => (replace ? data.tokens : [...prev, ...data.tokens]));
      setHasMore(data.tokens.length === PAGE_SIZE);
      setLoadFailed(false);
    } catch (e) {
      console.warn('[LabLauncher] fetch failed:', e?.message || e);
      if (replace) setLoadFailed(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }, [activeTab, sort, search]);

  useEffect(() => {
    setLoading(true);
    offsetRef.current = 0;
    loadPage(0, true);
  }, [activeTab, sort]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      offsetRef.current = 0;
      loadPage(0, true);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !inFlightRef.current) {
          setLoadingMore(true);
          offsetRef.current += PAGE_SIZE;
          loadPage(offsetRef.current, false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasMore, loadPage]);

  const openSearch = () => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };
  const closeSearch = () => {
    setShowSearch(false);
    setSearch('');
  };

  const activeSortLabel = useMemo(() => SORTS.find((s) => s.key === sort)?.label || 'Sort', [sort]);
  const showEmpty = !loading && tokens.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-8">
      <LabLauncherStyles />

      <div className="sticky top-0 z-20 bg-[#0a0e17]/95 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/5" aria-label="Back">
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-lime-400 flex items-center justify-center">
            <Rocket className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black leading-none">Lab Launcher</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Launch it. Trade it. Graduate it.</p>
          </div>
          {!showSearch && (
            <button onClick={openSearch} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Search" data-testid="lab-launcher-search-open">
              <Search className="w-4.5 h-4.5 text-slate-400" />
            </button>
          )}
          {!showSearch && (
            <button onClick={() => navigate('/lab-launcher/creator')} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Your creator dashboard" data-testid="lab-launcher-my-dashboard">
              <Crown className="w-4.5 h-4.5 text-slate-400" />
            </button>
          )}
          <button
            onClick={() => navigate('/lab-launcher/create')}
            className="flex items-center gap-1 pl-2 pr-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-300 to-lime-400 text-white text-xs font-bold active:scale-95 transition-transform"
            data-testid="lab-launcher-create-cta"
          >
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>

        {showSearch && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or symbol"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
              data-testid="lab-launcher-search-input"
            />
            <button onClick={closeSearch} aria-label="Close search">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                    active
                      ? 'bg-gradient-to-r from-amber-400/25 to-lime-500/25 border border-amber-400/40 text-amber-200'
                      : 'bg-white/[0.04] border border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                  data-testid={`lab-launcher-tab-${tab.key}`}
                >
                  <Icon className="w-3 h-3" /> {tab.label}
                </button>
              );
            })}
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSort((s) => !s)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-slate-400"
              data-testid="lab-launcher-sort-toggle"
            >
              <ArrowUpDown className="w-3 h-3" /> {activeSortLabel}
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl bg-[#12172a] border border-white/[0.08] overflow-hidden z-30 shadow-xl">
                {SORTS.map((s) => (
                  <button
                    key={s.key || 'default'}
                    onClick={() => { setSort(s.key); setShowSort(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold ${
                      sort === s.key ? 'text-amber-300 bg-amber-500/10' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16" data-testid="lab-launcher-loading">
            <img src="/dogefood-logo.png" alt="" className="w-14 h-14 opacity-70 animate-pulse" />
            <p className="text-slate-500 text-xs mt-3">Loading tokens…</p>
          </div>
        )}

        {showEmpty && (
          <div className="text-center py-16" data-testid="lab-launcher-empty">
            <p className="text-slate-400 text-sm mb-1">
              {loadFailed ? "Couldn't reach the launcher right now." : search ? 'No tokens match your search.' : 'No tokens here yet.'}
            </p>
            <p className="text-slate-600 text-xs mb-4">
              {!loadFailed && !search && 'Be the first to launch one.'}
            </p>
            {!search && !loadFailed && (
              <button
                onClick={() => navigate('/lab-launcher/create')}
                className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-sm font-bold hover:bg-amber-500/25 transition-colors"
              >
                Create a token
              </button>
            )}
            {loadFailed && (
              <button
                onClick={() => { setLoading(true); offsetRef.current = 0; loadPage(0, true); }}
                className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-slate-300 text-sm font-bold"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && tokens.length > 0 && (
          <div className="space-y-2.5">
            {tokens.map((token) => (
              <TokenCard key={token.token_address} token={token} onOpen={(addr) => navigate(`/lab-launcher/token/${addr}`)} />
            ))}
            <div ref={sentinelRef} className="h-10 flex items-center justify-center">
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-slate-600" />}
              {!hasMore && !loadingMore && (
                <span className="text-[11px] text-slate-700">That's every token on this tab</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabLauncher;
