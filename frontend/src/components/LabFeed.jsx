import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import {
  ChevronLeft, ChevronRight, Heart, MessageCircle, Repeat2, X, Send,
  FlaskConical, Plus, Loader2, Coins, Users, TrendingUp, Clock,
  Bell, Trophy, UserPlus, UserCheck, UserCircle, Image as ImageIcon,
} from 'lucide-react';
import { dogeOSDevnet } from '../config/wagmi';
import { useLabFeedSocial, onChainErrorMessage } from '../hooks/useLabFeedSocial';

/* ============================================================
   DogeFood Lab — LAB FEED (Lab Notes)
   On-chain SocialFi layer. Real, user-authored posts — likes,
   comments, and shares are instant (covered by a one-time signed
   approval); tipping is a real wallet-signed on-chain transfer.
   See server.py's "LAB NOTES" section for the full backend.

   Layout note: restructured as a proper social-feed shell (sticky
   nav + underline tabs, composer teaser, card-based timeline,
   right-rail leaderboard on wide screens) that scales from phone
   widths up through desktop, with all overlays adapting from
   mobile bottom-sheets to centered dialogs. No API contract or
   interaction logic changed — presentation only.
   ============================================================ */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const MAX_LENGTH = 280;
const LIKE_COST = 0.1;
const COMMENT_COST = 0.5;

const GREEN = '#58FF7A';
const PURPLE = '#A855F7';

// Shared max-width so the sticky nav, tabs, and feed column always
// line up edge-to-edge, from phone widths up to the two-column
// desktop layout.
const SHELL_WIDTH = 'mx-auto w-full max-w-[640px] lg:max-w-[960px]';

const TABS = [
  { id: 'for_you', label: 'For You', Icon: FlaskConical },
  { id: 'following', label: 'Following', Icon: Users },
  { id: 'trending', label: 'Trending', Icon: TrendingUp },
  { id: 'new', label: 'New', Icon: Clock },
  { id: 'top_earners', label: 'Top Earners', Icon: Coins },
];

// Mirrors LAB_BADGES in server.py — badge_id -> display info for the toast
// (the like/comment/follow/tip endpoints only return the ids that were
// newly earned, not full metadata).
const LAB_BADGE_META = {
  mad_scientist: { name: 'Mad Scientist', emoji: '🧪' },
  viral_experiment: { name: 'Viral Experiment', emoji: '🔥' },
  dogecoin_millionaire: { name: 'Dogecoin Millionaire', emoji: '💰' },
  community_favorite: { name: 'Community Favorite', emoji: '🚀' },
  lab_legend: { name: 'Lab Legend', emoji: '🥼' },
};

const NOTIFICATION_META = {
  like: { Icon: Heart, color: '#f472b6' },
  comment: { Icon: MessageCircle, color: '#60a5fa' },
  follow: { Icon: UserPlus, color: GREEN },
  tip: { Icon: Coins, color: PURPLE },
};

