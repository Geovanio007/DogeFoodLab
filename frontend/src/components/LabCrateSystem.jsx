import React, { useState, useEffect, useCallback, useRef } from 'react';
import INGREDIENT_ICONS from '../config/ingredientIcons';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://dogefood-lab-api.onrender.com';

// ─── Crate config ─────────────────────────────────────────────────────────────
// All tiers share the same DogeFood Lab crate artwork (Crate.png) — tier
// identity comes through the glow color, particle color, and badge ring
// around it instead of swapping the actual chest art, so every crate
// reads as unmistakably "DogeFood Lab" while still feeling distinct by rarity.
const CRATE_ART = '/Crate.png';
const CRATE_TYPES = {
  basic:     { name: 'Lab Crate',          color: '#38bdf8', glow: '#38bdf866', tier: 1 },
  rare:      { name: 'Mutation Crate',     color: '#a78bfa', glow: '#a78bfa66', tier: 2 },
  elite:     { name: 'Elite Crate',        color: '#f59e0b', glow: '#f59e0b66', tier: 3 },
  legendary: { name: 'Legendary Crate',    color: '#f97316', glow: '#f9731666', tier: 4 },
  event:     { name: 'Event Crate',        color: '#ec4899', glow: '#ec489966', tier: 5 },
};

const RARITY_COLORS = {
  Common:    '#94a3b8',
  Uncommon:  '#34d399',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
  Mythic:    '#f97316',
};

// ─── XP milestone → crate map ─────────────────────────────────────────────────
export const XP_MILESTONES = [
  { xp: 150,  stage: 1, crate: 'basic',     label: 'Young Pup',   reward_hint: 'Extra Lives + Points' },
  { xp: 400,  stage: 2, crate: 'basic',     label: 'Teen Shiba',  reward_hint: 'Ingredient + Points' },
  { xp: 600,  stage: 2, crate: 'rare',      label: 'Mid Growth',  reward_hint: 'Rare Ingredient + Cosmetic' },
  { xp: 800,  stage: 3, crate: 'rare',      label: 'Adult Shiba', reward_hint: 'Extra Lives + Cosmetic' },
  { xp: 1100, stage: 3, crate: 'elite',     label: 'Evolved',     reward_hint: 'Epic Ingredient + Aura' },
  { xp: 1500, stage: 4, crate: 'elite',     label: 'Alpha Shiba', reward_hint: 'Rare Cosmetic + Points' },
  { xp: 2000, stage: 4, crate: 'legendary', label: 'Champion',    reward_hint: 'Legendary Cosmetic' },
  { xp: 2800, stage: 5, crate: 'legendary', label: 'Mythic Lab',  reward_hint: 'Mythic Transformation' },
];

