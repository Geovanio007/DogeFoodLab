import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ─── Growth stage config ──────────────────────────────────────────────────────
const STAGES = [
  { id: 0, name: 'Tiny Pup',    xpRequired: 0,    scale: 0.45, color: '#94a3b8', aura: null,           emoji: '🐶' },
  { id: 1, name: 'Young Pup',   xpRequired: 150,  scale: 0.58, color: '#60a5fa', aura: null,           emoji: '🐕' },
  { id: 2, name: 'Teen Shiba',  xpRequired: 400,  scale: 0.72, color: '#34d399', aura: null,           emoji: '🦮' },
  { id: 3, name: 'Adult Shiba', xpRequired: 800,  scale: 0.85, color: '#f59e0b', aura: '#f59e0b33',   emoji: '🐕‍🦺' },
  { id: 4, name: 'Alpha Shiba', xpRequired: 1500, scale: 0.95, color: '#a78bfa', aura: '#a78bfa44',   emoji: '⭐' },
  { id: 5, name: 'Mythic Lab',  xpRequired: 2800, scale: 1.10, color: '#f97316', aura: '#f9731666',   emoji: '🌟' },
];

const RARITY_XP = { Common: 8, Uncommon: 18, Rare: 35, Epic: 65, Legendary: 110, Mythic: 200 };

