import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ArrowLeft, Crown, Wallet, Filter, Grid3X3, List, Trophy, Beaker, Coins, ChevronDown, Tag, Store, X, Loader2, Check } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../contexts/TelegramContext';
import TreatIcon from './TreatIcon';
import MusicPlayer from './MusicPlayer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;


/* ============================================================
   SEASON 2 — RARITY IMAGE MAP
   Images live in /public folder of the frontend repo.
   ============================================================ */
const RARITY_IMAGES = {
  mythic:    '/Mythic.png',
  legendary: '/Legendary.png',
  epic:      '/Epic.png',
  rare:      '/Rare.png',
  uncommon:  '/uncommon.png',
  common:    '/Common.png',
};

const RARITY_CINEMATIC = {
  mythic: {
    bg:        'radial-gradient(ellipse at center, #7c0040 0%, #1a0020 55%, #000 100%)',
    particles: '#ec4899',
    glow:      '0 0 120px 40px rgba(236,72,153,0.6), 0 0 60px 20px rgba(236,72,153,0.4)',
    ring:      'rgba(236,72,153,0.8)',
    label:     '#f9a8d4',
    sfx:       'MYTHIC',
  },
  legendary: {
    bg:        'radial-gradient(ellipse at center, #7c3000 0%, #1a0e00 55%, #000 100%)',
    particles: '#fbbf24',
    glow:      '0 0 120px 40px rgba(251,191,36,0.6), 0 0 60px 20px rgba(251,191,36,0.4)',
    ring:      'rgba(251,191,36,0.8)',
    label:     '#fde68a',
    sfx:       'LEGENDARY',
  },
  epic: {
    bg:        'radial-gradient(ellipse at center, #3b0080 0%, #0d001a 55%, #000 100%)',
    particles: '#a855f7',
    glow:      '0 0 100px 30px rgba(168,85,247,0.55), 0 0 50px 15px rgba(168,85,247,0.35)',
    ring:      'rgba(168,85,247,0.8)',
    label:     '#d8b4fe',
    sfx:       'EPIC',
  },
  rare: {
    bg:        'radial-gradient(ellipse at center, #003380 0%, #00081a 55%, #000 100%)',
    particles: '#38bdf8',
    glow:      '0 0 90px 25px rgba(56,189,248,0.5), 0 0 45px 12px rgba(56,189,248,0.3)',
    ring:      'rgba(56,189,248,0.8)',
    label:     '#7dd3fc',
    sfx:       'RARE',
  },
  uncommon: {
    bg:        'radial-gradient(ellipse at center, #004040 0%, #000f0f 55%, #000 100%)',
    particles: '#2dd4bf',
    glow:      '0 0 80px 20px rgba(45,212,191,0.45), 0 0 40px 10px rgba(45,212,191,0.25)',
    ring:      'rgba(45,212,191,0.7)',
    label:     '#99f6e4',
    sfx:       'UNCOMMON',
  },
  common: {
    bg:        'radial-gradient(ellipse at center, #1a2e1a 0%, #050f05 55%, #000 100%)',
    particles: '#4ade80',
    glow:      '0 0 60px 15px rgba(74,222,128,0.35), 0 0 30px 8px rgba(74,222,128,0.2)',
    ring:      'rgba(74,222,128,0.6)',
    label:     '#bbf7d0',
    sfx:       'COMMON',
  },
};

function getRarityKey(rarity) {
  return (rarity || 'common').toLowerCase();
}

// The Shiba-pouring-cereal URL stamped on all S2 treats at creation time
const S2_PLACEHOLDER_IMAGE = 'l9ufequf_20250720_2152_Shiba_Pouring_Cereal';

// Keep getTreatImage for rarity-only lookups (cinematic reveal, listing modal)
function getTreatImage(rarity) {
  return RARITY_IMAGES[getRarityKey(rarity)] || RARITY_IMAGES.common;
}

/**
 * Season-aware image resolver for treat cards.
 * S1 treats use their real custom image stored in treat.image.
 * S2 treats use the rarity PNG from /public.
 * Detection: S2_ ingredient prefix is the authoritative signal.
 */
