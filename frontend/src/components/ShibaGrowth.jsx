import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import LabCrateSystem, { CrateAvailableBadge, XP_MILESTONES } from './LabCrateSystem';
import COSMETIC_LAYERS, { RENDER_ORDER } from './ShibaCosmetics';
import { COSMETIC_CATALOGUE } from './PetWardrobe';

const RARITY_COLORS = {
  Common:    '#94a3b8',
  Uncommon:  '#34d399',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#eab308',
  Mythic:    '#facc15',
};
import PetWardrobe from './PetWardrobe';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://dogefood-lab-api.onrender.com';

// ─── Growth stage config ──────────────────────────────────────────────────────
const STAGES = [
  { id: 0, name: 'Tiny Pup',    xpRequired: 0,    scale: 0.45, color: '#94a3b8', aura: null,           emoji: '🐶' },
  { id: 1, name: 'Young Pup',   xpRequired: 150,  scale: 0.58, color: '#60a5fa', aura: null,           emoji: '🐕' },
  { id: 2, name: 'Teen Shiba',  xpRequired: 400,  scale: 0.72, color: '#34d399', aura: null,           emoji: '🦮' },
  { id: 3, name: 'Adult Shiba', xpRequired: 800,  scale: 0.85, color: '#eab308', aura: '#eab30833',   emoji: '🐕‍🦺' },
  { id: 4, name: 'Alpha Shiba', xpRequired: 1500, scale: 0.95, color: '#a78bfa', aura: '#a78bfa44',   emoji: '⭐' },
  { id: 5, name: 'Mythic Lab',  xpRequired: 2800, scale: 1.10, color: '#facc15', aura: '#facc1566',   emoji: '🌟' },
];

const RARITY_XP = { Common: 8, Uncommon: 18, Rare: 35, Epic: 65, Legendary: 110, Mythic: 200 };