// ─── SVG Shiba face (fully inline, no external assets) ───────────────────────
const ShibaFace = ({ stage, isFeeding, isHappy, isDragOver, scale }) => {
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

  const furColor = '#d9853a';
  const furDark   = '#a8632a';
  const innerFur  = '#fbf3e2';
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

      <svg width={size} height={size * 1.05} viewBox="0 0 140 148" style={{ overflow: 'visible' }}>
        {/* === TAIL (curled, Shiba-style with cream underside streak) === */}
        <g transform={`translate(108, 96) rotate(${tailAngle})`} style={{ transformOrigin: '0 0' }}>
          <path d="M0 0 Q20 -20 26 -42 Q30 -58 20 -64 Q10 -68 5 -54 Q0 -38 0 -18 Z"
            fill={furColor} stroke={furDark} strokeWidth="1.2" />
          <path d="M2 -6 Q16 -22 19 -42 Q21 -54 15 -58"
            fill="none" stroke={innerFur} strokeWidth="3" opacity="0.7" strokeLinecap="round" />
        </g>

        {/* === BODY === */}
        <ellipse cx="70" cy="110" rx="40" ry="32" fill={furColor} stroke={furDark} strokeWidth="1.2" />
        {/* Chest urajiro (the breed's signature cream chest patch) */}
        <path d="M50 100 Q70 88 90 100 Q92 122 70 132 Q48 122 50 100 Z" fill={innerFur} opacity="0.95" />

        {/* === FRONT LEGS === */}
        <rect x="42" y="128" width="14" height="18" rx="7" fill={furColor} stroke={furDark} strokeWidth="1" />
        <rect x="84" y="128" width="14" height="18" rx="7" fill={furColor} stroke={furDark} strokeWidth="1" />
        {/* Cream "socks" — another real Shiba marking */}
        <ellipse cx="49" cy="146" rx="8" ry="4.5" fill={innerFur} />
        <ellipse cx="91" cy="146" rx="8" ry="4.5" fill={innerFur} />

        {/* === EARS (sharp, upright, pricked — wiggle on feeding) === */}
        <g transform={`rotate(${-earWiggle * 0.6}, 49, 32)`} style={{ transformOrigin: '49px 32px' }}>
          <path d="M44 50 L34 14 L58 36 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
          <path d="M45 46 L38 22 L54 37 Z" fill={furDark} opacity="0.5" />
        </g>
        <g transform={`rotate(${earWiggle * 0.6}, 91, 32)`} style={{ transformOrigin: '91px 32px' }}>
          <path d="M96 50 L106 14 L82 36 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
          <path d="M95 46 L102 22 L86 37 Z" fill={furDark} opacity="0.5" />
        </g>

        {/* === HEAD (slightly elongated muzzle bridge, less round than a generic puppy) === */}
        <path d="M70 32 C 90 32, 104 46, 104 66 C 104 84, 92 96, 70 98 C 48 96, 36 84, 36 66 C 36 46, 50 32, 70 32 Z"
          fill={furColor} stroke={furDark} strokeWidth="1.3" />

        {/* === URAJIRO face mask (cream marking framing eyes/cheeks/muzzle) === */}
        <path d="M70 54 C 84 54, 92 65, 90 78 C 88 89, 78 95, 70 95 C 62 95, 52 89, 50 78 C 48 65, 56 54, 70 54 Z"
          fill={innerFur} opacity="0.97" />
        {/* Eyebrow cream dots — classic Shiba "four-eyed" marking */}
        <ellipse cx="53" cy="52" rx="4.5" ry="3" fill={innerFur} opacity="0.9" transform="rotate(-12 53 52)" />
        <ellipse cx="87" cy="52" rx="4.5" ry="3" fill={innerFur} opacity="0.9" transform="rotate(12 87 52)" />

        {/* === EYES (almond, slightly upturned, alert) === */}
        {/* Left eye */}
        <g>
          <ellipse cx="58" cy="62" rx="5.5" ry={blinkOpen ? 7 : 1.3} fill="#1a0a00"
            transform="rotate(-8 58 62)" style={{ transition: 'ry 0.08s' }} />
          {blinkOpen && <>
            <ellipse cx="60" cy="59" rx="1.8" ry="2.2" fill="white" opacity="0.9" />
            <ellipse cx="60.5" cy="59.5" rx="0.9" ry="1.1" fill={s.color} opacity="0.7" />
          </>}
        </g>
        {/* Right eye */}
        <g>
          <ellipse cx="82" cy="62" rx="5.5" ry={blinkOpen ? 7 : 1.3} fill="#1a0a00"
            transform="rotate(8 82 62)" style={{ transition: 'ry 0.08s' }} />
          {blinkOpen && <>
            <ellipse cx="80" cy="59" rx="1.8" ry="2.2" fill="white" opacity="0.9" />
            <ellipse cx="79.5" cy="59.5" rx="0.9" ry="1.1" fill={s.color} opacity="0.7" />
          </>}
        </g>

        {/* === MUZZLE (tapered, fox-like) === */}
        <path d="M58 73 Q70 69 82 73 Q80 86 70 90 Q60 86 58 73 Z" fill={innerFur} opacity="0.95" />

        {/* === NOSE === */}
        <path d="M64 77 Q70 74 76 77 Q76 83 70 86 Q64 83 64 77 Z" fill="#241006" />
        <ellipse cx="67" cy="78" rx="2" ry="1.3" fill="rgba(255,255,255,0.35)" />

        {/* === MOUTH === */}
        {mouthOpen ? (
          // Open chewing mouth
          <g>
            <path d="M62 86 Q70 98 78 86" fill="#8b1a1a" stroke="#5a0e0e" strokeWidth="1" />
            <path d="M63 86 Q70 96 77 86" fill="#ef4444" />
            {/* Tongue */}
            <ellipse cx="70" cy="94" rx="6" ry="4" fill="#f87171" />
            <path d="M70 90 L70 98" stroke="#dc2626" strokeWidth="0.8" />
          </g>
        ) : (
          // Happy or neutral mouth — the gentle "Shiba smile"
          <g>
            <path d={isHappy || isDragOver
              ? "M62 88 Q70 94 78 88"
              : "M64 88 Q70 92 76 88"}
              fill="none" stroke="#6b3410" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}

        {/* === CHEEK BLUSH (happy/feeding) === */}
        {(isHappy || isFeeding || isDragOver) && (
          <>
            <ellipse cx="45" cy="78" rx="9" ry="6" fill="#f87171" opacity="0.35" />
            <ellipse cx="95" cy="78" rx="9" ry="6" fill="#f87171" opacity="0.35" />
          </>
        )}

        {/* === MYTHIC STAGE ACCESSORIES === */}
        {stage >= 4 && (
          // Lab goggles for Alpha/Mythic
          <g>
            <rect x="42" y="58" width="20" height="16" rx="8" fill="none"
              stroke={s.color} strokeWidth="2.5" opacity="0.8" />
            <rect x="78" y="58" width="20" height="16" rx="8" fill="none"
              stroke={s.color} strokeWidth="2.5" opacity="0.8" />
            <line x1="62" y1="66" x2="78" y2="66" stroke={s.color} strokeWidth="2" opacity="0.8" />
            <rect x="43" y="59" width="18" height="14" rx="7"
              fill={s.color} opacity="0.12" />
            <rect x="79" y="59" width="18" height="14" rx="7"
              fill={s.color} opacity="0.12" />
          </g>
        )}
        {stage >= 5 && (
          // Mythic crown
          <g transform="translate(52, 14)">
            <polygon points="18,12 0,20 5,0 18,8 31,0 36,20"
              fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
            <circle cx="5" cy="3" r="3" fill="#ef4444" />
            <circle cx="18" cy="0" r="3.5" fill="#a78bfa" />
            <circle cx="31" cy="3" r="3" fill="#34d399" />
          </g>
        )}
      </svg>
    </div>
  );
};

// ─── Floating XP text ─────────────────────────────────────────────────────────
const FloatingXP = ({ value, rarity, onDone }) => {
  const col = {
    Common: '#94a3b8', Rare: '#60a5fa', Epic: '#c084fc',
    Legendary: '#f59e0b', Mythic: '#f97316',
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

// ─── Main ShibaGrowth component ───────────────────────────────────────────────
const ShibaGrowth = React.forwardRef(({ playerAddress, onTreatFed, onCollect }, ref) => {
  const [pet, setPet] = useState(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [floatingXP, setFloatingXP] = useState(null);
  const [justEvolved, setJustEvolved] = useState(false);
  const [error, setError] = useState(null);
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
  // Expose feed() to parent via ref so the 🐕 tap button can trigger animations
  React.useImperativeHandle(ref, () => ({
    feed: (treatId, rarity) => feedTreat(treatId, rarity || 'Common'),
  }), [feedTreat]);

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
        <div style={{
          padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800,
          background: `${stageInfo.color}20`, border: `1px solid ${stageInfo.color}55`,
          color: stageInfo.color, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {stageInfo.emoji} {stageInfo.name}
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
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 160, marginBottom: 12,
      }}>
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