function getTreatDisplayImage(treat) {
  const ings = treat?.ingredients || [];
  const isS2 = ings.some(ing => typeof ing === 'string' && ing.startsWith('S2_'))
    || treat?.season_id === 2;

  if (isS2) {
    // S2: always use the rarity PNG
    return RARITY_IMAGES[getRarityKey(treat?.rarity)] || RARITY_IMAGES.common;
  }

  // S1: use whatever image is stored on the treat (Shiba Starlink art IS correct for S1)
  const storedImg = treat?.image || treat?.treat_image;
  if (storedImg) return storedImg;

  // Fallback if no image stored at all
  return RARITY_IMAGES[getRarityKey(treat?.rarity)] || RARITY_IMAGES.common;
}

/**
 * Determine season label for a treat.
 * S2_ ingredient prefix is the authoritative signal for Season 2.
 * Falls back to treat.season_id, then defaults to S1.
 */
function getSeasonLabel(treat) {
  const ings = treat.ingredients || [];
  if (ings.some(ing => typeof ing === 'string' && ing.startsWith('S2_'))) return 'S2';
  if (treat.season_id === 2) return 'S2';
  return 'S1';
}

/* ============================================================
   CINEMATIC COLLECT REVEAL
   Triggered when a treat is newly collected (passed via prop).
   Phases: flash → image drop → glow bloom → stats → dismiss
   ============================================================ */
