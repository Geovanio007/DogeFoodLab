import React, { useState, useEffect, useCallback, useRef } from 'react';
import INGREDIENT_ICONS from '../config/ingredientIcons';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ─── Theme ─────────────────────────────────────────────────────────────────
// Deliberately its own "royal" gold/mythic-pink palette so it never reads
// as just another Lab Crate (amber/orange, from LabCrateSystem.jsx) or the
// Spin Wheel bubble (blue) — this one is rarer and should feel like it.
const CRATE_ART = '/Crate.png';
const GOLD = '#FBBF24';
const MYTHIC = '#EC4899';

const RARITY_COLORS = {
  Common:    '#94a3b8',
  Uncommon:  '#34d399',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
  Mythic:    '#f97316',
};

// ─── Reward card (reveal grid) ──────────────────────────────────────────────
const RewardCard = ({ reward, index, revealed, onReveal }) => {
  const col = RARITY_COLORS[reward.rarity] || GOLD;
  return (
    <div
      onClick={() => !revealed && onReveal(index)}
      style={{
        position: 'relative',
        borderRadius: 16,
        border: `2px solid ${revealed ? col : 'rgba(255,255,255,0.1)'}`,
        background: revealed
          ? `linear-gradient(160deg, ${col}22, rgba(5,3,13,0.95))`
          : 'rgba(255,255,255,0.04)',
        padding: '14px 10px',
        textAlign: 'center',
        cursor: revealed ? 'default' : 'pointer',
        transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        transform: revealed ? 'scale(1.04)' : 'scale(1)',
        boxShadow: revealed ? `0 0 24px ${col}55` : 'none',
        minHeight: 116,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {!revealed ? (
        <>
          <div style={{ fontSize: 28, filter: 'blur(6px)', opacity: 0.4 }}>?</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Tap to reveal
          </div>
        </>
      ) : reward.type === 'ingredient' ? (() => {
        const meta = INGREDIENT_ICONS[reward.value] || {};
        return (
          <>
            {meta.icon ? (
              <img
                src={meta.icon}
                alt={meta.name || reward.value}
                style={{ width: 44, height: 44, objectFit: 'contain', filter: `drop-shadow(0 0 8px ${col})` }}
              />
            ) : (
              <div style={{ fontSize: 32 }}>{meta.emoji || reward.icon || '🧪'}</div>
            )}
            <div style={{ fontSize: 11, fontWeight: 800, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {reward.rarity}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.3 }}>
              {meta.name || reward.label || reward.value}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              ⏳ Unlocked 48h
            </div>
          </>
        );
      })() : reward.type === 'subscription' ? (
        <>
          <div style={{ fontSize: 30 }}>{reward.icon || '🌀'}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {reward.rarity}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.3 }}>
            {reward.label}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
            Auto-Mixer active
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: reward.type === 'points' ? 22 : 28 }}>{reward.icon}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {reward.rarity}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.3 }}>
            {reward.label}
          </div>
          {reward.type === 'points' && (
            <div style={{ fontSize: 11, color: col, fontWeight: 900 }}>+{reward.value} pts</div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Mega Crate opening modal ────────────────────────────────────────────────
const MegaCrateModal = ({ crate, playerAddress, onClose, onOpened }) => {
  const [phase, setPhase] = useState('idle'); // idle → shaking → opening → revealing (or → error)
  const [rewards, setRewards] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [allRevealed, setAllRevealed] = useState(false);
  const [nextAvailableAt, setNextAvailableAt] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const shakeRef = useRef(null);

  const openCrate = useCallback(async () => {
    setPhase('shaking');
    setErrorMessage(null);
    await new Promise(r => setTimeout(r, 700));
    setPhase('opening');
    let fetchedRewards = [];
    let failReason = null;
    try {
      const res = await fetch(`${API_URL}/api/lab/mega-crate/${crate.id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: playerAddress }),
      });
      if (res.ok) {
        const data = await res.json();
        fetchedRewards = data.rewards || [];
        setNextAvailableAt(data.next_available_at || null);
        if (onOpened) onOpened(data);
      } else {
        const bodyText = await res.text();
        console.error('[MegaCrate] open error:', res.status, bodyText);
        failReason = res.status === 404
          ? "Couldn't find this crate on the server — it may still be deploying, or it's already been opened."
          : `Server error (${res.status}). Please try again in a moment.`;
      }
    } catch (e) {
      console.error('[MegaCrate] open failed:', e);
      failReason = "Couldn't reach the server — check your connection and try again.";
    }
    await new Promise(r => setTimeout(r, 900));
    if (fetchedRewards.length > 0) {
      setRewards(fetchedRewards);
      setRevealed(new Array(fetchedRewards.length).fill(false));
      setPhase('revealing');
    } else {
      setErrorMessage(failReason || 'Something went wrong opening this crate.');
      setPhase('error');
    }
  }, [crate.id, playerAddress, onOpened]);

  const revealReward = useCallback((index) => {
    setRevealed(prev => {
      const next = [...prev];
      next[index] = true;
      if (next.every(Boolean)) setTimeout(() => setAllRevealed(true), 400);
      return next;
    });
  }, []);

  const revealAll = useCallback(() => {
    setRevealed(rewards.map(() => true));
    setTimeout(() => setAllRevealed(true), 400);
  }, [rewards]);

  const daysLeft = nextAvailableAt
    ? Math.max(1, Math.ceil((new Date(nextAvailableAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <style>{`
        @keyframes mega-crate-shake {
          0%,100%{transform:translateX(0) rotate(0)}
          15%{transform:translateX(-8px) rotate(-3deg)}
          30%{transform:translateX(8px) rotate(3deg)}
          45%{transform:translateX(-6px) rotate(-2deg)}
          60%{transform:translateX(6px) rotate(2deg)}
          75%{transform:translateX(-3px) rotate(-1deg)}
        }
        @keyframes mega-crate-pop {
          0%{transform:scale(1)}
          40%{transform:scale(1.2)}
          60%{transform:scale(0.9)}
          80%{transform:scale(1.08)}
          100%{transform:scale(0)}
        }
        @keyframes mega-steam { 0%{opacity:0.9;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-64px) scale(2)} }
        @keyframes mega-reward-burst { 0%{opacity:0;transform:scale(0.4)} 70%{transform:scale(1.08)} 100%{opacity:1;transform:scale(1)} }
        @keyframes mega-glow-pulse { 0%,100%{box-shadow:0 0 34px ${GOLD}aa} 50%{box-shadow:0 0 64px ${MYTHIC}aa} }
        @keyframes mega-crate-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes mega-light-burst { 0%{opacity:0;transform:scale(0.3)} 40%{opacity:1;transform:scale(1.7)} 100%{opacity:0;transform:scale(2.6)} }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>
          👑 Max-Tier Reward
        </div>
        <div style={{
          fontSize: 23, fontWeight: 900,
          background: `linear-gradient(135deg, ${GOLD}, ${MYTHIC})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Mega Lab Crate
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          Exclusive to Mythic Lab Shibas
        </div>
      </div>

      {/* Crate */}
      {phase !== 'revealing' && (
        <div
          ref={shakeRef}
          style={{
            position: 'relative',
            width: 200, height: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation:
              phase === 'shaking' ? 'mega-crate-shake 0.7s ease-in-out' :
              phase === 'opening' ? 'mega-crate-pop 0.9s ease-out forwards' :
              'mega-crate-float 2.6s ease-in-out infinite, mega-glow-pulse 2.4s infinite',
            marginBottom: 32,
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}55 0%, transparent 70%)`,
          }} />

          <div style={{
            position: 'absolute', top: 4, right: 4, zIndex: 2,
            padding: '3px 10px', borderRadius: 99,
            background: `linear-gradient(135deg, ${GOLD}, ${MYTHIC})`,
            color: '#000', fontSize: 10, fontWeight: 900,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            boxShadow: `0 2px 12px ${GOLD}88`,
          }}>
            👑 Mega
          </div>

          <img
            src={CRATE_ART}
            alt="Mega Lab Crate"
            style={{
              width: 168, height: 168, objectFit: 'contain',
              filter: `drop-shadow(0 0 26px ${GOLD}) drop-shadow(0 0 14px ${MYTHIC})`,
              position: 'relative', zIndex: 1,
            }}
          />

          {phase === 'opening' && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `radial-gradient(circle, white 0%, ${GOLD} 35%, ${MYTHIC} 65%, transparent 78%)`,
              animation: 'mega-light-burst 0.9s ease-out forwards',
            }} />
          )}

          {phase === 'opening' && [0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: 8 + i * 3, height: 8 + i * 3,
              borderRadius: '50%',
              background: i % 2 === 0 ? GOLD : MYTHIC,
              opacity: 0,
              left: `${18 + i * 15}%`,
              top: '30%',
              animation: `mega-steam ${0.4 + i * 0.1}s ease-out ${i * 0.08}s forwards`,
            }} />
          ))}
        </div>
      )}

      {/* Rewards grid */}
      {phase === 'revealing' && rewards.length > 0 && (
        <div style={{ width: '100%', maxWidth: 380, animation: 'mega-reward-burst 0.5s ease-out' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(rewards.length, 3)}, 1fr)`,
            gap: 10,
            marginBottom: 16,
          }}>
            {rewards.map((reward, i) => (
              <RewardCard key={i} reward={reward} index={i} revealed={revealed[i]} onReveal={revealReward} />
            ))}
          </div>

          {!allRevealed ? (
            <button
              onClick={revealAll}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14,
                background: `linear-gradient(135deg, ${GOLD}, ${MYTHIC})`,
                color: '#000', fontWeight: 900, fontSize: 14,
                border: 'none', cursor: 'pointer',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                boxShadow: `0 4px 24px ${GOLD}88`,
              }}
            >
              Reveal All
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white', fontWeight: 800, fontSize: 14,
                  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                }}
              >
                ✓ Collect Rewards
              </button>
              {daysLeft && (
                <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>
                  Next Mega Crate in {daysLeft} day{daysLeft > 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {phase === 'error' && errorMessage && (
        <div style={{
          maxWidth: 320, textAlign: 'center', marginBottom: 18,
          padding: '10px 16px', borderRadius: 12,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
          color: '#fca5a5', fontSize: 12.5, lineHeight: 1.5,
        }}>
          {errorMessage}
        </div>
      )}

      {/* Open / retry button */}
      {(phase === 'idle' || phase === 'error') && (
        <button
          onClick={openCrate}
          style={{
            padding: '16px 48px', borderRadius: 99,
            background: `linear-gradient(135deg, ${GOLD}, ${MYTHIC})`,
            color: '#000', fontWeight: 900, fontSize: 15,
            border: 'none', cursor: 'pointer',
            boxShadow: `0 6px 32px ${GOLD}88`,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          {phase === 'error' ? 'Try Again' : 'Open Mega Crate'}
        </button>
      )}

      {(phase === 'idle' || phase === 'error') && (
        <button
          onClick={onClose}
          style={{
            marginTop: 16, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      )}
    </div>
  );
};

// ─── Floating badge bubble (menu page) ──────────────────────────────────────
const MegaCrateBadge = ({ onClick, dismissed, onDismiss }) => {
  if (dismissed) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 172,  // stacked above SpinWheelCTA (bottom: 90) with clearance
        right: 16,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        filter: `drop-shadow(0 4px 18px ${GOLD}66)`,
        animation: 'megaCtaBounce 2.2s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes megaCtaBounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>

      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        style={{
          position: 'absolute', top: -8, right: -8,
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 10, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 2,
        }}
        aria-label="Dismiss"
      >{'\u2715'}</button>

      <button
        onClick={onClick}
        data-testid="mega-crate-badge"
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #1e1530 0%, #2a1a3e 100%)',
          border: `2px solid ${GOLD}88`,
          borderRadius: 20,
          padding: '10px 12px',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          backdropFilter: 'blur(8px)',
          minWidth: 84,
        }}
        aria-label="Open Mega Lab Crate"
      >
        <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={CRATE_ART} alt="" style={{ width: 44, height: 44, objectFit: 'contain', filter: `drop-shadow(0 0 8px ${GOLD})` }} />
          <div style={{
            position: 'absolute', top: -6, right: -8,
            background: `linear-gradient(135deg, ${GOLD}, ${MYTHIC})`,
            color: '#000', fontSize: 10, fontWeight: 900,
            borderRadius: 99, padding: '1px 6px',
            boxShadow: `0 2px 8px ${GOLD}aa`,
          }}>x1</div>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800, color: GOLD,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          lineHeight: 1, whiteSpace: 'nowrap',
        }}>
          Mega Crate!
        </span>
      </button>
    </div>
  );
};

// ─── Main export ─────────────────────────────────────────────────────────────
// Self-contained: polls its own status, shows the badge when available, and
// opens the reveal modal on tap. Mount once on the main menu with the same
// playerAddress used everywhere else so it agrees with the Lab page's pet.
const MegaCrateSystem = ({ playerAddress, onOpened }) => {
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dismissedCrateId, setDismissedCrateId] = useState(null);
  // Snapshot of the crate being opened, taken once when the modal opens.
  // Deliberately kept separate from `status`: `status` keeps polling in the
  // background and used to flip to "unavailable" the instant a crate was
  // opened, which unmounted this whole tree — including the modal — before
  // the reveal could ever show. The open modal must stay mounted through its
  // full shake → open → reveal sequence regardless of what `status` does in
  // the background; it should only close when the player closes it.
  const [activeCrate, setActiveCrate] = useState(null);

  const checkStatus = useCallback(async () => {
    if (!playerAddress || playerAddress === 'GUEST_USER') return;
    try {
      const res = await fetch(`${API_URL}/api/lab/mega-crate/status/${playerAddress}`);
      if (res.ok) setStatus(await res.json());
    } catch (e) {
      console.error('[MegaCrate] status error:', e);
    }
  }, [playerAddress]);

  useEffect(() => {
    checkStatus();
    // Re-check periodically so the badge can appear without a page reload
    // once a maxed-out player's cooldown elapses while the menu is open.
    const iv = setInterval(checkStatus, 60000);
    return () => clearInterval(iv);
  }, [checkStatus]);

  const openModal = useCallback(() => {
    setActiveCrate(status?.pending_crate || null);
    setShowModal(true);
  }, [status]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setActiveCrate(null);
    checkStatus(); // crate's been claimed — refresh so the badge clears/updates
  }, [checkStatus]);

  // Only bump the caller's points display here — `status`/the modal are
  // left completely alone so the reveal actually gets to show.
  const handleOpened = useCallback((data) => {
    if (onOpened) onOpened(data);
  }, [onOpened]);

  if (showModal && activeCrate) {
    return (
      <MegaCrateModal
        crate={activeCrate}
        playerAddress={playerAddress}
        onClose={closeModal}
        onOpened={handleOpened}
      />
    );
  }

  if (!status?.available || !status?.pending_crate) return null;

  return (
    <MegaCrateBadge
      onClick={openModal}
      dismissed={dismissedCrateId === status.pending_crate.id}
      onDismiss={() => setDismissedCrateId(status.pending_crate.id)}
    />
  );
};

export default MegaCrateSystem;
