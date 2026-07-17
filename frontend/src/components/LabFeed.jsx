import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Newspaper, ExternalLink, Heart, Bookmark, Share2, RefreshCw, Loader2 } from 'lucide-react';

/* ============================================================
   DogeFood Lab — LAB FEED
   Curated Dogecoin ecosystem news/discussion, aggregated server-side
   from public RSS sources (see backend for the full source list and
   keyword filter). Read-only: players cannot post, only view, like,
   bookmark, and share what's already there.

   MyDoge WebView-hardened, following the same rules LabSurge.jsx /
   LabArena.jsx established:
   ✅ No backdrop-filter / backdrop-blur
   ✅ No filter:blur() on layout elements
   ✅ No mix-blend-mode
   ✅ All custom animations carry -webkit- prefixes
   ============================================================ */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const PAGE_SIZE = 20;

function timeAgo(isoString) {
  if (!isoString) return '';
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// Styles injected once at module load (not per-render) — same pattern
// used by WelcomeScreen.jsx / LabSurge.jsx elsewhere in this app.
let stylesInjected = false;
const LabFeedStyles = () => {
  useEffect(() => {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes lab-feed-breathe {
        0%, 100% { transform: scale(1); opacity: 0.65; }
        50% { transform: scale(1.08); opacity: 1; }
      }
      .lab-feed-breathe {
        -webkit-animation: lab-feed-breathe 1.8s ease-in-out infinite;
        animation: lab-feed-breathe 1.8s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
};

const FeedCard = ({ post, onInteract, interacted }) => {
  const liked = !!interacted[`${post.id}:like`];
  const bookmarked = !!interacted[`${post.id}:bookmark`];

  const handleShare = async () => {
    onInteract(post.id, 'share');
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url: post.url });
      } catch (_) { /* user cancelled the share sheet — not an error */ }
    } else {
      try { await navigator.clipboard.writeText(post.url); } catch (_) { /* clipboard unavailable, no-op */ }
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden" data-testid="lab-feed-card">
      {post.image_url && (
        <div className="w-full h-36 bg-black/30 overflow-hidden">
          <img
            src={post.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs" aria-hidden>{post.badge}</span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{post.source_name}</span>
          <span className="text-[11px] text-slate-600">· {timeAgo(post.published_at)}</span>
        </div>

        <h3 className="text-sm font-bold text-white leading-snug mb-1">{post.title}</h3>

        {post.description && (
          <p
            className="text-[12px] text-slate-400 leading-relaxed"
            style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {post.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[12px] font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
            data-testid="lab-feed-open-article"
          >
            Open Article <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onInteract(post.id, 'like')}
              aria-label="Like"
              className={`p-1.5 rounded-lg transition-colors ${liked ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Heart className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onInteract(post.id, 'bookmark')}
              aria-label="Bookmark"
              className={`p-1.5 rounded-lg transition-colors ${bookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Bookmark className="w-3.5 h-3.5" fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LabFeed = ({ playerAddress }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [interacted, setInteracted] = useState({}); // { "postId:action": true }
  const sentinelRef = useRef(null);
  const inFlightRef = useRef(false);

  const loadPage = useCallback(async (pageNum, replace) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(`${API_URL}/api/lab-feed?limit=${PAGE_SIZE}&page=${pageNum}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts((prev) => (replace ? data.posts : [...prev, ...data.posts]));
      setHasMore(!!data.has_more);
      setLoadFailed(false);
    } catch (e) {
      console.warn('[LabFeed] fetch failed:', e?.message || e);
      if (replace) setLoadFailed(true); // only show the failure state if we have nothing to show already
    } finally {
      setLoading(false);
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadPage(1, true);
  }, [loadPage]);

  // Infinite scroll: load the next page once the sentinel div nears the viewport.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !inFlightRef.current) {
          setLoadingMore(true);
          setPage((p) => {
            const next = p + 1;
            loadPage(next, false);
            return next;
          });
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasMore, loadPage]);

  const handleRefresh = () => {
    setLoading(true);
    setPage(1);
    loadPage(1, true);
  };

  const handleInteract = async (postId, action) => {
    const key = `${postId}:${action}`;
    if (interacted[key]) return;
    setInteracted((prev) => ({ ...prev, [key]: true })); // optimistic — feels instant either way
    try {
      await fetch(`${API_URL}/api/lab-feed/${postId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: playerAddress }),
      });
    } catch (e) {
      console.warn('[LabFeed] interaction failed (non-fatal):', e?.message || e);
    }
  };

  const showEmpty = !loading && posts.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-8">
      <LabFeedStyles />

      <div className="sticky top-0 z-20 bg-[#0a0e17]/95 border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/5" aria-label="Back">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
          <Newspaper className="w-4.5 h-4.5 text-[#0c2440]" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-black leading-none">Lab Feed</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Dogecoin news, right in the lab</p>
        </div>
        <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Refresh">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16" data-testid="lab-feed-loading">
            <img src="/dogefood-logo.png" alt="" className="w-14 h-14 lab-feed-breathe" />
            <p className="text-slate-500 text-xs mt-3">Fetching the latest…</p>
          </div>
        )}

        {showEmpty && (
          <div className="text-center py-16" data-testid="lab-feed-empty">
            <p className="text-slate-400 text-sm mb-4">
              {loadFailed ? 'Couldn\u2019t reach the feed right now.' : 'No Dogecoin updates available right now.'}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-sm font-bold hover:bg-cyan-500/25 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => (
              <FeedCard key={post.id} post={post} onInteract={handleInteract} interacted={interacted} />
            ))}
            <div ref={sentinelRef} className="h-10 flex items-center justify-center">
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-slate-600" />}
              {!hasMore && !loadingMore && (
                <span className="text-[11px] text-slate-700">You're all caught up</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabFeed;