const CinematicReveal = ({ treat, onClose }) => {
  const [phase, setPhase] = useState(0);
  // 0=flash, 1=drop, 2=bloom, 3=stats, 4=idle
  const rKey  = getRarityKey(treat?.rarity);
  const cin   = RARITY_CINEMATIC[rKey] || RARITY_CINEMATIC.common;
  const img   = getTreatDisplayImage(treat);
  const name  = treat?.name  || `${treat?.rarity || 'Common'} Treat`;
  const pts   = treat?.points_reward || treat?.points || 0;
  const xp    = treat?.xp_reward    || treat?.xp    || 0;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 180),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1100),
      setTimeout(() => setPhase(4), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Particle count based on rarity tier
  const particleCount = { mythic: 28, legendary: 22, epic: 18, rare: 14, uncommon: 10, common: 7 }[rKey] || 8;

  return (
    <div
      onClick={phase >= 4 ? onClose : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: phase === 0
          ? 'rgba(255,255,255,0.95)'
          : cin.bg,
        transition: 'background 0.35s ease-out',
        cursor: phase >= 4 ? 'pointer' : 'default',
      }}
    >
      {/* Particle burst */}
      {phase >= 2 && Array.from({ length: particleCount }).map((_, i) => {
        const angle  = (360 / particleCount) * i;
        const dist   = 120 + Math.random() * 100;
        const size   = 4 + Math.random() * 6;
        const delay  = Math.random() * 0.3;
        const rad    = (angle * Math.PI) / 180;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: size, height: size,
            borderRadius: '50%',
            background: cin.particles,
            top: '50%', left: '50%',
            transform: `translate(-50%, -50%) translate(${Math.cos(rad)*dist}px, ${Math.sin(rad)*dist}px)`,
            opacity: phase >= 3 ? 0 : 0.9,
            transition: `opacity 0.6s ease-out ${delay}s, transform 0.5s ease-out ${delay}s`,
            boxShadow: `0 0 ${size*2}px ${cin.particles}`,
          }} />
        );
      })}

      {/* Outer ring pulse */}
      {phase >= 2 && (
        <div style={{
          position: 'absolute',
          width: phase >= 3 ? 480 : 200,
          height: phase >= 3 ? 480 : 200,
          borderRadius: '50%',
          border: `2px solid ${cin.ring}`,
          opacity: phase >= 4 ? 0 : 0.6,
          transition: 'width 0.5s ease-out, height 0.5s ease-out, opacity 0.6s ease-out 0.8s',
          pointerEvents: 'none',
        }} />
      )}

      {/* Treat image */}
      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 24,
        transform: phase === 0 ? 'scale(0) translateY(-80px)'
                 : phase === 1 ? 'scale(1.15) translateY(0)'
                 : 'scale(1) translateY(0)',
        opacity: phase === 0 ? 0 : 1,
        transition: 'transform 0.45s cubic-bezier(.2,.9,.3,1.2), opacity 0.3s ease-out',
      }}>
        {/* Image container */}
        <div style={{
          position: 'relative',
          width: 220, height: 220,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Glow bloom behind image */}
          <div style={{
            position: 'absolute', inset: -30,
            borderRadius: '50%',
            boxShadow: phase >= 2 ? cin.glow : 'none',
            transition: 'box-shadow 0.5s ease-out',
            background: phase >= 2 ? `radial-gradient(circle, ${cin.particles}22, transparent 70%)` : 'none',
          }} />
          <img
            src={img}
            alt={name}
            style={{
              width: 200, height: 200,
              objectFit: 'contain',
              position: 'relative', zIndex: 1,
              filter: phase >= 2 ? `drop-shadow(0 0 24px ${cin.particles})` : 'none',
              transition: 'filter 0.4s ease-out',
            }}
          />
        </div>

        {/* Rarity label */}
        <div style={{
          fontSize: 13, fontWeight: 900, letterSpacing: '0.35em',
          textTransform: 'uppercase', color: cin.label,
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
          fontFamily: 'monospace',
          textShadow: `0 0 20px ${cin.particles}`,
        }}>
          {cin.sfx}
        </div>

        {/* Treat name */}
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#fff',
          textAlign: 'center', maxWidth: 300, lineHeight: 1.2,
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.4s ease-out 0.1s, transform 0.4s ease-out 0.1s',
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          {name}
        </div>

        {/* Stats pills */}
        {phase >= 3 && (
          <div style={{
            display: 'flex', gap: 12,
            opacity: phase >= 4 ? 1 : 0,
            transition: 'opacity 0.4s ease-out 0.2s',
          }}>
            <div style={{
              padding: '10px 22px', borderRadius: 99,
              background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)' }}>XP</div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'monospace', color: '#22d3ee', lineHeight: 1 }}>+{xp}</div>
            </div>
            <div style={{
              padding: '10px 22px', borderRadius: 99,
              background: `${cin.particles}18`, border: `1px solid ${cin.particles}44`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)' }}>Points</div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'monospace', color: cin.particles, lineHeight: 1 }}>+{pts}</div>
            </div>
          </div>
        )}

        {/* Dismiss hint */}
        {phase >= 4 && (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            fontFamily: 'monospace', marginTop: 8,
          }}>
            Tap anywhere to continue
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   NFT-STYLE TREAT CARD
   Square format, image-dominant, clean metadata footer.
   ============================================================ */
const RARITY_CONFIG = {
  mythic:    { hex: '#ec4899', glow: 'rgba(236,72,153,0.5)',  border: 'rgba(236,72,153,0.6)',  badge: 'linear-gradient(135deg,#f43f5e,#ec4899)', label: '#f9a8d4', icon: 'M' },
  legendary: { hex: '#fbbf24', glow: 'rgba(251,191,36,0.5)',  border: 'rgba(251,191,36,0.55)', badge: 'linear-gradient(135deg,#f59e0b,#fbbf24)', label: '#fde68a', icon: 'L' },
  epic:      { hex: '#a855f7', glow: 'rgba(168,85,247,0.5)',  border: 'rgba(168,85,247,0.55)', badge: 'linear-gradient(135deg,#7c3aed,#a855f7)', label: '#d8b4fe', icon: 'E' },
  rare:      { hex: '#38bdf8', glow: 'rgba(56,189,248,0.5)',  border: 'rgba(56,189,248,0.5)',  badge: 'linear-gradient(135deg,#0284c7,#38bdf8)', label: '#7dd3fc', icon: 'R' },
  uncommon:  { hex: '#2dd4bf', glow: 'rgba(45,212,191,0.45)', border: 'rgba(45,212,191,0.45)', badge: 'linear-gradient(135deg,#0d9488,#2dd4bf)', label: '#99f6e4', icon: 'U' },
  common:    { hex: '#4ade80', glow: 'rgba(74,222,128,0.35)', border: 'rgba(74,222,128,0.3)',  badge: 'linear-gradient(135deg,#16a34a,#4ade80)', label: '#bbf7d0', icon: 'C' },
};

const TreatCard = ({ treat, index, ingredientMap = {}, onListForSale, isListed = false }) => {
  const [hovered, setHovered] = useState(false);

  const rKey = getRarityKey(treat.rarity);
  const cfg  = RARITY_CONFIG[rKey] || RARITY_CONFIG.common;
  const img  = getTreatDisplayImage(treat);
  const pts  = treat.points_reward || treat.points || 0;
  const xp   = treat.xp_reward || treat.xp || 0;

  const getIngredientName = (ing) => {
    if (ing && ing.startsWith('ING')) return ingredientMap[ing] || ing;
    return ing;
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #0f1623 0%, #0a0e18 100%)',
        border: `1px solid ${hovered ? cfg.border : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hovered
          ? `0 0 0 1px ${cfg.border}, 0 8px 32px ${cfg.glow}, 0 2px 8px rgba(0,0,0,0.6)`
          : '0 2px 12px rgba(0,0,0,0.5)',
        transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'pointer',
        animationDelay: `${index * 40}ms`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Square image area ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '100%', // perfect square
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 60%, ${cfg.glow.replace('0.5','0.18').replace('0.45','0.14').replace('0.35','0.1')} 0%, #080c14 70%)`,
        flexShrink: 0,
      }}>
        {/* Animated corner accent top-left */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 40, height: 40,
          borderTop: `2px solid ${cfg.hex}`,
          borderLeft: `2px solid ${cfg.hex}`,
          borderTopLeftRadius: 15,
          opacity: hovered ? 1 : 0.4,
          transition: 'opacity 0.2s',
          zIndex: 3,
        }} />
        {/* Animated corner accent bottom-right */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 40, height: 40,
          borderBottom: `2px solid ${cfg.hex}`,
          borderRight: `2px solid ${cfg.hex}`,
          borderBottomRightRadius: 15,
          opacity: hovered ? 1 : 0.4,
          transition: 'opacity 0.2s',
          zIndex: 3,
        }} />

        {/* Season badge top-right */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          border: `1px solid ${getSeasonLabel(treat) === 'S2' ? 'rgba(45,212,191,0.4)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 6,
          padding: '2px 7px',
          fontSize: 10,
          fontWeight: 700,
          color: getSeasonLabel(treat) === 'S2' ? '#2dd4bf' : 'rgba(255,255,255,0.6)',
          letterSpacing: '0.05em',
          zIndex: 4,
        }}>{getSeasonLabel(treat)}</div>

        {/* Rarity badge top-left */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: cfg.badge,
          borderRadius: 8,
          padding: '3px 10px',
          fontSize: 10,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          zIndex: 4,
          boxShadow: `0 2px 8px ${cfg.glow}`,
        }}>{cfg.icon} {treat.rarity || 'Common'}</div>

        {/* The treat image — centered absolutely inside the padded square */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Glow disc behind image */}
          <div style={{
            position: 'absolute',
            width: '60%', height: '60%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
            opacity: hovered ? 1 : 0.5,
            transition: 'opacity 0.3s',
            filter: 'blur(12px)',
          }} />
          <img
            src={img}
            alt={treat.name || 'DogeFood Treat'}
            onError={(e) => { e.target.src = '/Common.png'; }}
            style={{
              width: '72%', height: '72%',
              objectFit: 'contain',
              position: 'relative', zIndex: 2,
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.3s ease-out',
              filter: hovered ? `drop-shadow(0 0 16px ${cfg.hex})` : `drop-shadow(0 4px 8px rgba(0,0,0,0.5))`,
            }}
          />
        </div>

        {/* Horizontal shine sweep on hover */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
          transform: hovered ? 'translateX(100%)' : 'translateX(-100%)',
          transition: 'transform 0.55s ease-out',
          zIndex: 5,
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Card footer ── */}
      <div style={{
        padding: '12px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
        borderTop: `1px solid rgba(255,255,255,0.06)`,
      }}>
        {/* Treat name */}
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#e2e8f0',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {treat.name || 'Mysterious Treat'}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: 8,
        }}>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            padding: '6px 8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: cfg.hex, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pts}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PTS</div>
          </div>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            padding: '6px 8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#94a3b8', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{xp}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>XP</div>
          </div>
        </div>

        {/* Ingredients — compact pill row */}
        {treat.ingredients && treat.ingredients.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {treat.ingredients.slice(0, 3).map((ing, i) => (
              <span key={i} style={{
                fontSize: 9,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                padding: '2px 6px',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.04em',
              }}>
                {getIngredientName(ing)}
              </span>
            ))}
            {treat.ingredients.length > 3 && (
              <span style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.3)',
                padding: '2px 4px',
              }}>+{treat.ingredients.length - 3}</span>
            )}
          </div>
        )}

        {/* Date */}
        {treat.created_at && (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
            {new Date(treat.created_at).toLocaleDateString()}
          </div>
        )}

        {/* List / Listed button */}
        {isListed ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '7px 10px',
            background: 'rgba(14,165,233,0.12)',
            border: '1px solid rgba(14,165,233,0.3)',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: '#38bdf8',
          }}>
            <Store size={12} />
            Listed
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onListForSale && onListForSale(treat); }}
            data-testid={`list-btn-${treat.id}`}
            style={{
              width: '100%',
              padding: '7px 10px',
              background: hovered
                ? `linear-gradient(135deg, ${cfg.hex}28, ${cfg.hex}18)`
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${hovered ? cfg.border : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              color: hovered ? cfg.label : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Tag size={10} />
            List for Sale
          </button>
        )}
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, value, label, color = 'green', subtext }) => {
  // Long values (e.g. 7-digit $LAB amounts) need a smaller font so they
  // fit the card instead of overflowing and getting visually clipped by
  // the card's overflow-hidden — this was happening on narrow mobile
  // (grid-cols-2) cards with values like "1,799,330".
  const valueStr = String(value ?? '');
  const valueSizeClass =
    valueStr.length > 9  ? 'text-base sm:text-xl' :
    valueStr.length > 6  ? 'text-lg sm:text-2xl' :
    'text-2xl sm:text-3xl';

  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-gradient-to-br from-slate-800/80 to-slate-900/80
      backdrop-blur-xl border border-slate-700/50
      p-4 sm:p-5 transition-all duration-300 hover:border-${color}-500/50
      group
    `}>
      {/* Subtle Glow */}
      <div className={`absolute inset-0 bg-${color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />

      <div className="relative flex items-start gap-3">
        <div className={`
          w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0
          bg-${color}-500/20 text-${color}-400
        `}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`${valueSizeClass} font-bold text-${color}-400 leading-tight break-words tabular-nums`}
            title={valueStr}
          >
            {value}
          </div>
          <div className="text-xs sm:text-sm text-slate-400">{label}</div>
          {subtext && (
            <div className="text-xs text-slate-500 mt-1">{subtext}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const MyTreats = () => {
  const { isConnected, address } = useAccount();
  const { isTelegram, telegramUser } = useTelegram();
  const { user, points: contextPoints, currentLevel, isNFTHolder, loadPlayerData, dispatch } = useGame();
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [treats, setTreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerNFTStatus, setPlayerNFTStatus] = useState(false);
  const [playerPoints, setPlayerPoints] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerLabTokens, setPlayerLabTokens] = useState(null);
  const [estimatedLabTokens, setEstimatedLabTokens] = useState(null);
  const [estimatedLabRank, setEstimatedLabRank] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [ingredientMap, setIngredientMap] = useState({});
  
  // Marketplace listing state
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedTreat, setSelectedTreat] = useState(null);
  const [listingPrice, setListingPrice] = useState({ doge: '', lab: '' });
  const [paymentOption, setPaymentOption] = useState('both');
  const [listingLoading, setListingLoading] = useState(false);
  const [listedTreats, setListedTreats] = useState(new Set());

  // Cinematic reveal — fired when arriving from a collect action
  const [revealTreat, setRevealTreat] = useState(null);

  useEffect(() => {
    // SeasonTwoLab writes the just-collected treat to localStorage before navigating here
    try {
      const raw = localStorage.getItem('dogefood_reveal_treat');
      if (raw) {
        const treat = JSON.parse(raw);
        localStorage.removeItem('dogefood_reveal_treat');
        // Small delay so page has rendered before the flash
        setTimeout(() => setRevealTreat(treat), 200);
      }
    } catch (e) { /* non-fatal */ }
  }, []);
  
  // Get effective player address
  const getEffectiveAddress = () => {
    if (address) return address;
    if (isTelegram && telegramUser?.id) return `TG_${telegramUser.id}`;
    const storedPlayer = localStorage.getItem('dogefood_player');
    if (storedPlayer) {
      try {
        const player = JSON.parse(storedPlayer);
        return player.guest_id || player.id || player.address;
      } catch (e) {
        // Failed to parse stored player
      }
    }
    return null;
  };
  
  const effectiveAddress = getEffectiveAddress();
  
  // Fetch treats and player data
  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveAddress) {
        setTreats([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const [playerResponse, treatsResponse, ingredientsResponse, labEstimateResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/api/player/${effectiveAddress}`),
          fetch(`${BACKEND_URL}/api/treats/${effectiveAddress}`),
          fetch(`${BACKEND_URL}/api/ingredients/catalog`),
          fetch(`${BACKEND_URL}/api/player/${effectiveAddress}/lab-estimate`)
        ]);
        
        // Build ingredient ID to name mapping
        if (ingredientsResponse.ok) {
          const ingredientsData = await ingredientsResponse.json();
          const ingMap = {};
          (ingredientsData.ingredients || []).forEach(ing => {
            ingMap[ing.id] = ing.name;
          });
          setIngredientMap(ingMap);
        }
        
        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          setPlayerNFTStatus(playerData.is_nft_holder === true);
          setPlayerPoints(playerData.points || 0);
          setPlayerLevel(playerData.level || 1);
          if (playerData.s1_lab_tokens != null) setPlayerLabTokens(playerData.s1_lab_tokens);
          if (dispatch) {
            dispatch({ type: 'SET_NFT_HOLDER', payload: playerData.is_nft_holder === true });
            dispatch({ type: 'LOAD_PLAYER_DATA', payload: {
              level: playerData.level || 1,
              experience: playerData.experience || 0,
              points: playerData.points || 0
            }});
          }
        }

        if (labEstimateResponse.ok) {
          const labEstimateData = await labEstimateResponse.json();
          setEstimatedLabTokens(labEstimateData.estimated_lab ?? 0);
          setEstimatedLabRank(labEstimateData.rank ?? null);
        }
        
        if (treatsResponse.ok) {
          const data = await treatsResponse.json();
          setTreats(Array.isArray(data) ? data : data.treats || []);
        } else {
          setTreats([]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load treats');
        setTreats([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [effectiveAddress, dispatch]);
  
  // Fetch which treats are already listed
  useEffect(() => {
    const fetchListedTreats = async () => {
      if (!effectiveAddress) return;
      try {
        const response = await fetch(`${BACKEND_URL}/api/marketplace/my-listings/${effectiveAddress}`);
        if (response.ok) {
          const data = await response.json();
          const listedIds = new Set((data.listings || []).filter(l => l.status === 'active').map(l => l.treat_id));
          setListedTreats(listedIds);
        }
      } catch (err) {
        console.error('Error fetching listed treats:', err);
      }
    };
    fetchListedTreats();
  }, [effectiveAddress]);
  
  // Handle opening the listing modal
  const handleListForSale = (treat) => {
    setSelectedTreat(treat);
    setListingPrice({ doge: '', lab: '' });
    setPaymentOption('both');
    setShowListingModal(true);
  };
  
  // Handle listing submission
  const handleSubmitListing = async () => {
    if (!selectedTreat || !effectiveAddress) return;
    
    // Validate at least one price is set
    if (!listingPrice.doge && !listingPrice.lab) {
      alert('Please set at least one price (DOGE or LAB)');
      return;
    }
    
    setListingLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treat_id: selectedTreat.id,
          seller_address: effectiveAddress,
          price_doge: listingPrice.doge ? parseFloat(listingPrice.doge) : null,
          price_lab: listingPrice.lab ? parseFloat(listingPrice.lab) : null,
          payment_options: paymentOption
        })
      });
      
      if (response.ok) {
        setListedTreats(prev => new Set([...prev, selectedTreat.id]));
        setShowListingModal(false);
        alert('Treat listed successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to list treat');
      }
    } catch (err) {
      console.error('Error listing treat:', err);
      alert('Failed to list treat. Please try again.');
    } finally {
      setListingLoading(false);
    }
  };
  
  const effectiveNFTStatus = playerNFTStatus || isNFTHolder;
  const effectivePoints = playerPoints || contextPoints || 0;
  
  const filteredTreats = treats.filter(treat => 
    selectedRarity === 'all' || treat.rarity?.toLowerCase() === selectedRarity.toLowerCase()
  );

  const rarityStats = {
    mythic: treats.filter(t => t.rarity?.toLowerCase() === 'mythic').length,
    legendary: treats.filter(t => t.rarity?.toLowerCase() === 'legendary').length,
    epic: treats.filter(t => t.rarity?.toLowerCase() === 'epic').length,
    rare: treats.filter(t => t.rarity?.toLowerCase() === 'rare').length,
    uncommon: treats.filter(t => t.rarity?.toLowerCase() === 'uncommon').length,
    common: treats.filter(t => !t.rarity || t.rarity?.toLowerCase() === 'common').length,
  };

  const rarities = [
    { id: 'all', label: 'All', count: treats.length },
    { id: 'mythic', label: 'Mythic', count: rarityStats.mythic, color: 'rose' },
    { id: 'legendary', label: 'Legendary', count: rarityStats.legendary, color: 'amber' },
    { id: 'epic', label: 'Epic', count: rarityStats.epic, color: 'purple' },
    { id: 'rare', label: 'Rare', count: rarityStats.rare, color: 'blue' },
    { id: 'uncommon', label: 'Uncommon', count: rarityStats.uncommon, color: 'cyan' },
    { id: 'common', label: 'Common', count: rarityStats.common, color: 'green' },
  ];

  return (
    <div className="min-h-screen">
      {/* Cinematic reveal — shown immediately on page load if a treat was just collected */}
      {revealTreat && (
        <CinematicReveal
          treat={revealTreat}
          onClose={() => setRevealTreat(null)}
        />
      )}

      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
      
      <div className="relative z-10 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                <TreatIcon size="lg" />
                My Treats
              </h1>
              <p className="text-sm text-slate-400 hidden sm:block">Your collection of magical Dogetreats</p>
            </div>
          </div>
          
          {effectiveNFTStatus && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-4 py-2 rounded-full">
              <Crown className="w-4 h-4 mr-2" />
              VIP Scientist
            </Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatsCard 
            icon={Beaker} 
            value={treats.length} 
            label="Total Treats" 
            color="amber"
          />
          <StatsCard 
            icon={Crown} 
            value={effectiveNFTStatus ? '1+' : '0'} 
            label="DogeFood NFTs" 
            color="purple"
          />
          <StatsCard 
            icon={Trophy} 
            value={effectivePoints.toLocaleString()} 
            label="Total Points"
            color="green"
            subtext="Season End: Convert to $LAB"
          />
          <StatsCard 
            icon={Coins} 
            value={
              estimatedLabTokens != null
                ? estimatedLabTokens.toLocaleString()
                : (playerLabTokens != null ? playerLabTokens.toLocaleString() : "0")
            } 
            label="$LAB Tokens" 
            color="blue"
            subtext={
              estimatedLabTokens != null
                ? (estimatedLabRank
                    ? `Est. for current rank #${estimatedLabRank}`
                    : "Top 50 earn $LAB — keep climbing!")
                : (playerLabTokens > 0 ? "Earned from Season 1" : "Top 50 earn $LAB")
            }
          />
        </div>

        {/* Wallet Info - Only for connected wallets */}
        {isConnected && address && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400">Connected Wallet</div>
                <div className="text-sm text-white font-mono truncate">{address}</div>
              </div>
              <Badge className={effectiveNFTStatus ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-slate-700 text-slate-400"}>
                {effectiveNFTStatus ? "NFT Holder" : "No NFT"}
              </Badge>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors sm:hidden"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Desktop Filters */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {rarities.map(rarity => (
                <button
                  key={rarity.id}
                  onClick={() => setSelectedRarity(rarity.id)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${selectedRarity === rarity.id 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/50'}
                  `}
                >
                  {rarity.label}
                  {rarity.count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      selectedRarity === rarity.id ? 'bg-white/20' : 'bg-slate-700'
                    }`}>
                      {rarity.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Mobile Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 sm:hidden">
              {rarities.map(rarity => (
                <button
                  key={rarity.id}
                  onClick={() => setSelectedRarity(rarity.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${selectedRarity === rarity.id 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                      : 'bg-slate-800/60 text-slate-300 border border-slate-700/50'}
                  `}
                >
                  {rarity.label} ({rarity.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading your treats...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-4xl">❌</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error loading treats</h3>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              Try Again
            </Button>
          </div>
        ) : filteredTreats.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
              <span className="text-5xl">🥺</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {treats.length === 0 ? "No treats yet!" : "No treats match your filter"}
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {treats.length === 0 
                ? "Head to the Lab and start creating some magical Dogetreats!" 
                : "Try adjusting your filters to see more treats."}
            </p>
            {treats.length === 0 && (
              <Link to="/lab">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">
                  <Beaker className="w-4 h-4 mr-2" />
                  Start Creating Treats
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' 
              : 'flex flex-col gap-3'}
          `}>
            {filteredTreats.map((treat, index) => (
              <TreatCard 
                key={treat.id || index} 
                treat={treat} 
                index={index} 
                ingredientMap={ingredientMap}
                onListForSale={handleListForSale}
                isListed={listedTreats.has(treat.id)}
              />
            ))}
          </div>
        )}
        
        {/* Results Count */}
        {!loading && filteredTreats.length > 0 && (
          <div className="text-center mt-8 text-slate-500 text-sm">
            Showing {filteredTreats.length} of {treats.length} treats
          </div>
        )}
      </div>
      
      {/* Listing Modal */}
      {showListingModal && selectedTreat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-yellow-400" />
                List for Sale
              </h2>
              <button 
                onClick={() => setShowListingModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Treat Preview */}
            <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl mb-6">
              <img
                src={getTreatImage(selectedTreat?.rarity)}
                alt={selectedTreat.name}
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
              <div>
                <h3 className="font-bold text-white">{selectedTreat.name}</h3>
                <p className="text-sm text-slate-400">{selectedTreat.rarity}</p>
              </div>
            </div>
            
            {/* Payment Options */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">Accept Payment In</label>
              <div className="flex gap-2">
                {['doge', 'lab', 'both'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setPaymentOption(opt)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      paymentOption === opt
                        ? 'bg-gradient-to-r from-yellow-500 to-sky-500 text-slate-900'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {opt === 'both' ? 'DOGE or LAB' : opt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Price Inputs */}
            <div className="space-y-4 mb-6">
              {(paymentOption === 'doge' || paymentOption === 'both') && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Price in DOGE</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={listingPrice.doge}
                      onChange={(e) => setListingPrice(prev => ({ ...prev, doge: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 font-bold text-sm">
                      DOGE
                    </span>
                  </div>
                </div>
              )}
              
              {(paymentOption === 'lab' || paymentOption === 'both') && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Price in $LAB</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={listingPrice.lab}
                      onChange={(e) => setListingPrice(prev => ({ ...prev, lab: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400 font-bold text-sm">
                      $LAB
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Fee Notice */}
            <div className="text-xs text-slate-500 mb-4 p-3 bg-slate-700/30 rounded-lg">
              <span className="text-yellow-400">Note:</span> A marketplace fee of 0.420 DOGE will be deducted from successful sales.
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowListingModal(false)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitListing}
                disabled={listingLoading || (!listingPrice.doge && !listingPrice.lab)}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-sky-500 text-slate-900 font-bold"
              >
                {listingLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Listing...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> List Treat</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Music Player */}
      <MusicPlayer />
    </div>
  );
};

export default MyTreats;