function timeAgo(isoString) {
  if (!isoString) return '';
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

// Renders a wallet/Telegram address as a compact @handle, the way a
// social app would — without needing a separate username field.
function shortAddress(addr) {
  if (!addr) return '';
  if (addr.startsWith('0x') && addr.length > 12) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return `@${addr.replace(/^TG_/, 'tg')}`;
}

// Styles injected once at module load — same pattern used throughout this app.
let stylesInjected = false;
const LabNotesStyles = () => {
  useEffect(() => {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes lnGlow {
        0%, 100% { box-shadow: 0 0 16px rgba(88,255,122,0.35); }
        50%      { box-shadow: 0 0 28px rgba(88,255,122,0.6); }
      }
      .ln-glow { -webkit-animation: lnGlow 2.2s ease-in-out infinite; animation: lnGlow 2.2s ease-in-out infinite; }
      @keyframes lnCoinFly {
        0%   { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-22px) scale(0.4); opacity: 0; }
      }
      .ln-coin-fly { -webkit-animation: lnCoinFly 0.6s ease-out forwards; animation: lnCoinFly 0.6s ease-out forwards; }
      @keyframes lnSmoke {
        0%   { transform: translateY(0) scale(0.6); opacity: 0.8; }
        100% { transform: translateY(-40px) scale(1.8); opacity: 0; }
      }
      .ln-smoke { -webkit-animation: lnSmoke 1.1s ease-out forwards; animation: lnSmoke 1.1s ease-out forwards; }
      @keyframes labFeedBreathe {
        0%, 100% { transform: scale(1); opacity: 0.75; }
        50%      { transform: scale(1.08); opacity: 1; }
      }
      .lab-feed-breathe { -webkit-animation: labFeedBreathe 1.8s ease-in-out infinite; animation: labFeedBreathe 1.8s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .ln-glow, .ln-coin-fly, .ln-smoke, .lab-feed-breathe { animation: none !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
};

// ─── Responsive overlay shell ────────────────────────────────────────────────
// 'dialog' — always a centered card (approval gate, tips)
// 'sheet'  — bottom sheet on phones, centered card from sm: up (composer, comments)
// 'panel'  — full-screen on phones, large centered card from sm: up (notifications,
//            leaderboard, profile — content-heavy views)
const OVERLAY_ALIGN = {
  dialog: 'items-center justify-center p-4',
  sheet: 'items-end sm:items-center justify-center sm:p-4',
  panel: 'items-stretch sm:items-center justify-center sm:p-4',
};
const OVERLAY_SHAPE = {
  dialog: 'rounded-3xl',
  sheet: 'rounded-t-3xl sm:rounded-3xl',
  panel: 'rounded-none sm:rounded-3xl',
};
const OVERLAY_HEIGHT = {
  dialog: 'max-h-[85vh]',
  sheet: 'max-h-[85vh] sm:max-h-[80vh]',
  panel: 'h-full sm:h-auto sm:max-h-[85vh]',
};

const Overlay = ({ onClose, children, variant = 'dialog', maxWidth = 'sm:max-w-sm', zIndex = 9990 }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needsSafeTop = variant === 'panel';
  const needsSafeBottom = variant === 'sheet' || variant === 'panel';

  return (
    <div
      className={`fixed inset-0 flex ${OVERLAY_ALIGN[variant]}`}
      style={{ zIndex, background: 'rgba(5,8,10,0.88)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} ${OVERLAY_SHAPE[variant]} ${OVERLAY_HEIGHT[variant]} flex flex-col overflow-hidden border`}
        style={{
          background: '#0b1016',
          borderColor: `${GREEN}33`,
          paddingTop: needsSafeTop ? 'env(safe-area-inset-top, 0px)' : undefined,
          paddingBottom: needsSafeBottom ? 'env(safe-area-inset-bottom, 0px)' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ─── Approval gate: one-time signed message before any interaction ─────────
const ApprovalGate = ({ address, onApproved, onCancel }) => {
  const { signMessageAsync } = useSignMessage();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  const handleApprove = async () => {
    setSigning(true);
    setError(null);
    try {
      const msgRes = await fetch(`${API_URL}/api/lab-notes/approval-message/${address}`);
      const { message } = await msgRes.json();
      const signature = await signMessageAsync({ message });
      const res = await fetch(`${API_URL}/api/lab-notes/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: address, signature }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Approval failed');
      }
      onApproved();
    } catch (e) {
      setError(e?.message?.includes('User rejected') ? 'Signature was cancelled.' : (e?.message || 'Something went wrong.'));
    } finally {
      setSigning(false);
    }
  };

  return (
    <Overlay variant="dialog" maxWidth="sm:max-w-sm" zIndex={9999} onClose={onCancel}>
      <div className="p-6 text-center">
        <div
          className="ln-glow w-16 h-16 rounded-[20px] mx-auto mb-4 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})` }}
        >
          <FlaskConical className="w-8 h-8" style={{ color: '#04140a' }} />
        </div>
        <h2 className="text-lg font-black text-white mb-2">Join LabFeed</h2>
        <p className="text-[13px] text-white/55 leading-relaxed mb-5">
          One signature approves posting and sharing — no gas, and no more wallet popups for those.
          Likes, comments, and tips are each their own on-chain transaction, so your wallet will ask you to confirm those individually.
        </p>
        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mb-3.5">
            {error}
          </div>
        )}
        <button
          onClick={handleApprove}
          disabled={signing}
          className="w-full py-3.5 rounded-2xl border-none font-black text-sm tracking-wide mb-2.5"
          style={{ cursor: signing ? 'wait' : 'pointer', background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a' }}
        >
          {signing ? 'Confirm in wallet…' : 'Sign & Join'}
        </button>
        <button onClick={onCancel} className="bg-transparent border-none text-white/40 text-xs cursor-pointer py-1">
          Not now
        </button>
      </div>
    </Overlay>
  );
};

// ─── Create post modal ───────────────────────────────────────────────────────
const CreateNoteModal = ({ address, onClose, onPublished }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle -> publishing -> done
  const fileInputRef = useRef(null);
  const remaining = MAX_LENGTH - content.length;

  const handlePickImage = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImageError('Please choose an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setImageError('Image must be less than 2MB.'); return; }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.onerror = () => setImageError('Could not read that image — try another.');
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!content.trim() || remaining < 0) return;
    setPublishing(true);
    try {
      const res = await fetch(`${API_URL}/api/lab-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: address, content: content.trim(), image_url: image || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to publish');
      setPhase('done');
      setTimeout(() => { onPublished(data.note); }, 900);
    } catch (e) {
      setPublishing(false);
      alert(e?.message || 'Failed to publish — try again.');
    }
  };

  return (
    <Overlay variant="sheet" maxWidth="sm:max-w-lg" zIndex={9998} onClose={onClose}>
      {phase === 'done' ? (
        <div className="py-10 text-center relative">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ln-smoke absolute bottom-10 text-xl"
              style={{ left: `${40 + i * 10}%`, animationDelay: `${i * 0.15}s` }}
            >💨</span>
          ))}
          <div className="text-3xl mb-2">🧪</div>
          <div className="font-black text-[15px]" style={{ color: GREEN }}>Experiment Published!</div>
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold text-white">New Lab Note</span>
            <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer">
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your latest experiment…"
            rows={4}
            className="w-full resize-none rounded-2xl p-3 text-sm outline-none border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/30"
          />

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />

          {image && (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={image} alt="" className="w-full max-h-[220px] sm:max-h-[280px] object-cover block" />
              <button
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute top-2 right-2 w-[26px] h-[26px] rounded-full bg-black/60 border-none cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
          {imageError && <div className="text-[11px] text-red-300">{imageError}</div>}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add image"
                className="w-8 h-8 rounded-[10px] flex items-center justify-center cursor-pointer border shrink-0"
                style={{ borderColor: `${GREEN}44`, background: `${GREEN}0f` }}
              >
                <ImageIcon className="w-4 h-4" style={{ color: GREEN }} />
              </button>
              <span className={`text-[11px] truncate ${remaining < 0 ? 'text-red-400' : 'text-white/40'}`}>{remaining} characters left</span>
            </div>
            <button
              onClick={handlePublish}
              disabled={publishing || !content.trim() || remaining < 0}
              className="px-5 py-2.5 rounded-full border-none font-black text-[13px] shrink-0"
              style={{
                cursor: publishing ? 'wait' : 'pointer',
                background: (!content.trim() || remaining < 0) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${GREEN}, ${PURPLE})`,
                color: (!content.trim() || remaining < 0) ? 'rgba(255,255,255,0.3)' : '#04140a',
              }}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
};

// ─── Tip modal — real wallet-signed on-chain transfer ───────────────────────
const TipModal = ({ note, onClose, onTipped }) => {
  const { sendTransactionAsync } = useSendTransaction();
  const [amount, setAmount] = useState('5');
  const [phase, setPhase] = useState('idle'); // idle -> sending -> confirming -> done -> error
  const [error, setError] = useState(null);

  const handleTip = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (!note.author_address?.startsWith('0x')) {
      setError("This creator hasn't connected a wallet yet, so they can't receive on-chain tips.");
      return;
    }
    setPhase('sending');
    setError(null);
    try {
      const hash = await sendTransactionAsync({
        to: note.author_address,
        value: parseEther(String(amt)),
        chainId: dogeOSDevnet.id,
      });
      setPhase('confirming');
      const res = await fetch(`${API_URL}/api/lab-notes/${note.id}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: note._viewerAddress, amount_doge: amt, tx_hash: hash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to record tip');
      setPhase('done');
      setTimeout(() => onTipped(data), 900);
    } catch (e) {
      setPhase('error');
      setError(e?.message?.includes('User rejected') ? 'Transaction was cancelled.' : (e?.message || 'Tip failed.'));
    }
  };

  return (
    <Overlay variant="dialog" maxWidth="sm:max-w-sm" zIndex={9998} onClose={onClose}>
      <div className="p-5 sm:p-6">
        {phase === 'done' ? (
          <div className="text-center py-5">
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <img src="/dogecoin-logo.png" alt="DOGE" className="w-7 h-7" />
              <span className="text-2xl">💸</span>
            </div>
            <div className="font-black" style={{ color: GREEN }}>Tip sent on-chain!</div>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4">
              <span className="text-sm font-black text-white truncate">Tip @{note.author_nickname}</span>
              <button onClick={onClose} className="bg-transparent border-none cursor-pointer shrink-0 ml-2">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
            <div className="flex gap-2 mb-3.5">
              {[1, 5, 20].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-extrabold cursor-pointer border"
                  style={{
                    borderColor: amount === String(v) ? GREEN : 'rgba(255,255,255,0.1)',
                    background: amount === String(v) ? `${GREEN}22` : 'rgba(255,255,255,0.03)',
                    color: amount === String(v) ? GREEN : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {v} DOGE
                </button>
              ))}
            </div>
            <input
              type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] font-bold mb-3.5 outline-none"
            />
            {error && <div className="text-xs text-red-300 mb-3">{error}</div>}
            <button
              onClick={handleTip}
              disabled={phase === 'sending' || phase === 'confirming'}
              className="w-full py-3.5 rounded-2xl border-none cursor-pointer font-black text-sm"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a' }}
            >
              {phase === 'sending' ? 'Confirm in wallet…' : phase === 'confirming' ? 'Recording tip…' : `Sign & Send ${amount || 0} DOGE`}
            </button>
          </>
        )}
      </div>
    </Overlay>
  );
};

// ─── Shared post content: avatar/name row, text, image, action bar ─────────
// Used by both the feed card (cropped image, tap-to-open-post) and the full
// post-detail view below (uncropped image, no re-trigger on further tap).
const PostBody = ({ note, address, canInteract, onLike, onLikeOnChain, onOpenComments, onOpenTip, onOpenProfile, onRequireApproval, imageMode = 'crop' }) => {
  const [burst, setBurst] = useState(false);
  const [likePending, setLikePending] = useState(false);

  const guarded = (fn) => () => {
    if (!address) { alert('Connect a wallet to interact.'); return; }
    if (!canInteract) { onRequireApproval(); return; }
    fn();
  };

  // Likes are now a real on-chain transaction (see useLabFeedSocial), so
  // this no longer goes through the old one-time-approval gate — every
  // like is its own signed transaction, approval or not. onLikeOnChain
  // owns the optimistic update and reverts it on failure; this just tracks
  // the in-flight spinner and the coin-fly flourish.
  const handleLikeClick = async () => {
    if (!address) { alert('Connect a wallet to like.'); return; }
    if (note.liked_by_me || likePending) return;
    setBurst(true);
    setLikePending(true);
    try {
      await onLikeOnChain(note);
    } catch {
      // onLikeOnChain already reverted the optimistic state and alerted
      // on any real (non-cancellation) failure.
    } finally {
      setLikePending(false);
      setTimeout(() => setBurst(false), 650);
    }
  };

  const openProfile = (e) => { e.stopPropagation(); onOpenProfile(note.author_address); };

  return (
    <>
      <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5">
        <button onClick={openProfile} className="bg-transparent border-none p-0 cursor-pointer shrink-0">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a' }}
          >
            {note.author_avatar
              ? <img src={note.author_avatar} alt="" className="w-full h-full object-cover" />
              : (note.author_nickname || '?')[0].toUpperCase()}
          </div>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={openProfile} className="bg-transparent border-none p-0 cursor-pointer text-[13px] sm:text-sm font-black text-white truncate max-w-full hover:underline">
              {note.author_nickname}
            </button>
            <span className="text-xs text-white/35 truncate">{shortAddress(note.author_address)}</span>
          </div>
          <div className="text-[11px] text-white/40">{timeAgo(note.created_at)}</div>
        </div>
      </div>

      <p className="text-[14px] text-white/[0.92] leading-relaxed mb-3 whitespace-pre-wrap break-words">{note.content}</p>

      {note.image_url && (
        imageMode === 'full' ? (
          <div className="rounded-2xl overflow-hidden mb-3">
            <img src={note.image_url} alt="" className="w-full max-h-[70vh] object-contain block" />
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-white/[0.06] mb-3">
            <img src={note.image_url} alt="" loading="lazy" className="w-full max-h-[280px] sm:max-h-[420px] object-cover block" />
          </div>
        )
      )}

      <div className="flex items-center gap-3 sm:gap-5" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleLikeClick} disabled={likePending} className="group flex items-center gap-1.5 bg-transparent border-none cursor-pointer relative shrink-0">
          {likePending ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-white/40" />
          ) : (
            <Heart
              className="w-4 h-4 shrink-0 transition-colors group-hover:text-pink-300"
              fill={note.liked_by_me ? '#f472b6' : 'none'}
              style={{ color: note.liked_by_me ? '#f472b6' : 'rgba(255,255,255,0.5)' }}
            />
          )}
          <span className="text-[11px] text-white/45 whitespace-nowrap">{note.likes_count || 0} · {LIKE_COST}◈</span>
          {burst && <img src="/dogecoin-logo.png" alt="" className="ln-coin-fly absolute -top-2.5 left-2.5 w-3.5 h-3.5" />}
        </button>
        {onOpenComments ? (
          <button onClick={() => onOpenComments(note)} className="group flex items-center gap-1.5 bg-transparent border-none cursor-pointer shrink-0">
            <MessageCircle className="w-4 h-4 shrink-0 text-white/50 transition-colors group-hover:text-sky-300" />
            <span className="text-[11px] text-white/45 whitespace-nowrap">{note.comments_count || 0} · {COMMENT_COST}◈</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <MessageCircle className="w-4 h-4 shrink-0 text-white/50" />
            <span className="text-[11px] text-white/45 whitespace-nowrap">{note.comments_count || 0} · {COMMENT_COST}◈</span>
          </div>
        )}
        <button onClick={guarded(() => onLike(note.id))} className="group flex items-center gap-1.5 bg-transparent border-none cursor-pointer shrink-0">
          <Repeat2 className="w-4 h-4 shrink-0 text-white/50 transition-colors group-hover:text-emerald-300" />
          <span className="text-[11px] text-white/45 whitespace-nowrap">{note.shares_count || 0}</span>
        </button>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 shrink-0">
            <img src="/dogecoin-logo.png" alt="" className="w-3 h-3 shrink-0" />
            <span className="text-[11px] font-black whitespace-nowrap" style={{ color: GREEN }}>{(note.earnings_doge || 0).toFixed(2)}</span>
          </span>
          <button
            onClick={() => onOpenTip(note)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full cursor-pointer border shrink-0"
            style={{ borderColor: `${PURPLE}55`, background: `${PURPLE}18` }}
          >
            <Coins className="w-3.5 h-3.5 shrink-0" style={{ color: PURPLE }} />
            <span className="text-[11px] font-black whitespace-nowrap" style={{ color: PURPLE }}>Tip</span>
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Feed card ────────────────────────────────────────────────────────────────
const NoteCard = ({ note, address, canInteract, onLike, onLikeOnChain, onOpenComments, onOpenTip, onOpenProfile, onRequireApproval }) => (
  <article
    onClick={() => onOpenComments(note)}
    className="rounded-[20px] p-3.5 sm:p-4 relative overflow-hidden border border-white/[0.07] hover:border-white/[0.12] transition-colors cursor-pointer"
    style={{ background: 'linear-gradient(160deg, rgba(88,255,122,0.05), rgba(168,85,247,0.05)), rgba(255,255,255,0.025)' }}
  >
    <PostBody
      note={note}
      address={address}
      canInteract={canInteract}
      onLike={onLike}
      onLikeOnChain={onLikeOnChain}
      onOpenComments={onOpenComments}
      onOpenTip={onOpenTip}
      onOpenProfile={onOpenProfile}
      onRequireApproval={onRequireApproval}
      imageMode="crop"
    />
  </article>
);

// ─── Post detail: full post, uncropped image, comments underneath ──────────
const PostDetailModal = ({ note, address, canInteract, onLike, onLikeOnChain, onCommentOnChain, onOpenTip, onOpenProfile, onRequireApproval, onClose }) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/lab-notes/${note.id}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [note.id]);

  // Comments are now a real on-chain transaction too. The comment shows up
  // immediately (optimistic, dimmed with a spinner) while the wallet
  // signs and the chain confirms; onCommentOnChain owns telling the
  // backend about it and bumping the feed's count. If it fails, the
  // optimistic comment is removed and the draft text is restored.
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    if (!address) { alert('Connect a wallet to comment.'); return; }

    setSending(true);
    const optimisticId = `pending-${Date.now()}`;
    setComments((prev) => [...prev, { id: optimisticId, author_nickname: 'You', content, created_at: new Date().toISOString(), pending: true }]);
    setText('');

    try {
      await onCommentOnChain(note, content);
      setComments((prev) => prev.map((c) => (c.id === optimisticId ? { ...c, pending: false } : c)));
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <Overlay variant="panel" maxWidth="sm:max-w-xl" zIndex={9996} onClose={onClose}>
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <span className="font-black text-[15px] text-white">Post</span>
        <button onClick={onClose} className="bg-transparent border-none cursor-pointer" aria-label="Close">
          <X className="w-5 h-5 text-white/50" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-5 border-b border-white/[0.06]">
          <PostBody
            note={note}
            address={address}
            canInteract={canInteract}
            onLike={onLike}
            onLikeOnChain={onLikeOnChain}
            onOpenTip={onOpenTip}
            onOpenProfile={onOpenProfile}
            onRequireApproval={onRequireApproval}
            imageMode="full"
          />
        </div>

        <div className="p-4 flex flex-col gap-3">
          <span className="text-xs font-extrabold text-white/50">
            {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}` : 'Comments'} · {COMMENT_COST} DOGE each
          </span>
          {loadingComments && <Loader2 className="w-5 h-5 animate-spin text-white/30 mx-auto my-5" />}
          {!loadingComments && comments.length === 0 && (
            <p className="text-center text-white/35 text-[13px] py-5">Be the first to comment.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5" style={{ opacity: c.pending ? 0.55 : 1 }}>
              <div
                className="w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-[13px] font-black"
                style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a' }}
              >
                {(c.author_nickname || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  {c.author_nickname} <span className="text-white/30 font-medium">· {c.pending ? 'securing on-chain…' : timeAgo(c.created_at)}</span>
                  {c.pending && <Loader2 className="w-3 h-3 animate-spin text-white/40" />}
                </div>
                <div className="text-[13px] text-white/80 mt-0.5 break-words">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3.5 border-t border-white/[0.06] flex gap-2 shrink-0">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder={address ? 'Add a comment…' : 'Connect a wallet to comment'}
          disabled={sending}
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-[13px] outline-none border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/30"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="w-[42px] h-[42px] rounded-xl border-none shrink-0 flex items-center justify-center cursor-pointer"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})` }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#04140a' }} /> : <Send className="w-4 h-4" style={{ color: '#04140a' }} />}
        </button>
      </div>
    </Overlay>
  );
};

// ─── Notifications panel ─────────────────────────────────────────────────────
const NotificationsPanel = ({ address, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/lab-notes/notifications/${address}`)
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch(`${API_URL}/api/lab-notes/notifications/read-all`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_address: address }),
    }).catch(() => {});
  }, [address]);

  const messageFor = (n) => {
    switch (n.type) {
      case 'like': return `${n.actor_nickname} liked your experiment`;
      case 'comment': return `${n.actor_nickname} commented on your experiment`;
      case 'follow': return `${n.actor_nickname} started following you`;
      case 'tip': return `${n.actor_nickname} tipped you ${n.message}`;
      default: return n.message || 'New activity';
    }
  };

  return (
    <Overlay variant="panel" maxWidth="sm:max-w-md" zIndex={9995} onClose={onClose}>
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <span className="font-black text-[15px] text-white">Lab Notifications</span>
        <button onClick={onClose} className="bg-transparent border-none cursor-pointer" aria-label="Close">
          <X className="w-5 h-5 text-white/50" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2">
        {loading && <Loader2 className="w-5 h-5 animate-spin text-white/30 mx-auto my-8" />}
        {!loading && notifications.length === 0 && (
          <p className="text-center text-white/35 text-[13px] py-8">Nothing yet — go make some noise in the lab.</p>
        )}
        {notifications.map((n) => {
          const meta = NOTIFICATION_META[n.type] || { Icon: Bell, color: 'rgba(255,255,255,0.5)' };
          const NIcon = meta.Icon;
          return (
            <div
              key={n.id}
              className="flex items-center gap-2.5 p-3 rounded-2xl border"
              style={{ background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(88,255,122,0.06)', borderColor: n.read ? 'rgba(255,255,255,0.05)' : `${GREEN}22` }}
            >
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: `${meta.color}22` }}>
                <NIcon className="w-4 h-4" style={{ color: meta.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-white/85 break-words">{messageFor(n)}</div>
                <div className="text-[10px] text-white/35 mt-0.5">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Overlay>
  );
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const LEADERBOARD_TABS = [
  { id: 'earners', label: 'Top Earners', unit: 'DOGE' },
  { id: 'liked', label: 'Most Liked', unit: 'likes' },
  { id: 'followers', label: 'Most Followers', unit: 'followers' },
];

const LeaderboardView = ({ onClose, onViewProfile }) => {
  const [type, setType] = useState('earners');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/lab-notes/leaderboard?type=${type}&limit=20`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const activeTab = LEADERBOARD_TABS.find((t) => t.id === type);
  const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);

  return (
    <Overlay variant="panel" maxWidth="sm:max-w-md" zIndex={9995} onClose={onClose}>
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <span className="font-black text-[15px] text-white">Leaderboard</span>
        <button onClick={onClose} className="bg-transparent border-none cursor-pointer" aria-label="Close">
          <X className="w-5 h-5 text-white/50" />
        </button>
      </div>
      <div className="flex gap-1.5 p-3 shrink-0">
        {LEADERBOARD_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className="flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer border"
            style={{
              borderColor: type === t.id ? GREEN : 'rgba(255,255,255,0.08)',
              background: type === t.id ? `${GREEN}1f` : 'rgba(255,255,255,0.03)',
              color: type === t.id ? GREEN : 'rgba(255,255,255,0.55)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3.5 pb-5 flex flex-col gap-2">
        {loading && <Loader2 className="w-5 h-5 animate-spin text-white/30 mx-auto my-8" />}
        {!loading && entries.length === 0 && (
          <p className="text-center text-white/35 text-[13px] py-8">No data yet.</p>
        )}
        {entries.map((e) => (
          <button
            key={e.address}
            onClick={() => onViewProfile(e.address)}
            className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.06] text-left cursor-pointer hover:bg-white/[0.03]"
            style={{ background: 'rgba(255,255,255,0.025)' }}
          >
            <span className="w-[26px] text-center text-sm font-black shrink-0" style={{ color: e.rank <= 3 ? GREEN : 'rgba(255,255,255,0.4)' }}>
              {medal(e.rank) || `#${e.rank}`}
            </span>
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-[13px]"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a' }}
            >
              {(e.nickname || '?')[0].toUpperCase()}
            </div>
            <span className="flex-1 min-w-0 truncate text-[13px] font-bold text-white">{e.nickname}</span>
            <span className="text-[13px] font-black shrink-0" style={{ color: GREEN }}>{e.value} {activeTab?.unit}</span>
          </button>
        ))}
      </div>
    </Overlay>
  );
};

// ─── Top Earners rail (desktop only) ────────────────────────────────────────
// Reuses the same leaderboard endpoint as LeaderboardView, just trimmed to a
// 5-row preview that lives beside the feed on wide screens.
const TopEarnersRail = ({ onOpenLeaderboard, onViewProfile }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/lab-notes/leaderboard?type=earners&limit=5`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded-2xl border border-white/[0.07] p-4"
      style={{ background: 'linear-gradient(160deg, rgba(88,255,122,0.05), rgba(168,85,247,0.05)), rgba(255,255,255,0.025)' }}
    >
      <div className="flex items-center gap-2 mb-3.5">
        <Trophy className="w-4 h-4" style={{ color: GREEN }} />
        <span className="text-[13px] font-black text-white">Top Earners</span>
      </div>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-white/30 mx-auto my-4" />}
      {!loading && entries.length === 0 && <p className="text-xs text-white/35 py-2">No data yet.</p>}
      <div className="flex flex-col gap-1">
        {entries.map((e) => (
          <button
            key={e.address}
            onClick={() => onViewProfile(e.address)}
            className="flex items-center gap-2.5 py-1.5 px-1.5 -mx-1.5 rounded-xl text-left bg-transparent border-none cursor-pointer hover:bg-white/[0.04]"
          >
            <span className="w-5 text-center text-xs font-black shrink-0" style={{ color: e.rank <= 3 ? GREEN : 'rgba(255,255,255,0.35)' }}>
              {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
            </span>
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a' }}
            >
              {(e.nickname || '?')[0].toUpperCase()}
            </div>
            <span className="flex-1 min-w-0 truncate text-xs font-bold text-white">{e.nickname}</span>
            <span className="text-[11px] font-black shrink-0" style={{ color: GREEN }}>{e.value}</span>
          </button>
        ))}
      </div>
      {entries.length > 0 && (
        <button
          onClick={onOpenLeaderboard}
          className="w-full flex items-center justify-center gap-1 mt-3 pt-3 border-t border-white/[0.06] text-[11px] font-bold text-white/45 hover:text-white/70 bg-transparent border-x-0 border-b-0 cursor-pointer"
        >
          See full leaderboard <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// ─── Profile ──────────────────────────────────────────────────────────────────
const ProfileView = ({ address, viewerAddress, onClose, onOpenPost }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (viewerAddress) params.set('viewer_address', viewerAddress);
    fetch(`${API_URL}/api/lab-notes/profile-full/${address}?${params}`)
      .then((r) => r.json())
      .then((d) => { setProfile(d); setFollowing(!!d.is_followed_by_viewer); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, viewerAddress]);

  const toggleFollow = async () => {
    if (!viewerAddress || followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await fetch(`${API_URL}/api/lab-follows/${address}?player_address=${encodeURIComponent(viewerAddress)}`, { method: 'DELETE' });
        setFollowing(false);
      } else {
        await fetch(`${API_URL}/api/lab-follows/${address}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_address: viewerAddress }),
        });
        setFollowing(true);
      }
    } catch (e) { console.warn('[LabFeed] follow toggle failed:', e); }
    setFollowBusy(false);
  };

  if (loading || !profile) {
    return (
      <Overlay variant="panel" maxWidth="sm:max-w-xl" zIndex={9997} onClose={onClose}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      </Overlay>
    );
  }

  const isOwnProfile = viewerAddress && viewerAddress.toLowerCase() === address.toLowerCase();
  const stats = [
    ['Posts', profile.posts_count], ['Followers', profile.followers_count], ['Following', profile.following_count],
    ['Likes', profile.total_likes_received], ['Comments', profile.total_comments_received], ['DOGE Earned', profile.total_doge_earned],
  ];

  return (
    <Overlay variant="panel" maxWidth="sm:max-w-xl" zIndex={9997} onClose={onClose}>
      <div className="flex-1 overflow-y-auto">
        <div className="h-[90px] relative" style={{ background: `linear-gradient(135deg, ${GREEN}33, ${PURPLE}33)` }}>
          <button
            onClick={onClose}
            className="absolute top-3.5 left-3.5 bg-black/35 border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="px-4 sm:px-5 pb-7 -mt-9">
          <div
            className="w-[72px] h-[72px] rounded-[22px] border-[3px] flex items-center justify-center font-black text-2xl mb-2.5 overflow-hidden"
            style={{ borderColor: '#0b1016', background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a' }}
          >
            {profile.profile_image
              ? <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
              : (profile.nickname || '?')[0].toUpperCase()}
          </div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-lg font-black text-white truncate">{profile.nickname}</span>
            {!isOwnProfile && viewerAddress && (
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full cursor-pointer font-extrabold text-xs shrink-0 border"
                style={{
                  borderColor: following ? 'rgba(255,255,255,0.15)' : 'transparent',
                  background: following ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${GREEN}, ${PURPLE})`,
                  color: following ? 'rgba(255,255,255,0.7)' : '#04140a',
                }}
              >
                {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div className="text-xs text-white/40 mb-3.5">
            Lab Level {profile.level}
            {profile.favorite_ingredient ? ` · Favorite ingredient: ${profile.favorite_ingredient}` : ''}
            {profile.leaderboard_rank ? ` · Rank #${profile.leaderboard_rank} earner` : ''}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {stats.map(([label, value]) => (
              <div key={label} className="text-center py-2.5 px-1 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.025)' }}>
                <div className="text-[15px] font-black" style={{ color: GREEN }}>{value}</div>
                <div className="text-[9px] text-white/40 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="text-xs font-extrabold text-white/50 mb-2">BADGES</div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
            {profile.badges.length === 0 && <span className="text-xs text-white/30">None yet</span>}
            {profile.badges.map((b) => (
              <div
                key={b.badge_id}
                title={b.description}
                className="shrink-0 w-16 text-center py-2.5 px-1 rounded-2xl border"
                style={{ background: `${GREEN}0f`, borderColor: `${GREEN}33` }}
              >
                <div className="text-[22px]">{b.emoji}</div>
                <div className="text-[8px] font-extrabold mt-1" style={{ color: GREEN }}>{b.name}</div>
              </div>
            ))}
          </div>

          <div className="text-xs font-extrabold text-white/50 mb-2">LAB NOTES</div>
          <div className="flex flex-col gap-2.5">
            {profile.posts.length === 0 && <span className="text-xs text-white/30">No Lab Notes yet.</span>}
            {profile.posts.map((note) => (
              <div
                key={note.id}
                onClick={() => onOpenPost(note)}
                className="p-3 rounded-2xl border border-white/[0.06] cursor-pointer hover:bg-white/[0.03]"
                style={{ background: 'rgba(255,255,255,0.025)' }}
              >
                <p className="text-[13px] text-white/85 mb-1.5 break-words">{note.content}</p>
                <div className="text-[10px] text-white/35">{note.likes_count || 0} likes · {note.comments_count || 0} comments · {timeAgo(note.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
};

// ─── Badge unlocked toast ──────────────────────────────────────────────────────
const BadgeToast = ({ badgeId, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const info = LAB_BADGE_META[badgeId] || { name: badgeId, emoji: '🏅' };
  return (
    <div
      className="fixed top-[70px] left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2.5 px-[18px] py-3 rounded-2xl"
      style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, boxShadow: `0 8px 30px ${GREEN}55` }}
    >
      <span className="text-[22px]">{info.emoji}</span>
      <div>
        <div className="text-[10px] font-extrabold opacity-70" style={{ color: '#04140a' }}>BADGE UNLOCKED</div>
        <div className="text-[13px] font-black" style={{ color: '#04140a' }}>{info.name}</div>
      </div>
    </div>
  );
};

// ─── Main LabFeed ─────────────────────────────────────────────────────────────
const LabFeed = ({ playerAddress }) => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const effectiveAddress = address || playerAddress;

  const [tab, setTab] = useState('for_you');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [activeTip, setActiveTip] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeQueue, setBadgeQueue] = useState([]);
  const pendingActionRef = useRef(null);

  const canInteract = isConnected && approved;
  const { likeOnChain, commentOnChain } = useLabFeedSocial(effectiveAddress);

  const queueBadges = (ids) => {
    if (ids && ids.length) setBadgeQueue((prev) => [...prev, ...ids]);
  };

  useEffect(() => {
    if (!effectiveAddress) return;
    const poll = () => {
      fetch(`${API_URL}/api/lab-notes/notifications/unread-count/${effectiveAddress}`)
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.unread_count || 0))
        .catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 30000);
    return () => clearInterval(iv);
  }, [effectiveAddress]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab, limit: '20' });
      if (effectiveAddress) params.set('player_address', effectiveAddress);
      const res = await fetch(`${API_URL}/api/lab-notes?${params}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (e) {
      console.warn('[LabFeed] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [tab, effectiveAddress]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    if (!address) { setApproved(false); return; }
    fetch(`${API_URL}/api/lab-notes/approval-status/${address}`)
      .then((r) => r.json())
      .then((d) => setApproved(!!d.approved))
      .catch(() => {});
  }, [address]);

  const requireApproval = (after) => {
    pendingActionRef.current = after || null;
    setShowApproval(true);
  };

  const handleApproved = () => {
    setApproved(true);
    setShowApproval(false);
    if (pendingActionRef.current) { pendingActionRef.current(); pendingActionRef.current = null; }
  };

  // Shares stay exactly as they were - free, instant, covered by the
  // one-time approval signature. Only likes and comments moved on-chain
  // (see handleLikeOnChain / handleCommentOnChain below).
  const handleShare = async (noteId) => {
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, shares_count: (n.shares_count || 0) + 1 } : n));
    try {
      const res = await fetch(`${API_URL}/api/lab-notes/${noteId}/share`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: effectiveAddress }),
      });
      const data = await res.json();
      queueBadges(data.new_badges);
    } catch (e) { console.warn('[LabFeed] share failed:', e); }
  };

  // Likes are a real on-chain transaction now (see useLabFeedSocial). The
  // UI updates the moment the wallet accepts the signature, before the
  // transaction is even mined - if it fails or is cancelled, this is what
  // puts the count back.
  const handleLikeOnChain = async (note) => {
    const bump = (n) => ({ ...n, liked_by_me: true, likes_count: (n.likes_count || 0) + 1 });
    const revert = (n) => ({ ...n, liked_by_me: false, likes_count: Math.max(0, (n.likes_count || 0) - 1) });
    setNotes((prev) => prev.map((n) => (n.id === note.id ? bump(n) : n)));
    setActivePost((prev) => (prev && prev.id === note.id ? bump(prev) : prev));
    try {
      await likeOnChain(note);
    } catch (e) {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? revert(n) : n)));
      setActivePost((prev) => (prev && prev.id === note.id ? revert(prev) : prev));
      const msg = onChainErrorMessage(e);
      if (msg) alert(msg);
      throw e;
    }
  };

  // Comments are also on-chain now. PostDetailModal shows the comment
  // optimistically the moment it's submitted; this just handles the
  // transaction itself and bumps the feed's count once it's sent.
  const handleCommentOnChain = async (note, content) => {
    try {
      const result = await commentOnChain(note, content);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, comments_count: (n.comments_count || 0) + 1 } : n)));
      setActivePost((prev) => (prev && prev.id === note.id ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev));
      return result;
    } catch (e) {
      const msg = onChainErrorMessage(e);
      if (msg) alert(msg);
      throw e;
    }
  };

  const handlePublished = (note) => {
    setShowCreate(false);
    setNotes((prev) => [note, ...prev]);
  };

  // Shared by both the composer teaser bar and the floating action button.
  const openComposer = () => {
    if (!effectiveAddress) { alert('Connect a wallet or sign in to post.'); return; }
    if (!canInteract) { requireApproval(() => setShowCreate(true)); return; }
    setShowCreate(true);
  };

  return (
    <div className="min-h-screen text-white pb-28" style={{ background: 'radial-gradient(ellipse at top, #0f1a13 0%, #05080a 60%)' }}>
      <LabNotesStyles />

      {/* Sticky nav + tabs */}
      <div className="sticky top-0 z-20 border-b border-white/[0.06]" style={{ background: 'rgba(5,8,10,0.92)', backdropFilter: 'blur(8px)' }}>
        <div className={`${SHELL_WIDTH} flex items-center gap-2.5 px-4 py-3`}>
          <button onClick={() => navigate('/')} className="bg-transparent border-none cursor-pointer p-1 -ml-1" aria-label="Back">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})` }}>
            <FlaskConical className="w-4 h-4" style={{ color: '#04140a' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black leading-none">LabFeed</div>
            <div className="text-[9px] text-white/40 mt-0.5">Powered by DogeOS</div>
          </div>
          <button onClick={() => setShowLeaderboard(true)} className="bg-transparent border-none cursor-pointer p-1" aria-label="Leaderboard">
            <Trophy className="w-5 h-5 text-white/60" />
          </button>
          <button
            onClick={() => { if (effectiveAddress) { setShowNotifications(true); setUnreadCount(0); } }}
            className="bg-transparent border-none cursor-pointer relative p-1"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-white/60" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full bg-pink-400 text-white text-[9px] font-black flex items-center justify-center px-[3px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => effectiveAddress && setViewingProfile(effectiveAddress)}
            className="bg-transparent border-none cursor-pointer p-0.5 -mr-1"
            aria-label="Your profile"
          >
            <UserCircle className="w-6 h-6 text-white/60" />
          </button>
        </div>

        <div className={`${SHELL_WIDTH} flex gap-5 overflow-x-auto scrollbar-hide px-4`}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap py-3 text-[12.5px] font-extrabold shrink-0 bg-transparent border-none cursor-pointer transition-colors ${tab === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              <t.Icon className="w-3.5 h-3.5" />
              {t.label}
              {tab === t.id && (
                <span className="absolute left-0 right-0 -bottom-px h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${GREEN}, ${PURPLE})` }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed + desktop rail */}
      <div className={`${SHELL_WIDTH} px-3 sm:px-4 lg:px-6 py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6 lg:items-start`}>
        <div className="flex flex-col gap-3 min-w-0">
          <button
            onClick={openComposer}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.07] px-4 py-3.5 text-left cursor-pointer"
            style={{ background: 'linear-gradient(160deg, rgba(88,255,122,0.05), rgba(168,85,247,0.05)), rgba(255,255,255,0.025)' }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})` }}>
              <FlaskConical className="w-4 h-4" style={{ color: '#04140a' }} />
            </div>
            <span className="text-[13px] text-white/40">Share your latest experiment…</span>
          </button>

          {loading && (
            <div className="flex flex-col items-center py-16 gap-2.5">
              <img src="/dogefood-logo.png" alt="" className="lab-feed-breathe w-12 h-12" />
              <span className="text-xs text-white/40">Loading experiments…</span>
            </div>
          )}

          {!loading && notes.length === 0 && (
            <div className="text-center py-16 px-5">
              <FlaskConical className="w-8 h-8 text-white/20 mx-auto mb-2.5" />
              <p className="text-[13px] text-white/40">
                {tab === 'following' ? "You're not following any scientists yet." : 'No experiments published yet — be the first!'}
              </p>
            </div>
          )}

          {!loading && notes.map((note) => (
            <NoteCard
              key={note.id}
              note={{ ...note, _viewerAddress: effectiveAddress }}
              address={effectiveAddress}
              canInteract={canInteract}
              onLike={handleShare}
              onLikeOnChain={handleLikeOnChain}
              onOpenComments={setActivePost}
              onOpenTip={setActiveTip}
              onOpenProfile={setViewingProfile}
              onRequireApproval={() => requireApproval(null)}
            />
          ))}
        </div>

        <aside className="hidden lg:block sticky top-[108px]">
          <TopEarnersRail onOpenLeaderboard={() => setShowLeaderboard(true)} onViewProfile={setViewingProfile} />
        </aside>
      </div>

      <button
        onClick={openComposer}
        className="ln-glow fixed right-4 sm:right-6 lg:right-8 z-[900] w-14 h-14 rounded-full border-none cursor-pointer flex items-center justify-center"
        style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})` }}
        aria-label="New Lab Note"
      >
        <Plus className="w-7 h-7" style={{ color: '#04140a' }} strokeWidth={3} />
      </button>

      {showApproval && effectiveAddress && (
        <ApprovalGate address={effectiveAddress} onApproved={handleApproved} onCancel={() => setShowApproval(false)} />
      )}
      {showCreate && (
        <CreateNoteModal address={effectiveAddress} onClose={() => setShowCreate(false)} onPublished={handlePublished} />
      )}
      {activePost && (
        <PostDetailModal
          note={activePost}
          address={effectiveAddress}
          canInteract={canInteract}
          onLike={handleShare}
          onLikeOnChain={handleLikeOnChain}
          onCommentOnChain={handleCommentOnChain}
          onOpenTip={setActiveTip}
          onOpenProfile={setViewingProfile}
          onRequireApproval={() => requireApproval(null)}
          onClose={() => setActivePost(null)}
        />
      )}
      {activeTip && (
        <TipModal
          note={{ ...activeTip, _viewerAddress: effectiveAddress }}
          onClose={() => setActiveTip(null)}
          onTipped={(data) => { queueBadges(data?.new_badges); setActiveTip(null); }}
        />
      )}
      {showNotifications && effectiveAddress && (
        <NotificationsPanel address={effectiveAddress} onClose={() => setShowNotifications(false)} />
      )}
      {showLeaderboard && (
        <LeaderboardView onClose={() => setShowLeaderboard(false)} onViewProfile={(addr) => { setShowLeaderboard(false); setViewingProfile(addr); }} />
      )}
      {viewingProfile && (
        <ProfileView
          address={viewingProfile}
          viewerAddress={effectiveAddress}
          onClose={() => setViewingProfile(null)}
          onOpenPost={(note) => { setViewingProfile(null); setActivePost(note); }}
        />
      )}
      {badgeQueue.length > 0 && (
        <BadgeToast badgeId={badgeQueue[0]} onDone={() => setBadgeQueue((prev) => prev.slice(1))} />
      )}
    </div>
  );
};

export default LabFeed;