// ─── SVG Shiba face (fully inline, no external assets) ───────────────────────
const ShibaFace = ({ stage, isFeeding, isHappy, isDragOver, scale, equipped = {} }) => {
  const s = STAGES[stage] ?? STAGES[0];
  const [blinkOpen, setBlinkOpen] = useState(true);
  const [tailAngle, setTailAngle] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [bounce, setBounce] = useState(0);
  const [earWiggle, setEarWiggle] = useState(0);

  // Idle blink
  useEffect(() => {
    const blink = () => {
      setBlinkOpen(false);
      setTimeout(() => setBlinkOpen(true), 130);
    };
    const iv = setInterval(blink, 2800 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, []);

  // Tail wag
  useEffect(() => {
    let frame;
    let t = 0;
    const animate = () => {
      t += isHappy || isDragOver ? 0.18 : 0.06;
      setTailAngle(Math.sin(t) * (isHappy || isDragOver ? 38 : 16));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isHappy, isDragOver]);

  // Bounce + mouth on feeding
  useEffect(() => {
    if (!isFeeding) { setMouthOpen(false); setBounce(0); return; }
    setMouthOpen(true);
    let t = 0;
    const iv = setInterval(() => {
      t += 0.35;
      setBounce(Math.abs(Math.sin(t)) * 10);
      setEarWiggle(Math.sin(t * 1.4) * 12);
    }, 30);
    return () => { clearInterval(iv); setBounce(0); setEarWiggle(0); };
  }, [isFeeding]);

  const furColor = '#e0a868';
  const furDark   = '#bc8748';
  const innerFur  = '#fdf6e8';
  const size = 140 * (scale || 1);

  return (
    <div style={{
      position: 'relative',
      transform: `translateY(${-bounce}px)`,
      transition: isFeeding ? 'none' : 'transform 0.3s',
      filter: isDragOver ? `drop-shadow(0 0 20px ${s.color})` : isHappy ? `drop-shadow(0 0 12px ${s.color}88)` : 'none',
      cursor: 'default',
    }}>
      {/* Aura for advanced stages */}
      {s.aura && (
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          background: `radial-gradient(circle, ${s.aura} 0%, transparent 70%)`,
          animation: 'aura-pulse 2.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      <svg width={size} height={size * 1.07} viewBox="0 0 140 150" style={{ overflow: 'visible' }}>
        {/* === TAIL (curled, Shiba-style with cream underside streak) === */}
        <g transform={`translate(104, 96) rotate(${tailAngle})`} style={{ transformOrigin: '0 0' }}>
          <path d="M0 0 Q22 -16 27 -38 Q31 -54 21 -60 Q11 -64 6 -50 Q1 -34 0 -14 Z"
            fill={furColor} stroke={furDark} strokeWidth="1.2" />
          <path d="M3 -8 Q17 -20 20 -38 Q22 -48 16 -52"
            fill="none" stroke={innerFur} strokeWidth="3.5" opacity="0.75" strokeLinecap="round" />
        </g>

        {/* === BACK LEGS (slightly behind body, darker shade for depth) === */}
        <ellipse cx="46" cy="132" rx="9" ry="11" fill="#cf9a5c" />
        <ellipse cx="94" cy="132" rx="9" ry="11" fill="#cf9a5c" />

        {/* === BODY === */}
        <path d="M70 84 C 94 84, 106 102, 104 120 C 102 136, 88 144, 70 144 C 52 144, 38 136, 36 120 C 34 102, 46 84, 70 84 Z"
          fill={furColor} stroke={furDark} strokeWidth="1.2" />
        {/* Chest urajiro */}
        <path d="M53 104 Q70 95 87 104 Q89 124 70 138 Q51 124 53 104 Z" fill={innerFur} />

        {/* === FRONT LEGS (in front, full color, separated from body) === */}
        <rect x="45" y="120" width="12" height="22" rx="6" fill={furColor} stroke={furDark} strokeWidth="1" />
        <rect x="83" y="120" width="12" height="22" rx="6" fill={furColor} stroke={furDark} strokeWidth="1" />
        {/* Cream "socks" — another real Shiba marking */}
        <ellipse cx="51" cy="142" rx="7" ry="4.5" fill={innerFur} />
        <ellipse cx="89" cy="142" rx="7" ry="4.5" fill={innerFur} />

        {/* === EARS (soft rounded tips, calmer angle — wiggle on feeding) === */}
        <g transform={`rotate(${-earWiggle * 0.6}, 54, 28)`} style={{ transformOrigin: '54px 28px' }}>
          <path d="M48 44 Q43 22 51 13 Q58 8 60 28 Q59 40 48 44 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
          <path d="M50 40 Q47 25 52 18 Q56 15 57 28" fill={furDark} opacity="0.4" />
        </g>
        <g transform={`rotate(${earWiggle * 0.6}, 86, 28)`} style={{ transformOrigin: '86px 28px' }}>
          <path d="M92 44 Q97 22 89 13 Q82 8 80 28 Q81 40 92 44 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
          <path d="M90 40 Q93 25 88 18 Q84 15 83 28" fill={furDark} opacity="0.4" />
        </g>

        {/* === HEAD (rounder cranium narrowing toward muzzle) === */}
        <path d="M70 28 C 91 28, 103 44, 102 62 C 101 76, 93 86, 80 90 L 60 90 C 47 86, 39 76, 38 62 C 37 44, 49 28, 70 28 Z"
          fill={furColor} stroke={furDark} strokeWidth="1.3" />

        {/* === URAJIRO cheeks (two natural patches, not one blob mask) === */}
        <ellipse cx="52" cy="64" rx="13" ry="15" fill={innerFur} opacity="0.95" />
        <ellipse cx="88" cy="64" rx="13" ry="15" fill={innerFur} opacity="0.95" />
        {/* Eyebrow cream dots — classic Shiba "four-eyed" marking */}
        <ellipse cx="55" cy="50" rx="4.5" ry="3" fill={innerFur} opacity="0.9" transform="rotate(-15 55 50)" />
        <ellipse cx="85" cy="50" rx="4.5" ry="3" fill={innerFur} opacity="0.9" transform="rotate(15 85 50)" />

        {/* === SNOUT (projects forward, distinct from cheeks) === */}
        <path d="M55 70 Q70 64 85 70 Q86 82 78 90 L62 90 Q54 82 55 70 Z" fill={innerFur} />

        {/* === EYES (smaller, almond, set higher — more naturalistic) === */}
        {/* Left eye */}
        <g>
          <ellipse cx="56" cy="58" rx="4.2" ry={blinkOpen ? 5.6 : 1.1} fill="#241509"
            transform="rotate(-10 56 58)" style={{ transition: 'ry 0.08s' }} />
          {blinkOpen && <ellipse cx="57.3" cy="55.5" rx="1.4" ry="1.7" fill="white" opacity="0.9" />}
        </g>
        {/* Right eye */}
        <g>
          <ellipse cx="84" cy="58" rx="4.2" ry={blinkOpen ? 5.6 : 1.1} fill="#241509"
            transform="rotate(10 84 58)" style={{ transition: 'ry 0.08s' }} />
          {blinkOpen && <ellipse cx="82.7" cy="55.5" rx="1.4" ry="1.7" fill="white" opacity="0.9" />}
        </g>

        {/* === NOSE === */}
        <path d="M65 74 Q70 71.5 75 74 Q75 79.5 70 82 Q65 79.5 65 74 Z" fill="#2b1a0c" />
        <ellipse cx="67.5" cy="75" rx="1.6" ry="1" fill="rgba(255,255,255,0.35)" />

        {/* === MOUTH === */}
        {mouthOpen ? (
          // Open chewing mouth
          <g>
            <path d="M61 84 Q70 96 79 84" fill="#8b1a1a" stroke="#5a0e0e" strokeWidth="1" />
            <path d="M62 84 Q70 94 78 84" fill="#ef4444" />
            {/* Tongue */}
            <ellipse cx="70" cy="92" rx="6" ry="4" fill="#f87171" />
            <path d="M70 88 L70 96" stroke="#dc2626" strokeWidth="0.8" />
          </g>
        ) : (
          // Happy or neutral mouth — the gentle "Shiba smile"
          <g>
            <path d={isHappy || isDragOver
              ? "M62 86 Q70 92 78 86"
              : "M64 85 Q70 88.5 76 85"}
              fill="none" stroke="#8a5a2e" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {/* === CHEEK BLUSH (happy/feeding) === */}
        {(isHappy || isFeeding || isDragOver) && (
          <>
            <ellipse cx="46" cy="72" rx="8" ry="5.5" fill="#f87171" opacity="0.3" />
            <ellipse cx="94" cy="72" rx="8" ry="5.5" fill="#f87171" opacity="0.3" />
          </>
        )}

        {/* === MYTHIC STAGE ACCESSORIES === */}
        {stage >= 4 && (
          // Lab goggles for Alpha/Mythic
          <g>
            <rect x="42" y="52" width="20" height="16" rx="8" fill="none"
              stroke={s.color} strokeWidth="2.5" opacity="0.8" />
            <rect x="78" y="52" width="20" height="16" rx="8" fill="none"
              stroke={s.color} strokeWidth="2.5" opacity="0.8" />
            <line x1="62" y1="60" x2="78" y2="60" stroke={s.color} strokeWidth="2" opacity="0.8" />
            <rect x="43" y="53" width="18" height="14" rx="7"
              fill={s.color} opacity="0.12" />
            <rect x="79" y="53" width="18" height="14" rx="7"
              fill={s.color} opacity="0.12" />
          </g>
        )}
        {stage >= 5 && (
          // Mythic crown
          <g transform="translate(52, 10)">
            <polygon points="18,12 0,20 5,0 18,8 31,0 36,20"
              fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="5" cy="3" r="3" fill="#ef4444" />
            <circle cx="18" cy="0" r="3.5" fill="#a78bfa" />
            <circle cx="31" cy="3" r="3" fill="#34d399" />
          </g>
        )}
        {/* ── COSMETIC OVERLAY LAYERS — rendered in correct depth order ── */}
        {/* 1. Back (wings, jetpack, cape) — behind everything */}
        {equipped.back && COSMETIC_LAYERS[equipped.back] &&
          COSMETIC_LAYERS[equipped.back](RARITY_COLORS[(COSMETIC_CATALOGUE.find(c=>c.id===equipped.back)||{}).rarity])}
        {/* 2. Body (coat, hoodie, armor) — over back, under neck/face/head */}
        {equipped.body && COSMETIC_LAYERS[equipped.body] &&
          COSMETIC_LAYERS[equipped.body](RARITY_COLORS[(COSMETIC_CATALOGUE.find(c=>c.id===equipped.body)||{}).rarity])}
        {/* 3. Neck (chain, collar, medal) */}
        {equipped.neck && COSMETIC_LAYERS[equipped.neck] &&
          COSMETIC_LAYERS[equipped.neck](RARITY_COLORS[(COSMETIC_CATALOGUE.find(c=>c.id===equipped.neck)||{}).rarity])}
        {/* 4. Face (glasses, visor, mask) */}
        {equipped.face && COSMETIC_LAYERS[equipped.face] &&
          COSMETIC_LAYERS[equipped.face](RARITY_COLORS[(COSMETIC_CATALOGUE.find(c=>c.id===equipped.face)||{}).rarity])}
        {/* 5. Head (cap, goggles, crown, helmet) — on top of body */}
        {equipped.head && COSMETIC_LAYERS[equipped.head] &&
          COSMETIC_LAYERS[equipped.head](RARITY_COLORS[(COSMETIC_CATALOGUE.find(c=>c.id===equipped.head)||{}).rarity])}
        {/* 6. Aura — floats below/around (rendered last so it wraps all) */}
        {equipped.aura && COSMETIC_LAYERS[equipped.aura] &&
          COSMETIC_LAYERS[equipped.aura](RARITY_COLORS[(COSMETIC_CATALOGUE.find(c=>c.id===equipped.aura)||{}).rarity])}
      </svg>
    </div>
  );
};

// ─── Floating XP text ─────────────────────────────────────────────────────────
const FloatingXP = ({ value, rarity, onDone }) => {
  const col = {
    Common: '#94a3b8', Rare: '#60a5fa', Epic: '#c084fc',
    Legendary: '#eab308', Mythic: '#facc15',
  }[rarity] || '#34d399';
  useEffect(() => { const t = setTimeout(onDone, 1400); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'absolute', top: '10%', left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none', zIndex: 50,
      animation: 'float-xp 1.4s ease-out forwards',
      color: col, fontWeight: 900, fontSize: 22,
      textShadow: `0 0 12px ${col}`,
      whiteSpace: 'nowrap',
    }}>
      +{value} XP 
    </div>
  );
};

// ─── XP Bar ───────────────────────────────────────────────────────────────────
const XPBar = ({ xp, stage }) => {
  const cur = STAGES[stage];
  const nxt = STAGES[stage + 1];
  const fromXP = cur?.xpRequired ?? 0;
  const toXP   = nxt?.xpRequired ?? fromXP;
  const pct    = toXP > fromXP ? Math.min(100, ((xp - fromXP) / (toXP - fromXP)) * 100) : 100;
  const col    = cur?.color ?? '#34d399';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
        <span>{cur?.name}</span>
        <span>{nxt ? `${Math.floor(pct)}% → ${nxt.name}` : ' MAX STAGE'}</span>
      </div>
      <div style={{
        height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${pct}%`,
          background: `linear-gradient(90deg, ${col}88, ${col})`,
          boxShadow: `0 0 8px ${col}`,
          transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, textAlign: 'right' }}>
        {xp} XP total
      </div>
    </div>
  );
};

// ─── Cute 3D-style camera icon for the "save pet as image" button — rounded,
// glossy, gradient-shaded rather than a flat unicode glyph, with a little
// sparkle for a playful feel matching the rest of the pet panel. ───────────
const CuteCameraIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="shibaCamBody" x1="4" y1="8" x2="28" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ddd6fe" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <radialGradient id="shibaCamLens" cx="0.35" cy="0.32" r="0.8">
        <stop offset="0%" stopColor="#bff4fc" />
        <stop offset="45%" stopColor="#22b8d4" />
        <stop offset="100%" stopColor="#0e5e73" />
      </radialGradient>
    </defs>
    <rect x="3" y="10.5" width="26" height="16.5" rx="6" fill="url(#shibaCamBody)" stroke="#4c1d95" strokeWidth="1.3" />
    <rect x="19.2" y="6" width="7.8" height="6" rx="2.4" fill="#c4b5fd" stroke="#4c1d95" strokeWidth="1.1" />
    <rect x="9" y="7.2" width="7" height="4.3" rx="1.8" fill="#a78bfa" stroke="#4c1d95" strokeWidth="1" />
    <circle cx="16" cy="19.3" r="7.1" fill="#4c1d95" />
    <circle cx="16" cy="19.3" r="5.9" fill="url(#shibaCamLens)" />
    <ellipse cx="13.6" cy="17" rx="1.9" ry="1.2" fill="white" opacity="0.7" />
    <path d="M25.3 3.5l0.7 1.8 1.8 0.7-1.8 0.7-0.7 1.8-0.7-1.8-1.8-0.7 1.8-0.7z" fill="#fde047" />
  </svg>
);

// ─── Main ShibaGrowth component ───────────────────────────────────────────────
const ShibaGrowth = React.forwardRef(({ playerAddress, onTreatFed, onCollect }, ref) => {
  const [pet, setPet] = useState(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [floatingXP, setFloatingXP] = useState(null);
  const [justEvolved, setJustEvolved] = useState(false);
  const [error, setError] = useState(null);
  const [pendingCrates, setPendingCrates] = useState([]);
  const [showCrates, setShowCrates] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [equippedCosmetics, setEquippedCosmetics] = useState({});
  const [loading, setLoading] = useState(true);
  const dropZoneRef = useRef(null);

  // ── Load or create pet ──────────────────────────────────────────────────────
  const loadPet = useCallback(async () => {
    if (!playerAddress) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/shiba/${playerAddress}`);
      if (res.ok) {
        const data = await res.json();
        setPet(data);
        console.log('[Shiba] pet loaded:', data.current_xp, 'xp stage', data.current_stage);
      } else if (res.status === 404) {
        console.log('[Shiba] no pet found, creating…');
        const cr = await fetch(`${API_URL}/api/shiba/create/${playerAddress}`, { method: 'POST' });
        if (cr.ok) {
          const newPet = await cr.json();
          setPet(newPet);
          console.log('[Shiba] pet created:', newPet.pet_id);
        } else {
          const err = await cr.text();
          console.error('[Shiba] create failed:', cr.status, err);
        }
      } else {
        const err = await res.text();
        console.error('[Shiba] load failed:', res.status, err);
      }
    } catch (e) {
      console.error('[Shiba] loadPet error:', e);
    } finally {
      setLoading(false);
    }
    // Also load pending crates
    try {
      const cr = await fetch(`${API_URL}/api/lab/crates/${playerAddress}`);
      console.log('[Shiba] crates fetch status:', cr.status);
      if (cr.ok) {
        const cd = await cr.json();
        console.log('[Shiba] pending crates:', cd.crates?.length, cd.crates);
        setPendingCrates(cd.crates || []);
      } else {
        console.error('[Shiba] crates fetch failed:', cr.status, await cr.text());
      }
    } catch (e) {
      console.error('[Shiba] crates fetch error:', e);
    }
    // Load equipped cosmetics
    try {
      const wr = await fetch(`${API_URL}/api/lab/wardrobe/${playerAddress}`);
      console.log('[Shiba] wardrobe fetch status:', wr.status);
      if (wr.ok) {
        const wd = await wr.json();
        console.log('[Shiba] equipped cosmetics:', wd.equipped);
        setEquippedCosmetics(wd.equipped || {});
      } else {
        console.error('[Shiba] wardrobe fetch failed:', wr.status, await wr.text());
      }
    } catch (e) {
      console.error('[Shiba] wardrobe fetch error:', e);
    }
  }, [playerAddress]);

  useEffect(() => { loadPet(); }, [loadPet]);

  // ── Feed treat: animation + XP update + backend /feed call ─────────────────
  const feedTreat = useCallback(async (treatId, treatRarity) => {
    console.log('[Shiba] feedTreat called:', treatId, treatRarity, 'isFeeding:', isFeeding, 'pet:', !!pet);
    if (isFeeding) { console.warn('[Shiba] blocked: already feeding'); return; }

    // Auto-create pet if not yet loaded
    let activePet = pet;
    if (!activePet) {
      console.log('[Shiba] pet null — auto-creating');
      try {
        const cr = await fetch(`${API_URL}/api/shiba/create/${playerAddress}`, { method: 'POST' });
        if (cr.ok) {
          activePet = await cr.json();
          setPet(activePet);
          console.log('[Shiba] auto-created pet:', activePet.pet_id);
        } else {
          console.error('[Shiba] auto-create failed:', cr.status, await cr.text());
          return;
        }
      } catch (e) {
        console.error('[Shiba] auto-create error:', e);
        return;
      }
    }

    setIsFeeding(true);
    setIsDragOver(false);
    const xpGain = RARITY_XP[treatRarity] ?? 8;
    console.log('[Shiba] feeding — rarity:', treatRarity, 'xp gain:', xpGain);

    // Optimistic UI update
    const prevPet = { ...activePet };
    const newXP = (activePet.current_xp ?? 0) + xpGain;
    const newStage = STAGES.reduce((acc, s) => newXP >= s.xpRequired ? s.id : acc, 0);
    const evolved = newStage > (activePet.current_stage ?? 0);
    setPet(p => ({ ...p, current_xp: newXP, current_stage: newStage, total_treats_fed: (p.total_treats_fed ?? 0) + 1 }));
    setFloatingXP({ value: xpGain, rarity: treatRarity, id: Date.now() });
    if (evolved) { setJustEvolved(true); setTimeout(() => setJustEvolved(false), 3000); }
    setTimeout(() => {
      setIsFeeding(false);
      setIsHappy(true);
      setTimeout(() => setIsHappy(false), 2500);
    }, 900);

    // Persist to backend
    try {
      const res = await fetch(`${API_URL}/api/shiba/feed/${playerAddress}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treat_id: treatId, treat_rarity: treatRarity, xp_gained: xpGain }),
      });
      if (res.ok) {
        const data = await res.json();
        setPet(data.pet);
        console.log('[Shiba] feed saved — new xp:', data.pet?.current_xp, 'stage:', data.pet?.current_stage);
        // Handle earned crates from milestone
        if (data.crates_earned?.length > 0) {
          setPendingCrates(prev => [...prev, ...data.crates_earned]);
          setTimeout(() => setShowCrates(true), 1200); // delay so feed animation completes
        }
      } else {
        const err = await res.text();
        console.error('[Shiba] feed API error:', res.status, err);
        setPet(prevPet);
      }
    } catch (e) {
      console.error('[Shiba] feed network error:', e);
      setPet(prevPet);
    }
  }, [pet, isFeeding, playerAddress]);

  // ── Drag and drop handlers ───────────────────────────────────────────────────
  const onDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);

  // ── Save/download the pet exactly as currently dressed ──────────────────────
  // The pet + every cosmetic layer renders as inline SVG with gradients,
  // which html2canvas (a DOM-to-canvas *re-implementation*) is known to
  // hang or fail silently on. Since it's already real SVG, rasterizing it
  // directly through the browser's own native image decoder is both far
  // more reliable and faster — html2canvas is kept only as a fallback for
  // the rare case no <svg> is found in the capture zone. A hard timeout
  // means this can never again get stuck spinning forever either way.
  const captureRef = useRef(null);
  const [capturingImage, setCapturingImage] = useState(false);
  const [captureError, setCaptureError] = useState(false);

  const rasterizeSvg = useCallback(async (svgEl) => {
    const rect = svgEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('SVG failed to rasterize'));
      img.src = svgUrl;
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0620';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, []);

  const capturePetBlob = useCallback(async (container) => {
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      try {
        const blob = await rasterizeSvg(svgEl);
        if (blob) return blob;
      } catch (e) {
        console.warn('[ShibaGrowth] direct SVG export failed, falling back to html2canvas:', e?.message || e);
      }
    }
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0620',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, [rasterizeSvg]);

  const sharePetBlob = useCallback(async (blob) => {
    if (navigator.share) {
      try {
        const file = new File([blob], 'my-reactor-pup.png', { type: 'image/png' });
        await navigator.share({ files: [file], text: 'My Reactor Pup on DogeFood Lab! 🐕' });
        return;
      } catch (shareErr) {
        if (shareErr?.name === 'AbortError') return; // player cancelled the share sheet — don't also force a download
        // navigator.share exists but rejected the file share — fall through to a direct download below
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-reactor-pup.png';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadPetImage = useCallback(async () => {
    if (!captureRef.current || capturingImage) return;
    setCapturingImage(true);
    setCaptureError(false);
    try {
      const blob = await Promise.race([
        capturePetBlob(captureRef.current),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Image capture timed out')), 9000)),
      ]);
      if (!blob) throw new Error('No image data produced');
      await sharePetBlob(blob);
    } catch (e) {
      console.warn('[ShibaGrowth] pet image capture failed:', e?.message || e);
      setCaptureError(true);
      setTimeout(() => setCaptureError(false), 2500);
    } finally {
      setCapturingImage(false);
    }
  }, [capturingImage, capturePetBlob, sharePetBlob]);

  // Expose feed() to parent via ref so the 🐕 tap button can trigger animations
  React.useImperativeHandle(ref, () => ({
    feed: (treatId, rarity) => feedTreat(treatId, rarity || 'Common'),
    downloadPetImage,
  }), [feedTreat, downloadPetImage]);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data?.treatId) {
        // Animation + XP
        feedTreat(data.treatId, data.rarity || 'Common');
        // Collect the treat (via parent) — fires once here for drag path
        // onCollect handles the treat collection for drag path
        if (onCollect) onCollect(data.treatId);
        else if (onTreatFed) onTreatFed(data.treatId);
      }
    } catch {}
  };

  // ── Touch drag support ───────────────────────────────────────────────────────
  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;
    const onTouchMove = (e) => {
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (zone.contains(el)) setIsDragOver(true);
      else setIsDragOver(false);
    };
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => document.removeEventListener('touchmove', onTouchMove);
  }, []);

  const stage = pet?.current_stage ?? 0;
  const stageInfo = STAGES[stage] ?? STAGES[0];

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
      Loading Shiba…
    </div>
  );

  return (
    <section
      ref={dropZoneRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-testid="shiba-growth-panel"
      style={{
        position: 'relative',
        borderRadius: 24,
        border: isDragOver
          ? `2px solid ${stageInfo.color}`
          : `1px solid ${stageInfo.color}44`,
        background: 'linear-gradient(160deg, rgba(10,8,32,0.97) 0%, rgba(6,4,20,0.99) 100%)',
        boxShadow: isDragOver
          ? `0 0 40px ${stageInfo.color}55, inset 0 0 30px ${stageInfo.color}11`
          : `0 0 20px ${stageInfo.color}22`,
        padding: '16px 14px 14px',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            borderRadius: '50%',
            background: stageInfo.color,
            opacity: 0.15 + (i % 3) * 0.08,
            left: `${10 + i * 14}%`,
            top: `${20 + i * 10}%`,
            animation: `float-particle ${3 + i * 0.8}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }} />
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: stageInfo.color, marginBottom: 1 }}>
             Lab Companion
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Reactor Pup</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={downloadPetImage}
            disabled={capturingImage}
            title={captureError ? 'Could not save — try again' : 'Save pet as image'}
            data-testid="shiba-save-image-btn"
            style={{
              width: 28, height: 28, borderRadius: 9,
              background: captureError
                ? 'rgba(239,68,68,0.18)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
              border: `1px solid ${captureError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.14)'}`,
              boxShadow: capturingImage ? 'none' : '0 2px 0 rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, cursor: capturingImage ? 'default' : 'pointer',
              opacity: capturingImage ? 0.6 : 1, padding: 0,
              transform: capturingImage ? 'translateY(1px)' : 'translateY(0)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease',
            }}
            onMouseDown={(e) => { if (!capturingImage) e.currentTarget.style.transform = 'translateY(2px)'; }}
            onMouseUp={(e) => { if (!capturingImage) e.currentTarget.style.transform = 'translateY(0)'; }}
            onTouchStart={(e) => { if (!capturingImage) e.currentTarget.style.transform = 'translateY(2px)'; }}
            onTouchEnd={(e) => { if (!capturingImage) e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {capturingImage ? (
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#ddd6fe',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : captureError ? (
              <span style={{ fontSize: 13 }}>⚠️</span>
            ) : (
              <CuteCameraIcon size={15} />
            )}
          </button>
          <div style={{
            padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800,
            background: `${stageInfo.color}20`, border: `1px solid ${stageInfo.color}55`,
            color: stageInfo.color, textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {stageInfo.emoji} {stageInfo.name}
          </div>
        </div>
      </div>

      {/* Evolution flash */}
      {justEvolved && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 24, zIndex: 40,
          background: `radial-gradient(circle, ${stageInfo.color}55 0%, transparent 70%)`,
          animation: 'evolve-flash 3s ease-out forwards',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: stageInfo.color, textShadow: `0 0 20px ${stageInfo.color}` }}>
             EVOLVED! 
          </div>
        </div>
      )}

      {/* Shiba + drop zone */}
      <div
        ref={captureRef}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 160, marginBottom: 12,
        }}
      >
        {/* Drop zone ring */}
        {isDragOver && (
          <div style={{
            position: 'absolute', inset: 8, borderRadius: '50%',
            border: `2px dashed ${stageInfo.color}`,
            animation: 'spin 3s linear infinite',
            boxShadow: `0 0 20px ${stageInfo.color}66`,
            pointerEvents: 'none',
          }} />
        )}

        <ShibaFace
          stage={stage}
          isFeeding={isFeeding}
          isHappy={isHappy}
          isDragOver={isDragOver}
          scale={stageInfo.scale}
          equipped={equippedCosmetics}
        />

        {/* Floating XP */}
        {floatingXP && (
          <FloatingXP
            key={floatingXP.id}
            value={floatingXP.value}
            rarity={floatingXP.rarity}
            onDone={() => setFloatingXP(null)}
          />
        )}
      </div>

      {/* XP bar */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 10 }}>
        <XPBar xp={pet?.current_xp ?? 0} stage={stage} />
      </div>

      {/* Wardrobe + Crates buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => setShowWardrobe(true)}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)', fontSize: 10,
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          👗 Wardrobe
        </button>
        {pendingCrates.length > 0 && (
          <button
            onClick={() => setShowCrates(true)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b33, #f9731633)',
              border: '1px solid #f59e0b66',
              color: '#f59e0b', fontSize: 10,
              fontWeight: 900, cursor: 'pointer', letterSpacing: '0.06em',
              animation: 'glow-pulse 2s infinite',
            }}
          >
            <img src="/Crate.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain', verticalAlign: '-2px', marginRight: 4 }} />
            {pendingCrates.length} Crate{pendingCrates.length > 1 ? 's' : ''}!
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 6, position: 'relative', zIndex: 1,
      }}>
        {[
          { label: 'Fed', value: pet?.total_treats_fed ?? 0 },
          { label: 'XP', value: pet?.current_xp ?? 0 },
          { label: 'Stage', value: `${stage + 1}/6` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: 1, textAlign: 'center', padding: '5px 0',
            borderRadius: 10, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{value}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Drop hint */}
      <div style={{
        marginTop: 10, textAlign: 'center', fontSize: 9,
        color: isDragOver ? stageInfo.color : 'rgba(255,255,255,0.2)',
        fontWeight: isDragOver ? 800 : 400,
        transition: 'color 0.2s',
        position: 'relative', zIndex: 1,
      }}>
        {isDragOver ? '🎯 Drop to feed!' : 'Drag a ready treat onto Reactor Pup to feed'}
      </div>

      {/* Lab Crate modal */}
      {showCrates && pendingCrates.length > 0 && (
        <LabCrateSystem
          playerAddress={playerAddress}
          pendingCrates={pendingCrates}
          onCrateOpened={(data) => {
            console.log('[Shiba] crate opened:', data);
          }}
          onAllOpened={() => {
            setShowCrates(false);
            setPendingCrates([]);
            loadPet(); // refresh pet + crate count
          }}
        />
      )}

      {/* Pet Wardrobe modal */}
      {showWardrobe && (
        <PetWardrobe
          playerAddress={playerAddress}
          petStage={stage}
          onClose={() => setShowWardrobe(false)}
          onEquipChange={(equipped) => setEquippedCosmetics(equipped)}
        />
      )}

      {/* CSS keyframes injected inline */}
      <style>{`
        @keyframes float-xp {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes aura-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes evolve-flash {
          0%   { opacity: 1; }
          60%  { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
});

// Expose feedTreat so parent can call shiba.current.feed(treatId, rarity)

export default ShibaGrowth;
