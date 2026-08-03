import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import {
  ChevronLeft, Heart, MessageCircle, Repeat2, Bookmark, X, Send,
  FlaskConical, Plus, Loader2, Coins, Users, TrendingUp, Clock,
  Bell, Trophy, Award, UserPlus, UserCheck, Image as ImageIcon,
} from 'lucide-react';
import { dogeOSDevnet } from '../config/wagmi';

/* ============================================================
   DogeFood Lab — LAB FEED (Lab Notes)
   On-chain SocialFi layer. Real, user-authored posts — likes,
   comments, and shares are instant (covered by a one-time signed
   approval); tipping is a real wallet-signed on-chain transfer.
   See server.py's "LAB NOTES" section for the full backend.
   ============================================================ */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const MAX_LENGTH = 280;
const LIKE_COST = 0.1;
const COMMENT_COST = 0.5;

const GREEN = '#58FF7A';
const PURPLE = '#A855F7';

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

// Styles injected once at module load — same pattern used throughout this app.
let stylesInjected = false;
const LabNotesStyles = () => {
  useEffect(() => {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes lnBubbleFloat {
        0%   { transform: translateY(0) scale(1);   opacity: 0.5; }
        50%  { transform: translateY(-14px) scale(1.15); opacity: 0.9; }
        100% { transform: translateY(0) scale(1);   opacity: 0.5; }
      }
      .ln-bubble { -webkit-animation: lnBubbleFloat 3.4s ease-in-out infinite; animation: lnBubbleFloat 3.4s ease-in-out infinite; }
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
      @media (prefers-reduced-motion: reduce) {
        .ln-bubble, .ln-glow, .ln-coin-fly, .ln-smoke { animation: none !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,8,10,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{
        maxWidth: 340, width: '100%', borderRadius: 24, padding: 24,
        background: 'linear-gradient(160deg, rgba(88,255,122,0.08), rgba(168,85,247,0.08)), #0b1016',
        border: `1px solid ${GREEN}44`, textAlign: 'center',
      }}>
        <div className="ln-glow" style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`,
        }}>
          <FlaskConical className="w-8 h-8" style={{ color: '#04140a' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: 'white', marginBottom: 8 }}>Join LabFeed</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 20 }}>
          One signature approves posting, liking, and commenting — no gas, and no more wallet popups after this.
          Tipping stays its own separate confirmation, since you choose the amount each time.
        </p>
        {error && (
          <div style={{ fontSize: 12, color: '#fca5a5', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', marginBottom: 14 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleApprove}
          disabled={signing}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', cursor: signing ? 'wait' : 'pointer',
            background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a', fontWeight: 900, fontSize: 14,
            letterSpacing: '0.04em', marginBottom: 10,
          }}
        >
          {signing ? 'Confirm in wallet…' : 'Sign & Join'}
        </button>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
          Not now
        </button>
      </div>
    </div>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(5,8,10,0.85)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '80vh', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          background: '#0b1016', border: `1px solid ${GREEN}33`, borderBottom: 'none',
          padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        {phase === 'done' ? (
          <div style={{ padding: '30px 0', textAlign: 'center', position: 'relative' }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="ln-smoke" style={{
                position: 'absolute', left: `${40 + i * 10}%`, bottom: 40, fontSize: 20,
                animationDelay: `${i * 0.15}s`,
              }}>💨</span>
            ))}
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧪</div>
            <div style={{ color: GREEN, fontWeight: 900, fontSize: 15 }}>Experiment Published!</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>New Lab Note</span>
              <button onClick={onClose} aria-label="Close"><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
            </div>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your latest experiment…"
              rows={4}
              style={{
                width: '100%', resize: 'none', borderRadius: 14, padding: 12, fontSize: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', outline: 'none',
              }}
            />

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickImage} style={{ display: 'none' }} />

            {image && (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
                <img src={image} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={() => setImage(null)}
                  aria-label="Remove image"
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X className="w-4 h-4" style={{ color: 'white' }} />
                </button>
              </div>
            )}
            {imageError && <div style={{ fontSize: 11, color: '#fca5a5' }}>{imageError}</div>}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Add image"
                  style={{
                    width: 32, height: 32, borderRadius: 10, border: `1px solid ${GREEN}44`,
                    background: `${GREEN}0f`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <ImageIcon className="w-4 h-4" style={{ color: GREEN }} />
                </button>
                <span style={{ fontSize: 11, color: remaining < 0 ? '#f87171' : 'rgba(255,255,255,0.4)' }}>{remaining} characters left</span>
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing || !content.trim() || remaining < 0}
                style={{
                  padding: '10px 22px', borderRadius: 99, border: 'none',
                  background: (!content.trim() || remaining < 0) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${GREEN}, ${PURPLE})`,
                  color: (!content.trim() || remaining < 0) ? 'rgba(255,255,255,0.3)' : '#04140a',
                  fontWeight: 900, fontSize: 13, cursor: publishing ? 'wait' : 'pointer',
                }}
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(5,8,10,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, borderRadius: 22, padding: 22, background: '#0b1016', border: `1px solid ${GREEN}33` }}>
        {phase === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
              <img src="/dogecoin-logo.png" alt="DOGE" style={{ width: 28, height: 28 }} />
              <span style={{ fontSize: 26 }}>💸</span>
            </div>
            <div style={{ color: GREEN, fontWeight: 900 }}>Tip sent on-chain!</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>Tip @{note.author_nickname}</span>
              <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[1, 5, 20].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} style={{
                  flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  border: amount === String(v) ? `1px solid ${GREEN}` : '1px solid rgba(255,255,255,0.1)',
                  background: amount === String(v) ? `${GREEN}22` : 'rgba(255,255,255,0.03)',
                  color: amount === String(v) ? GREEN : 'rgba(255,255,255,0.6)',
                }}>{v} DOGE</button>
              ))}
            </div>
            <input
              type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 14, outline: 'none' }}
            />
            {error && <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>{error}</div>}
            <button
              onClick={handleTip}
              disabled={phase === 'sending' || phase === 'confirming'}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, color: '#04140a', fontWeight: 900, fontSize: 14,
              }}
            >
              {phase === 'sending' ? 'Confirm in wallet…' : phase === 'confirming' ? 'Recording tip…' : `Sign & Send ${amount || 0} DOGE`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Comments panel ──────────────────────────────────────────────────────────
const CommentsPanel = ({ note, address, canInteract, onClose, onCommented }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/lab-notes/${note.id}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [note.id]);

  const handleSend = async () => {
    if (!text.trim() || !canInteract) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/lab-notes/${note.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: address, content: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setComments((prev) => [...prev, data.comment]);
      setText('');
      onCommented(note.id, data.comments_count, data.new_badges);
    } catch (e) {
      alert(e?.message || 'Failed to comment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(5,8,10,0.85)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        borderTopLeftRadius: 24, borderTopRightRadius: 24, background: '#0b1016', border: `1px solid ${GREEN}33`, borderBottom: 'none',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: 'white' }}>Comments · {COMMENT_COST} DOGE each</span>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(255,255,255,0.3)', margin: '20px auto' }} />}
          {!loading && comments.length === 0 && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '20px 0' }}>Be the first to comment.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#04140a' }}>
                {(c.author_nickname || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{c.author_nickname} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>· {timeAgo(c.created_at)}</span></div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{c.content}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder={canInteract ? 'Add a comment…' : 'Sign the LabFeed approval to comment'}
            disabled={!canInteract}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: 13, outline: 'none' }}
          />
          <button onClick={handleSend} disabled={sending || !canInteract || !text.trim()} style={{
            width: 42, height: 42, borderRadius: 12, border: 'none', flexShrink: 0,
            background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Send className="w-4 h-4" style={{ color: '#04140a' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Feed card ────────────────────────────────────────────────────────────────
const NoteCard = ({ note, address, canInteract, onLike, onOpenComments, onOpenTip, onOpenProfile, onRequireApproval }) => {
  const [burst, setBurst] = useState(false);

  const guarded = (fn) => () => {
    if (!address) { alert('Connect a wallet to interact.'); return; }
    if (!canInteract) { onRequireApproval(); return; }
    fn();
  };

  const handleLike = guarded(() => {
    if (!note.liked_by_me) setBurst(true);
    onLike(note.id);
    setTimeout(() => setBurst(false), 650);
  });

  return (
    <div style={{
      borderRadius: 20, padding: 14, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(88,255,122,0.05), rgba(168,85,247,0.05)), rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div onClick={() => onOpenComments(note)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenProfile(note.author_address); }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#04140a' }}>
              {note.author_avatar ? <img src={note.author_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (note.author_nickname || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{note.author_nickname}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{timeAgo(note.created_at)}</div>
            </div>
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 99, height: 'fit-content',
            background: 'rgba(88,255,122,0.1)', border: `1px solid ${GREEN}33`,
          }}>
            <img src="/dogecoin-logo.png" alt="DOGE" style={{ width: 13, height: 13 }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: GREEN }}>{(note.earnings_doge || 0).toFixed(2)} DOGE</span>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{note.content}</p>
        {note.image_url && (
          <img src={note.image_url} alt="" style={{ width: '100%', borderRadius: 14, marginBottom: 12, maxHeight: 260, objectFit: 'cover' }} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
        <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
          <Heart className="w-4 h-4" fill={note.liked_by_me ? '#f472b6' : 'none'} style={{ color: note.liked_by_me ? '#f472b6' : 'rgba(255,255,255,0.5)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{note.likes_count || 0} · {LIKE_COST}◈</span>
          {burst && <img src="/dogecoin-logo.png" alt="" className="ln-coin-fly" style={{ position: 'absolute', top: -10, left: 10, width: 14, height: 14 }} />}
        </button>
        <button onClick={() => onOpenComments(note)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer' }}>
          <MessageCircle className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{note.comments_count || 0} · {COMMENT_COST}◈</span>
        </button>
        <button onClick={guarded(() => onLike(note.id, 'share'))} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer' }}>
          <Repeat2 className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{note.shares_count || 0}</span>
        </button>
        <button onClick={() => onOpenTip(note)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 99, border: `1px solid ${PURPLE}55`, background: `${PURPLE}18`, cursor: 'pointer' }}>
          <Coins className="w-3.5 h-3.5" style={{ color: PURPLE }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: PURPLE }}>Tip</span>
        </button>
      </div>
    </div>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9996, background: '#05080a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontWeight: 900, fontSize: 15, color: 'white' }}>Lab Notifications</span>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(255,255,255,0.3)', margin: '30px auto' }} />}
        {!loading && notifications.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '30px 0' }}>Nothing yet — go make some noise in the lab.</p>
        )}
        {notifications.map((n) => {
          const meta = NOTIFICATION_META[n.type] || { Icon: Bell, color: 'rgba(255,255,255,0.5)' };
          const NIcon = meta.Icon;
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14,
              background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(88,255,122,0.06)',
              border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : GREEN + '22'}`,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NIcon className="w-4 h-4" style={{ color: meta.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{messageFor(n)}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9996, background: '#05080a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontWeight: 900, fontSize: 15, color: 'white' }}>Leaderboard</span>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px' }}>
        {LEADERBOARD_TABS.map((t) => (
          <button key={t.id} onClick={() => setType(t.id)} style={{
            flex: 1, padding: '8px 0', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer',
            border: type === t.id ? `1px solid ${GREEN}` : '1px solid rgba(255,255,255,0.08)',
            background: type === t.id ? `${GREEN}1f` : 'rgba(255,255,255,0.03)',
            color: type === t.id ? GREEN : 'rgba(255,255,255,0.55)',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(255,255,255,0.3)', margin: '30px auto' }} />}
        {!loading && entries.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '30px 0' }}>No data yet.</p>
        )}
        {entries.map((e) => (
          <button key={e.address} onClick={() => onViewProfile(e.address)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'left', cursor: 'pointer',
          }}>
            <span style={{ width: 26, textAlign: 'center', fontSize: 14, fontWeight: 900, color: e.rank <= 3 ? GREEN : 'rgba(255,255,255,0.4)' }}>
              {medal(e.rank) || `#${e.rank}`}
            </span>
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#04140a', fontSize: 13 }}>
              {(e.nickname || '?')[0].toUpperCase()}
            </div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'white' }}>{e.nickname}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: GREEN }}>{e.value} {activeTab?.unit}</span>
          </button>
        ))}
      </div>
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 9996, background: '#05080a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
    );
  }

  const isOwnProfile = viewerAddress && viewerAddress.toLowerCase() === address.toLowerCase();
  const stats = [
    ['Posts', profile.posts_count], ['Followers', profile.followers_count], ['Following', profile.following_count],
    ['Likes', profile.total_likes_received], ['Comments', profile.total_comments_received], ['DOGE Earned', profile.total_doge_earned],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9996, background: '#05080a', overflowY: 'auto' }}>
      <div style={{ height: 90, background: `linear-gradient(135deg, ${GREEN}33, ${PURPLE}33)`, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft className="w-5 h-5" style={{ color: 'white' }} />
        </button>
      </div>
      <div style={{ padding: '0 18px 30px', marginTop: -36 }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, border: '3px solid #05080a', background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, color: '#04140a', marginBottom: 10 }}>
          {profile.profile_image ? <img src={profile.profile_image} alt="" style={{ width: '100%', height: '100%', borderRadius: 19, objectFit: 'cover' }} /> : (profile.nickname || '?')[0].toUpperCase()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 19, fontWeight: 900, color: 'white' }}>{profile.nickname}</span>
          {!isOwnProfile && viewerAddress && (
            <button onClick={toggleFollow} disabled={followBusy} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 99, cursor: 'pointer',
              border: following ? '1px solid rgba(255,255,255,0.15)' : 'none',
              background: following ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${GREEN}, ${PURPLE})`,
              color: following ? 'rgba(255,255,255,0.7)' : '#04140a', fontWeight: 800, fontSize: 12,
            }}>
              {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
          Lab Level {profile.level}
          {profile.favorite_ingredient ? ` · Favorite ingredient: ${profile.favorite_ingredient}` : ''}
          {profile.leaderboard_rank ? ` · Rank #${profile.leaderboard_rank} earner` : ''}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: GREEN }}>{value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>BADGES</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18, paddingBottom: 4 }}>
          {profile.badges.length === 0 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>None yet</span>}
          {profile.badges.map((b) => (
            <div key={b.badge_id} title={b.description} style={{
              flexShrink: 0, width: 64, textAlign: 'center', padding: '10px 4px', borderRadius: 14,
              background: `${GREEN}0f`, border: `1px solid ${GREEN}33`,
            }}>
              <div style={{ fontSize: 22 }}>{b.emoji}</div>
              <div style={{ fontSize: 8, color: GREEN, fontWeight: 800, marginTop: 4 }}>{b.name}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>LAB NOTES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profile.posts.length === 0 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No Lab Notes yet.</span>}
          {profile.posts.map((note) => (
            <div key={note.id} onClick={() => onOpenPost(note)} style={{
              padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
            }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>{note.content}</p>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{note.likes_count || 0} likes · {note.comments_count || 0} comments · {timeAgo(note.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <div style={{
      position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 16,
      background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, boxShadow: `0 8px 30px ${GREEN}55`,
    }}>
      <span style={{ fontSize: 22 }}>{info.emoji}</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#04140a', opacity: 0.7 }}>BADGE UNLOCKED</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#04140a' }}>{info.name}</div>
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
  const [activeComments, setActiveComments] = useState(null);
  const [activeTip, setActiveTip] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeQueue, setBadgeQueue] = useState([]);
  const pendingActionRef = useRef(null);

  const canInteract = isConnected && approved;

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

  const handleLike = async (noteId, action = 'like') => {
    setNotes((prev) => prev.map((n) => n.id === noteId
      ? { ...n, liked_by_me: action === 'like' ? true : n.liked_by_me, likes_count: action === 'like' && !n.liked_by_me ? (n.likes_count || 0) + 1 : n.likes_count, shares_count: action === 'share' ? (n.shares_count || 0) + 1 : n.shares_count }
      : n));
    try {
      const res = await fetch(`${API_URL}/api/lab-notes/${noteId}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: effectiveAddress }),
      });
      const data = await res.json();
      queueBadges(data.new_badges);
    } catch (e) { console.warn('[LabFeed] interaction failed:', e); }
  };

  const handleCommented = (noteId, count, newBadges) => {
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, comments_count: count } : n));
    queueBadges(newBadges);
  };

  const handlePublished = (note) => {
    setShowCreate(false);
    setNotes((prev) => [note, ...prev]);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0f1a13 0%, #05080a 60%)', color: 'white', paddingBottom: 100 }}>
      <LabNotesStyles />

      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,10,0.92)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.7)' }} />
          </button>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical className="w-4 h-4" style={{ color: '#04140a' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>LabFeed</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Powered by DogeOS</div>
          </div>
          <button onClick={() => setShowLeaderboard(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }} aria-label="Leaderboard">
            <Trophy className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>
          <button
            onClick={() => { if (effectiveAddress) { setShowNotifications(true); setUnreadCount(0); } }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3, minWidth: 15, height: 15, borderRadius: 99,
                background: '#f472b6', color: 'white', fontSize: 9, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 4, padding: '0 12px 10px' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flexShrink: 0, padding: '7px 13px', borderRadius: 99, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                border: tab === t.id ? `1px solid ${GREEN}` : '1px solid transparent',
                background: tab === t.id ? `${GREEN}1f` : 'rgba(255,255,255,0.04)',
                color: tab === t.id ? GREEN : 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
              }}
            >
              <t.Icon className="w-3.5 h-3.5" style={{ display: 'inline', marginRight: 2, verticalAlign: -2 }} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 10 }}>
            <img src="/dogefood-logo.png" alt="" className="lab-feed-breathe" style={{ width: 48, height: 48 }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Loading experiments…</span>
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FlaskConical className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
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
            onLike={handleLike}
            onOpenComments={setActiveComments}
            onOpenTip={setActiveTip}
            onOpenProfile={setViewingProfile}
            onRequireApproval={() => requireApproval(null)}
          />
        ))}
      </div>

      <button
        onClick={() => {
          if (!effectiveAddress) { alert('Connect a wallet or sign in to post.'); return; }
          if (!canInteract) { requireApproval(() => setShowCreate(true)); return; }
          setShowCreate(true);
        }}
        className="ln-glow"
        style={{
          position: 'fixed', bottom: 90, right: 18, zIndex: 900,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${GREEN}, ${PURPLE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
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
      {activeComments && (
        <CommentsPanel note={activeComments} address={effectiveAddress} canInteract={canInteract} onClose={() => setActiveComments(null)} onCommented={handleCommented} />
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
          onOpenPost={(note) => { setViewingProfile(null); setActiveComments(note); }}
        />
      )}
      {badgeQueue.length > 0 && (
        <BadgeToast badgeId={badgeQueue[0]} onDone={() => setBadgeQueue((prev) => prev.slice(1))} />
      )}
    </div>
  );
};

export default LabFeed;