// ─── Reward card ──────────────────────────────────────────────────────────────
const RewardCard = ({ reward, index, revealed, onReveal }) => {
  const col = RARITY_COLORS[reward.rarity] || '#38bdf8';
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
        minHeight: 110,
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
      ) : (
        <>
          {/* Ingredient: show real image from INGREDIENT_ICONS */}
          {reward.type === 'ingredient' ? (() => {
            const meta = INGREDIENT_ICONS[reward.value] || {};
            return (
              <>
                {meta.icon ? (
                  <img
                    src={meta.icon}
                    alt={meta.name || reward.value}
                    style={{ width: 44, height: 44, objectFit: 'contain',
                      filter: `drop-shadow(0 0 8px ${col})` }}
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
          })() : (
            <>
              <div style={{ fontSize: reward.type === 'points' ? 22 : 28 }}>{reward.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {reward.rarity}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.3 }}>
                {reward.label}
              </div>
              {reward.type === 'points' && (
                <div style={{ fontSize: 11, color: col, fontWeight: 900, animation: 'float-xp 0.6s ease-out' }}>
                  +{reward.value} pts
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

// ─── Lab Crate opening modal ───────────────────────────────────────────────────
const LabCrateModal = ({ crate, onClose, onCrateOpened, playerAddress }) => {
  const [phase, setPhase] = useState('idle'); // idle → shaking → opening → revealing → done
  const [rewards, setRewards] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [allRevealed, setAllRevealed] = useState(false);
  const shakeRef = useRef(null);
  const cfg = CRATE_TYPES[crate.crate_type] || CRATE_TYPES.basic;

  const openCrate = useCallback(async () => {
    console.log('[LabCrate] opening crate:', crate.id, 'player:', playerAddress);
    setPhase('shaking');
    await new Promise(r => setTimeout(r, 700));
    setPhase('opening');
    // Fetch rewards DURING the opening animation so they're ready when it finishes
    let fetchedRewards = [];
    try {
      const res = await fetch(`${API_URL}/api/lab/crate/${crate.id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: playerAddress }),
      });
      console.log('[LabCrate] open response:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[LabCrate] rewards:', data.rewards);
        fetchedRewards = data.rewards || [];
        if (onCrateOpened) onCrateOpened(data);
      } else {
        const err = await res.text();
        console.error('[LabCrate] open error:', res.status, err);
      }
    } catch (e) {
      console.error('[LabCrate] open failed:', e);
    }
    // Wait for animation to finish THEN reveal
    await new Promise(r => setTimeout(r, 900));
    if (fetchedRewards.length > 0) {
      setRewards(fetchedRewards);
      setRevealed(new Array(fetchedRewards.length).fill(false));
      setPhase('revealing');
    } else {
      // API error — reset so player can retry
      console.warn('[LabCrate] no rewards received, resetting to idle');
      setPhase('idle');
    }
  }, [crate.id, playerAddress, onCrateOpened]);

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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <style>{`
        @keyframes crate-shake {
          0%,100%{transform:translateX(0) rotate(0)}
          15%{transform:translateX(-8px) rotate(-3deg)}
          30%{transform:translateX(8px) rotate(3deg)}
          45%{transform:translateX(-6px) rotate(-2deg)}
          60%{transform:translateX(6px) rotate(2deg)}
          75%{transform:translateX(-3px) rotate(-1deg)}
        }
        @keyframes crate-pop {
          0%{transform:scale(1)}
          40%{transform:scale(1.18)}
          60%{transform:scale(0.92)}
          80%{transform:scale(1.06)}
          100%{transform:scale(0)}
        }
        @keyframes steam { 0%{opacity:0.8;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-60px) scale(2)} }
        @keyframes reward-burst { 0%{opacity:0;transform:scale(0.4)} 70%{transform:scale(1.08)} 100%{opacity:1;transform:scale(1)} }
        @keyframes float-xp { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 30px ${cfg.glow}} 50%{box-shadow:0 0 60px ${cfg.color}88} }
        @keyframes crate-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes light-burst { 0%{opacity:0;transform:scale(0.3)} 40%{opacity:1;transform:scale(1.6)} 100%{opacity:0;transform:scale(2.4)} }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: cfg.color, textTransform: 'uppercase', marginBottom: 4 }}>
          Lab Reward
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{cfg.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          <img src={CRATE_ART} alt="" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />
          {crate.milestone_label || 'Milestone Reward'}
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
              phase === 'shaking' ? 'crate-shake 0.7s ease-in-out' :
              phase === 'opening' ? 'crate-pop 0.9s ease-out forwards' :
              'crate-float 2.6s ease-in-out infinite, glow-pulse 2s infinite',
            marginBottom: 32,
          }}
        >
          {/* Glow ring — carries the rarity color since the art itself is one fixed asset */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          }} />

          {/* Tier badge ribbon, top-right of the crate */}
          <div style={{
            position: 'absolute', top: 4, right: 4, zIndex: 2,
            padding: '3px 9px', borderRadius: 99,
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}aa)`,
            color: '#000', fontSize: 10, fontWeight: 900,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            boxShadow: `0 2px 12px ${cfg.glow}`,
          }}>
            Tier {cfg.tier}
          </div>

          {/* The actual DogeFood Lab crate artwork */}
          <img
            src={CRATE_ART}
            alt={cfg.name}
            style={{
              width: 168, height: 168, objectFit: 'contain',
              filter: `drop-shadow(0 0 22px ${cfg.glow})`,
              position: 'relative', zIndex: 1,
            }}
          />

          {/* Light burst flash right as the crate pops open */}
          {phase === 'opening' && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `radial-gradient(circle, white 0%, ${cfg.color} 35%, transparent 75%)`,
              animation: 'light-burst 0.9s ease-out forwards',
            }} />
          )}

          {/* Steam particles on opening */}
          {phase === 'opening' && [0,1,2,3,4].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: 8 + i * 3, height: 8 + i * 3,
              borderRadius: '50%',
              background: cfg.color,
              opacity: 0,
              left: `${20 + i * 15}%`,
              top: '30%',
              animation: `steam ${0.4 + i * 0.1}s ease-out ${i * 0.08}s forwards`,
            }} />
          ))}
        </div>
      )}

      {/* Rewards grid */}
      {phase === 'revealing' && rewards.length > 0 && (
        <div style={{
          width: '100%', maxWidth: 380,
          animation: 'reward-burst 0.5s ease-out',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(rewards.length, 3)}, 1fr)`,
            gap: 10,
            marginBottom: 16,
          }}>
            {rewards.map((reward, i) => (
              <RewardCard
                key={i}
                reward={reward}
                index={i}
                revealed={revealed[i]}
                onReveal={revealReward}
              />
            ))}
          </div>

          {!allRevealed ? (
            <button
              onClick={revealAll}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14,
                background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`,
                color: '#000', fontWeight: 900, fontSize: 14,
                border: 'none', cursor: 'pointer',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                boxShadow: `0 4px 20px ${cfg.glow}`,
              }}
            >
              Reveal All
            </button>
          ) : (
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
          )}
        </div>
      )}

      {/* Open button */}
      {phase === 'idle' && (
        <button
          onClick={openCrate}
          style={{
            padding: '16px 48px', borderRadius: 99,
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}99)`,
            color: '#000', fontWeight: 900, fontSize: 15,
            border: 'none', cursor: 'pointer',
            boxShadow: `0 6px 30px ${cfg.glow}`,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          Open Lab Crate
        </button>
      )}
    </div>
  );
};

// ─── Crate notification badge ─────────────────────────────────────────────────
export const CrateAvailableBadge = ({ count, onClick }) => {
  if (!count) return null;
  return (
    <button
      onClick={onClick}
      data-testid="crate-badge"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 99,
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        border: 'none', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(245,158,11,0.5)',
        animation: 'glow-pulse-badge 2s infinite',
        color: '#000', fontWeight: 900, fontSize: 12,
      }}
    >
      <style>{`
        @keyframes glow-pulse-badge {
          0%,100%{box-shadow:0 4px 20px rgba(245,158,11,0.4)}
          50%{box-shadow:0 4px 30px rgba(245,158,11,0.8)}
        }
      `}</style>
      <img src={CRATE_ART} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
      <span>{count} Lab Crate{count > 1 ? 's' : ''} Ready!</span>
    </button>
  );
};

// ─── Main export ─────────────────────────────────────────────────────────────
const LabCrateSystem = ({ playerAddress, pendingCrates = [], onCrateOpened, onAllOpened }) => {
  const [activeCrate, setActiveCrate] = useState(null);
  const [queue, setQueue] = useState(pendingCrates);

  useEffect(() => {
    setQueue(pendingCrates);
    if (pendingCrates.length > 0 && !activeCrate) {
      setActiveCrate(pendingCrates[0]);
    }
  }, [pendingCrates]);

  const handleClose = useCallback(() => {
    const remaining = queue.slice(1);
    setQueue(remaining);
    if (remaining.length > 0) {
      setTimeout(() => setActiveCrate(remaining[0]), 400);
    } else {
      setActiveCrate(null);
      if (onAllOpened) onAllOpened();
    }
  }, [queue, onAllOpened]);

  if (!activeCrate) return null;

  return (
    <LabCrateModal
      crate={activeCrate}
      playerAddress={playerAddress}
      onClose={handleClose}
      onCrateOpened={onCrateOpened}
    />
  );
};

export default LabCrateSystem;
