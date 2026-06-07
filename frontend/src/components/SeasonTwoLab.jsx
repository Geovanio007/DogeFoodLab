import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Beaker, Zap, ChevronLeft, X, TrendingUp, Bot, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import INGREDIENT_ICONS from '../config/ingredientIcons';
import { useAudio } from '../contexts/AudioContext';
import { useMusic } from '../contexts/MusicContext';
import { useNotifications } from '../contexts/NotificationContext';
import HappyHourBanner from './HappyHourBanner';
import SpinWheel from './SpinWheel';
import DailyLimitTracker from './DailyLimitTracker';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/* ============================================================
   DogeFood Lab — SEASON TWO
   Meme-science fusion reactor, neon-lab vibes, mobile-first.
   Single self-contained component. All sub-features inline so
   they share state cleanly: reactor, ingredient tray, mix
   animation, result reveal, AI Shiba assistant, combo discovery
   hints, reactor overload meter, live market feed.
   ============================================================ */

// Tier styles keyed by the `category` field the backend sends.
// Season 2 uses Starter/Rare/Epic/Legendary/Mythic — no "Common".
const RARITY = {
  Starter:   { hex: '#f59e0b', glow: 'rgba(245,158,11,.55)',  label: 'Starter' },
  Rare:      { hex: '#38bdf8', glow: 'rgba(56,189,248,.6)',   label: 'Rare' },
  Epic:      { hex: '#a855f7', glow: 'rgba(168,85,247,.6)',   label: 'Epic' },
  Legendary: { hex: '#fbbf24', glow: 'rgba(251,191,36,.65)',  label: 'Legendary' },
  Mythic:    { hex: '#ec4899', glow: 'rgba(236,72,153,.7)',   label: 'Mythic' },
  // Legacy fallback — should never appear in Season 2 but kept so nothing crashes
  Common:    { hex: '#9ca3af', glow: 'rgba(156,163,175,.55)', label: 'Common' },
};

const CATEGORY_TINT = {
  Starter: '#f59e0b', Rare: '#3b82f6', Epic: '#a855f7', Legendary: '#fbbf24', Mythic: '#ec4899',
};

function tintFor(category, fallback = '#38bdf8') {
  return CATEGORY_TINT[category] || fallback;
}

function ingredientMeta(id, name) {
  const meta = INGREDIENT_ICONS[id] || {};
  return {
    icon: meta.icon || null,
    emoji: meta.emoji || '✨',
    name: meta.name || name || id,
  };
}

const SHIBA_LINES = [
  "Doctor, the chamber is ready. Let's cook.",
  "Mixing Bone Dust with Crunch Flakes? Bold choice.",
  "Crypto pressure rising — feels like a Legendary day.",
  "Three ingredients = sweet spot. Four = chaos energy.",
  "Saw a player just mint a Mythic. Your turn?",
  "Reactor humming nicely. Smells like Doge.",
];

// =========== CHARACTERS ===========

const CHARACTERS = [
  {
    id: 'max',
    name: 'Shiba Scientist Max',
    description: 'The clever and curious one',
    personality: 'Methodical and analytical, Max loves to understand the science behind every reaction.',
    image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/5thty2tp_20250921_1510_Doge%20Scientist%20Trio_simple_compose_01k5p68s01e1p8f81hk4dvm5tm.png',
    traits: ['Analytical', 'Precise', 'Studious'],
    bonus: '+10% Experience from treats',
    accent: '#22d3ee',
  },
  {
    id: 'rex',
    name: 'Shiba Scientist Rex',
    description: 'The mischievous genius',
    personality: 'Bold and experimental, Rex loves to try wild combinations.',
    image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/w3y5oh69_assets_task_01k5p6sq20fh68gb4hjbs9271e_1758460753_img_0.webp',
    traits: ['Creative', 'Risk-taker', 'Playful'],
    bonus: '+15% Rare treat chance',
    accent: '#fb923c',
  },
  {
    id: 'luna',
    name: 'Shiba Scientist Luna',
    description: 'The smart and fearless female scientist',
    personality: 'Confident and innovative, Luna excels at optimization.',
    image: 'https://customer-assets.emergentagent.com/job_50ed16dc-caaa-4db1-ad7d-d26be77125c0/artifacts/m1k3hm3c_assets_task_01k5p7arcvf6jt34pk82yke1sh_1758461571_img_0.webp',
    traits: ['Fearless', 'Efficient', 'Innovative'],
    bonus: '+20% Points from treats',
    accent: '#a855f7',
  },
];

// =========== HELPERS ===========

function rarityFor(treat) {
  return treat?.outcome?.rarity || treat?.rarity || 'Common';
}

function classNames(...xs) { return xs.filter(Boolean).join(' '); }

// =========== ROOT COMPONENT ===========

const SeasonTwoLab = ({ playerAddress }) => {
  const navigate = useNavigate();
  const { playClick, playBrewing, playSuccess, playRare, soundEnabled, toggleSound } = useAudio() || {};
  const { } = useMusic() || {};
  const { scheduleTreatReadyNotification } = useNotifications() || {};

  // --- core data ---
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerXP, setPlayerXP] = useState(0);
  const [playerXPToNext, setPlayerXPToNext] = useState(100);
  const [playerPoints, setPlayerPoints] = useState(0);
  const [labBalance, setLabBalance] = useState(0);
  const [dailyStatus, setDailyStatus] = useState(null);
  const [nickname, setNickname] = useState('Scientist');

  // --- character ---
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [pendingCharacter, setPendingCharacter] = useState(null);
  const [selectingCharacter, setSelectingCharacter] = useState(false);

  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- mix flow ---
  const [isBrewing, setIsBrewing] = useState(false);
  const [showBrewingAnim, setShowBrewingAnim] = useState(false);
  const [brewResult, setBrewResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // --- assistant + market feed ---
  const [shibaTip, setShibaTip] = useState(SHIBA_LINES[0]);
  const [marketFeed, setMarketFeed] = useState([]);

  // --- load data ---
  const loadPlayerData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/player/${playerAddress}`);
      if (!res.ok) {
        // New player — show character gate
        setShowCharacterSelection(true);
        return 1;
      }
      const data = await res.json();
      setPlayerLevel(data.level || 1);
      setPlayerXP(data.experience ?? data.xp ?? 0);
      setPlayerXPToNext(data.xp_to_next ?? data.next_level_xp ?? 100);
      setPlayerPoints(data.points ?? 0);
      setLabBalance(data.lab_balance ?? data.tokens ?? 0);
      setNickname(data.nickname || 'Scientist');
      if (data.selected_character) {
        const char = CHARACTERS.find((c) => c.id === data.selected_character);
        setSelectedCharacter(char || null);
        setShowCharacterSelection(false);
      } else {
        setShowCharacterSelection(true);
      }
      return data.level || 1;
    } catch (e) {
      console.warn('[SeasonTwoLab] loadPlayer failed:', e?.message || e);
      setShowCharacterSelection(true);
      return 1;
    }
  }, [playerAddress]);

  const handleCharacterSelect = useCallback(async (character) => {
    setSelectingCharacter(true);
    try {
      const res = await fetch(
        `${API_URL}/api/player/${playerAddress}/select-character?character_id=${character.id}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok || res.status === 400) {
        // 400 = already selected, treat as success
        setSelectedCharacter(character);
        setShowCharacterSelection(false);
        const lvl = await loadPlayerData();
        await loadIngredients(lvl);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Could not save character — please try again.');
      }
    } catch (e) {
      setError(e?.message || 'Character selection failed');
    } finally {
      setSelectingCharacter(false);
    }
  }, [playerAddress, loadPlayerData]);

  const loadIngredients = useCallback(async (lvl) => {
    try {
      const res = await fetch(`${API_URL}/api/ingredients/unlocked/${lvl}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.ingredients)
          ? data.ingredients
          : [];
      setIngredients(list);
    } catch (e) {
      console.warn('[SeasonTwoLab] loadIngredients failed:', e?.message || e);
    }
  }, []);

  const loadMarketFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/activity/recent?limit=8`);
      if (!res.ok) return;
      const data = await res.json();
      const feed = Array.isArray(data?.activity) ? data.activity : Array.isArray(data) ? data : [];
      setMarketFeed(feed);
    } catch (e) { /* non-fatal */ }
  }, []);

  // --- brewing treats ---
  const [brewingTreats, setBrewingTreats] = useState([]);
  const [collectingId, setCollectingId] = useState(null);
  const [collectResult, setCollectResult] = useState(null);

  const loadBrewingTreats = useCallback(async () => {
    if (!playerAddress) return;
    try {
      const res = await fetch(`${API_URL}/api/treats/${playerAddress}/active`);
      if (!res.ok) return;
      const data = await res.json();
      const treats = Array.isArray(data?.treats) ? data.treats : [];
      setBrewingTreats(treats.filter(t => t.brewing_status !== 'collected'));
    } catch (e) { /* non-fatal */ }
  }, [playerAddress]);

  const handleCollect = useCallback(async (treatId) => {
    if (collectingId) return;
    setCollectingId(treatId);
    try {
      const res = await fetch(`${API_URL}/api/treats/${treatId}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: playerAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Collect failed');
        return;
      }
      const data = await res.json();
      setCollectResult(data);
      playSuccess && playSuccess();
      await loadBrewingTreats();
      await loadPlayerData();
    } catch (e) {
      setError(e?.message || 'Collect failed');
    } finally {
      setCollectingId(null);
    }
  }, [collectingId, playerAddress, playSuccess, loadBrewingTreats, loadPlayerData]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const lvl = await loadPlayerData();
      await loadIngredients(lvl);
      await loadMarketFeed();
      await loadBrewingTreats();
      setLoading(false);
    })();
  }, [loadPlayerData, loadIngredients, loadMarketFeed, loadBrewingTreats]);

  // Poll active treats every 10s so timers stay live
  useEffect(() => {
    const t = setInterval(loadBrewingTreats, 10000);
    return () => clearInterval(t);
  }, [loadBrewingTreats]);

  useEffect(() => {
    const t = setInterval(loadMarketFeed, 25000);
    return () => clearInterval(t);
  }, [loadMarketFeed]);

  useEffect(() => {
    const t = setInterval(() => {
      setShibaTip(SHIBA_LINES[Math.floor(Math.random() * SHIBA_LINES.length)]);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  // --- derived ---
  const categories = useMemo(() => {
    const set = new Set(ingredients.map((i) => i.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    if (categoryFilter === 'all') return ingredients;
    return ingredients.filter((i) => i.category === categoryFilter);
  }, [ingredients, categoryFilter]);

  // Reactor overload: how chaotic the current mix is (more ingredients = higher overload).
  const overload = useMemo(() => {
    const base = Math.min(100, selectedIngredients.length * 22);
    const rarityBoost = selectedIngredients.reduce((acc, id) => {
      const ing = ingredients.find((i) => i.id === id);
      const r = ing?.category || ing?.rarity || 'Starter';
      const bump = { Starter: 0, Common: 0, Rare: 6, Epic: 12, Legendary: 18, Mythic: 24 }[r] || 0;
      return acc + bump;
    }, 0);
    return Math.min(100, base + rarityBoost);
  }, [selectedIngredients, ingredients]);

  const stability = 100 - overload;
  const xpPct = playerXPToNext > 0 ? Math.min(100, (playerXP / playerXPToNext) * 100) : 0;

  // --- handlers ---
  const addIngredient = (id) => {
    if (selectedIngredients.length >= 5) return;
    if (selectedIngredients.includes(id)) return;
    setSelectedIngredients((p) => [...p, id]);
    playClick && playClick();
  };
  const removeIngredient = (id) => {
    setSelectedIngredients((p) => p.filter((x) => x !== id));
    playClick && playClick();
  };
  const clearMix = () => setSelectedIngredients([]);

  const handleMix = async () => {
    if (isBrewing || selectedIngredients.length < 2) return;
    setError(null);
    setBrewResult(null);
    setShowBrewingAnim(true);
    setIsBrewing(true);
    playBrewing && playBrewing();
    try {
      const res = await fetch(`${API_URL}/api/treats/enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_address: playerAddress,
          ingredients: selectedIngredients,
          player_level: playerLevel,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail?.message || errData.detail || `Mix failed (${res.status})`);
        setShowBrewingAnim(false);
        setIsBrewing(false);
        return;
      }
      const data = await res.json();
      if (data?.treat?.ready_at && scheduleTreatReadyNotification) {
        scheduleTreatReadyNotification(`${data.outcome?.rarity || 'Mystery'} Treat`, data.treat.ready_at);
      }
      // Brewing animation hold for dramatic effect
      setTimeout(() => {
        setShowBrewingAnim(false);
        setBrewResult(data);
        setShowResult(true);
        setSelectedIngredients([]);
        const rare = ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(data.outcome?.rarity);
        if (rare) playRare && playRare(); else playSuccess && playSuccess();
        loadPlayerData();
        loadIngredients(playerLevel);
        loadMarketFeed();
      }, 2600);
    } catch (e) {
      setError(e?.message || 'Mix failed');
      setShowBrewingAnim(false);
    } finally {
      setIsBrewing(false);
    }
  };

  // Handle daily status updates from DailyLimitTracker
  const handleDailyStatusUpdate = useCallback((status) => {
    setDailyStatus(status);
  }, []);

  // Check if daily limit is reached
  const isDailyLimitReached = dailyStatus ? (dailyStatus.remaining_treats || 0) === 0 : false;

  // ============= RENDER =============
  // Character selection gate — same flow as legacy
  if (showCharacterSelection) {
    return (
      <CharacterSelectionScreen
        characters={CHARACTERS}
        pending={pendingCharacter}
        onPick={setPendingCharacter}
        onConfirm={handleCharacterSelect}
        selecting={selectingCharacter}
        onBack={() => navigate('/')}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#05030d] text-white" data-testid="season-two-lab">
      <LabBackdrop />

      {/* Top neon header strip — keeps your stats and XP bar */}
      <TopBar
        nickname={nickname}
        level={playerLevel}
        xp={playerXP}
        xpToNext={playerXPToNext}
        xpPct={xpPct}
        points={playerPoints}
        labBalance={labBalance}
        stability={stability}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        onBack={() => navigate('/')}
        character={selectedCharacter}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 pt-3 pb-32 sm:pb-36 grid gap-4 lg:grid-cols-[1fr_320px]">
        <main className="space-y-4">
          {/* Happy Hour banner from legacy flow */}
          <HappyHourBanner />

          {brewingTreats.length > 0 && (
            <BrewingTreatsPanel
              treats={brewingTreats}
              onCollect={handleCollect}
              collectingId={collectingId}
            />
          )}

          <ReactorChamber
            selectedIngredients={selectedIngredients}
            ingredients={ingredients}
            overload={overload}
            stability={stability}
            isBrewing={isBrewing}
            onRemove={removeIngredient}
          />

          <ReactorOverloadMeter overload={overload} />

          <CategoryFilters
            categories={categories}
            active={categoryFilter}
            onChange={(c) => { playClick && playClick(); setCategoryFilter(c); }}
          />

          <IngredientTray
            ingredients={filteredIngredients}
            selectedIngredients={selectedIngredients}
            onPick={addIngredient}
            loading={loading}
          />
        </main>

        <aside className="space-y-4">
          {/* Extra Lives / Daily Limit Tracker — Season 1 feature restored for Season 2 */}
          <DailyLimitTracker
            playerAddress={playerAddress}
            onStatusUpdate={handleDailyStatusUpdate}
          />
          <ShibaAssistant tip={shibaTip} overload={overload} selectedCount={selectedIngredients.length} />
          <ComboDiscoveryHint ingredients={ingredients} selected={selectedIngredients} />
          <LiveMarketFeed items={marketFeed} />
        </aside>
      </div>

      {/* Floating mix bar */}
      <BottomMixBar
        count={selectedIngredients.length}
        onClear={clearMix}
        onMix={handleMix}
        canMix={selectedIngredients.length >= 2 && !isBrewing && !isDailyLimitReached}
        isBrewing={isBrewing}
        isDailyLimitReached={isDailyLimitReached}
      />

      {showBrewingAnim && <BrewingOverlay />}
      {showResult && brewResult && (
        <ResultReveal
          result={brewResult}
          onClose={() => setShowResult(false)}
        />
      )}

      {error && (
        <div
          data-testid="lab-error-toast"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 rounded-full bg-red-500/90 text-white text-sm shadow-lg border border-red-300/70"
        >
          {error}
          <button onClick={() => setError(null)} className="ml-3 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {collectResult && (
        <CollectResultToast
          result={collectResult}
          onClose={() => setCollectResult(null)}
        />
      )}

      {/* Spin the Wheel — floating button, prizes refresh player data */}
      <SpinWheel
        playerAddress={playerAddress}
        onPrizeWon={async () => {
          const lvl = await loadPlayerData();
          await loadIngredients(lvl);
          await loadMarketFeed();
        }}
      />

      <LabStyles />
    </div>
  );
};

export default SeasonTwoLab;

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

/* ─── TopBar — Season 2 redesign ───────────────────────────────
   Two-row layout:
     Row 1: back btn | avatar | name+level+stats row | sound btn
     Row 2: full-width XP progress bar with glow + label
   Fixes: no text wrapping, no /0/100 line-breaks, stats compact.
   ──────────────────────────────────────────────────────────── */
const TopBar = ({ nickname, level, xp, xpToNext, xpPct, points, labBalance, stability, soundEnabled, toggleSound, onBack, character }) => (
  <header className="relative z-30 px-3 sm:px-4 pt-3" data-testid="lab-top-bar">
    <div
      className="rounded-2xl border border-cyan-400/30"
      style={{
        background: 'linear-gradient(135deg, rgba(10,8,32,0.95) 0%, rgba(13,10,42,0.95) 50%, rgba(10,8,32,0.95) 100%)',
        boxShadow: '0 8px 30px -10px rgba(56,189,248,0.4)',
      }}
    >
      {/* ── Row 1: identity + stats ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px 6px',
      }}>

        {/* COL 1: back btn + avatar with name+level stacked below */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            data-testid="lab-back-btn"
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(34,211,238,0.12)',
              border: '1px solid rgba(34,211,238,0.35)',
              cursor: 'pointer',
            }}
            aria-label="Back to menu"
          >
            <ChevronLeft className="w-5 h-5 text-cyan-300" />
          </button>
          {character && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              {/* Avatar */}
              <div
                data-testid="lab-character-avatar"
                style={{
                  width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
                  border: `2px solid ${character.accent || '#22d3ee'}`,
                  boxShadow: `0 0 10px ${(character.accent || '#22d3ee')}44`,
                }}
                title={character.name}
              >
                <img src={character.image} alt={character.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              {/* Name + level badge stacked under avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span
                  data-testid="lab-nickname"
                  style={{
                    fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 40,
                  }}
                >
                  {character?.name?.split(' ')[2] || nickname}
                </span>
                <span
                  data-testid="lab-level"
                  style={{
                    flexShrink: 0, padding: '1px 5px', borderRadius: 4,
                    fontSize: 9, fontWeight: 800, fontFamily: 'monospace', whiteSpace: 'nowrap',
                    backgroundColor: 'rgba(251,191,36,0.2)', color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.3)',
                  }}
                >
                  {level}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* COL 2: empty flexible spacer — name/level now lives under avatar */}
        <div style={{ minWidth: 0, flex: 1 }} />

        {/* COL 3: $LAB + PTS + sound (fixed, never grows) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Stat label="$LAB" value={labBalance} accent="#facc15" testid="lab-balance" />
          <Stat label="PTS"  value={points}     accent="#a855f7" testid="lab-points" />
          <button
            data-testid="lab-sound-toggle"
            onClick={toggleSound}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
            }}
            aria-label="Toggle sound"
          >
            {soundEnabled
              ? <Volume2 className="w-4 h-4 text-cyan-200" />
              : <VolumeX className="w-4 h-4 text-white/50" />
            }
          </button>
        </div>
      </div>

      {/* ── Row 2: XP progress bar ── */}
      <div className="px-2 pb-2 sm:px-3 sm:pb-3">
        {/* Labels row */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-cyan-300/80">XP</span>
          <span className="text-[10px] font-mono text-cyan-200/50 tabular-nums">
            {Number(xp).toLocaleString()} / {Number(xpToNext).toLocaleString()}
          </span>
        </div>
        {/* Bar track */}
        <div
          className="relative h-3 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(8,22,48,0.8)', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          {/* Filled portion */}
          <div
            data-testid="lab-xp-bar"
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, xpPct)}%`,
              background: 'linear-gradient(90deg, #22d3ee 0%, #a855f7 55%, #f0abfc 100%)',
              boxShadow: '0 0 12px rgba(168,85,247,0.7), 0 0 4px rgba(34,211,238,0.9)',
            }}
          />
          {/* Moving shimmer */}
          <div
            className="absolute inset-y-0 w-1/3 animate-shimmer pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)' }}
          />
          {/* Top gloss */}
          <div
            className="absolute top-0 inset-x-0 h-1/2 rounded-t-full pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.18), transparent)' }}
          />
        </div>
        {/* Level-up hint when close */}
        {xpPct >= 80 && (
          <div className="mt-1 text-[10px] font-mono text-fuchsia-300/80 text-right animate-pulse">
            Almost Level {level + 1}! ✦
          </div>
        )}
      </div>
    </div>
  </header>
);

const Stat = ({ label, value, accent, testid }) => {
  const formatted = Number(value || 0).toLocaleString();
  // Dynamically size the pill to fit the value — min 48px, max 72px
  const w = Math.min(72, Math.max(48, formatted.length * 9 + 16));
  return (
  <div
    data-testid={testid}
    style={{
      width: w, flexShrink: 0, padding: '4px 6px', borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.09)',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', lineHeight: 1, marginBottom: 2 }}>
      {label}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: accent, lineHeight: 1, whiteSpace: 'nowrap' }}>
      {formatted}
    </div>
  </div>
  );
};

/* ----- Reactor ----- */

const ReactorChamber = ({ selectedIngredients, ingredients, overload, stability, isBrewing, onRemove }) => {
  const picked = selectedIngredients
    .map((id) => ingredients.find((i) => i.id === id))
    .filter(Boolean);

  // Color shifts with overload — calm cyan -> hot orange -> red on chaos
  const hue = 195 - Math.round((overload / 100) * 195); // 195 (cyan) -> 0 (red)

  return (
    <section
      data-testid="reactor-chamber"
      className="relative rounded-3xl overflow-hidden border border-cyan-400/30 bg-gradient-to-b from-[#0a0820] to-[#06041a] p-4 sm:p-6"
      style={{ boxShadow: `0 30px 80px -20px hsla(${hue},100%,55%,0.35), inset 0 0 80px hsla(${hue},80%,50%,0.08)` }}
    >
      {/* Background neon grid */}
      <div className="absolute inset-0 pointer-events-none opacity-50" aria-hidden>
        <div className="absolute inset-0 lab-grid" />
        <div className="absolute inset-0 lab-scanline" />
      </div>

      {/* Header — centred */}
      <div className="relative z-10 flex flex-col items-center mb-3 sm:mb-4">
        <div className="text-[10px] tracking-[0.3em] text-cyan-300/70 font-mono text-center">MEME MIXER REACTOR</div>
        <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-center" style={{ fontFamily: 'var(--font-heading)' }}>
          Fusion Chamber<span className="text-cyan-300">.</span>
        </div>
        {/* Status pill — centred below title */}
        <div className="flex items-center gap-2 mt-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className={classNames('w-2 h-2 rounded-full animate-pulse', overload > 70 ? 'bg-red-400' : 'bg-emerald-400')} />
          <span className="text-[10px] uppercase tracking-widest text-white/70">{overload > 70 ? 'OVERDRIVE' : 'ONLINE'}</span>
        </div>
      </div>

      {/* Reactor visual */}
      <div className="relative z-10 mx-auto w-full max-w-md aspect-square">
        {/* outer ring */}
        <div
          className={classNames('absolute inset-0 rounded-full border', isBrewing && 'animate-spin-slow')}
          style={{
            borderColor: `hsla(${hue},100%,55%,0.35)`,
            boxShadow: `0 0 50px hsla(${hue},100%,55%,0.4) inset, 0 0 30px hsla(${hue},100%,55%,0.4)`,
          }}
        />
        {/* rotating crypto ring */}
        <div className="absolute inset-3 rounded-full border-2 border-dashed animate-spin-slower" style={{ borderColor: `hsla(${hue},90%,70%,0.4)` }} />
        <div className="absolute inset-7 rounded-full border animate-spin-slow-reverse" style={{ borderColor: `hsla(${hue},80%,80%,0.25)` }} />
        {/* glass bowl */}
        <div
          className="absolute inset-10 rounded-full overflow-hidden border-2"
          style={{
            borderColor: `hsla(${hue},100%,75%,0.45)`,
            background: `radial-gradient(circle at 35% 30%, hsla(${hue},100%,75%,0.35), hsla(${hue},100%,30%,0.7) 60%, hsla(${hue},90%,15%,0.95))`,
            boxShadow: `inset 0 0 60px hsla(${hue},100%,60%,0.5)`,
          }}
        >
          {/* Liquid + bubbles */}
          <div
            className={classNames('absolute inset-x-0 bottom-0 transition-all duration-700', isBrewing && 'animate-liquid-bubble')}
            style={{
              height: `${30 + picked.length * 10}%`,
              background: `linear-gradient(to top, hsla(${hue},100%,55%,0.95), hsla(${hue},90%,65%,0.55))`,
              filter: 'blur(0.5px)',
            }}
          />
          {/* Floating dots */}
          {picked.map((ing, idx) => (
            <span
              key={ing.id}
              className="absolute w-2 h-2 rounded-full animate-float-bub"
              style={{
                left: `${15 + (idx * 17) % 70}%`,
                bottom: `${10 + (idx * 13) % 50}%`,
                background: `hsla(${hue},100%,80%,0.95)`,
                boxShadow: `0 0 8px hsla(${hue},100%,80%,0.9)`,
                animationDelay: `${idx * 0.3}s`,
              }}
            />
          ))}
          {/* Glass shine */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 40%)' }} />
        </div>

        {/* Holo % display */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
          <div className="text-[9px] tracking-[0.3em] font-mono text-cyan-200/70 uppercase">Stability</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono" style={{ color: `hsla(${hue},100%,75%,1)`, textShadow: `0 0 12px hsla(${hue},100%,60%,0.9)` }}>
            {stability}%
          </div>
        </div>
      </div>

      {/* Selected ingredient slots */}
      <div className="relative z-10 mt-4 sm:mt-6">
        <div className="text-[10px] tracking-[0.3em] uppercase font-mono text-cyan-300/70 mb-1.5">Loaded · {picked.length}/5</div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const ing = picked[i];
            const tint = ing ? tintFor(ing.category) : '#1f2937';
            return (
              <button
                key={i}
                data-testid={`reactor-slot-${i}`}
                onClick={() => ing && onRemove(ing.id)}
                className={classNames(
                  'relative aspect-square rounded-xl border flex items-center justify-center text-2xl transition-all',
                  ing
                    ? 'bg-white/5 hover:bg-white/10 cursor-pointer'
                    : 'border-dashed border-white/10 bg-black/30'
                )}
                style={ing ? { borderColor: tint + 'bb', boxShadow: `0 0 14px ${tint}66, inset 0 0 14px ${tint}33` } : undefined}
                aria-label={ing ? `Remove ${ingredientMeta(ing.id, ing.name).name}` : 'Empty slot'}
              >
                {ing ? (() => {
                  const m = ingredientMeta(ing.id, ing.name);
                  return m.icon ? (
                    <img src={m.icon} alt={m.name} className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" loading="lazy" />
                  ) : (
                    <span>{m.emoji}</span>
                  );
                })() : (
                  <span className="text-white/20 text-xs font-mono">+</span>
                )}
                {ing && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/90 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100">×</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const ReactorOverloadMeter = ({ overload }) => {
  const stage = overload > 80 ? 'CRITICAL' : overload > 50 ? 'UNSTABLE' : overload > 20 ? 'ACTIVE' : 'IDLE';
  const stageColor = overload > 80 ? '#ef4444' : overload > 50 ? '#fb923c' : overload > 20 ? '#facc15' : '#22d3ee';
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur px-4 py-3" data-testid="reactor-overload-meter">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: stageColor }} />
          <span className="text-[10px] tracking-[0.3em] uppercase font-mono text-white/70">DOGE ENERGY</span>
        </div>
        <span className="text-xs font-bold font-mono" style={{ color: stageColor }}>{stage} · {overload}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500"
          style={{ width: `${overload}%`, background: `linear-gradient(to right, #22d3ee, #a855f7, ${stageColor})` }}
        />
      </div>
      {overload > 80 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-300">
          <AlertTriangle className="w-3 h-3" />
          Critical overload — higher mutation risk, higher reward.
        </div>
      )}
    </div>
  );
};

const CategoryFilters = ({ categories, active, onChange }) => (
  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar" data-testid="lab-category-filters">
    {categories.map((c) => (
      <button
        key={c}
        data-testid={`lab-filter-${c}`}
        onClick={() => onChange(c)}
        className={classNames(
          'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap',
          active === c
            ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.5)]'
            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
        )}
        style={active === c && c !== 'all' ? { background: tintFor(c), borderColor: tintFor(c), color: '#0a0820', boxShadow: `0 0 18px ${tintFor(c)}88` } : undefined}
      >
        {c === 'all' ? 'All' : c}
      </button>
    ))}
  </div>
);

const IngredientTray = ({ ingredients, selectedIngredients, onPick, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2" data-testid="ingredient-tray-loading">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!ingredients.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-white/60 text-sm">
        No ingredients unlocked for this filter yet. Keep leveling up!
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2" data-testid="ingredient-tray">
      {ingredients.map((ing) => {
        const meta = ingredientMeta(ing.id, ing.name);
        const tint = tintFor(ing.category);
        // Backend sends `category` (Starter/Rare/Epic/Legendary/Mythic) — not `rarity`.
        // Use category for the tier badge; fall back to Starter if unrecognised.
        const rar = RARITY[ing.category] || RARITY.Starter;
        const isPicked = selectedIngredients.includes(ing.id);
        return (
          <button
            key={ing.id}
            data-testid={`ingredient-card-${ing.id}`}
            onClick={() => onPick(ing.id)}
            disabled={isPicked}
            className={classNames(
              'relative aspect-square rounded-2xl border-2 p-2 flex flex-col items-center justify-center text-center transition-all',
              'bg-gradient-to-b from-white/[0.04] to-white/[0.02]',
              isPicked
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:-translate-y-0.5 hover:bg-white/[0.06] active:scale-95'
            )}
            style={{
              borderColor: rar.hex + '88',
              boxShadow: isPicked ? 'none' : `0 0 18px ${rar.glow}, inset 0 0 12px ${tint}22`,
            }}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] flex items-center justify-center">
              {meta.icon ? (
                <img
                  src={meta.icon}
                  alt={meta.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.textContent = meta.emoji; }}
                  loading="lazy"
                />
              ) : (
                meta.emoji
              )}
            </span>
            <span className="mt-1 text-[10px] sm:text-[11px] font-bold text-white truncate w-full">
              {meta.name}
            </span>
            <span className="absolute top-1.5 left-1.5 text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full" style={{ color: rar.hex, background: rar.hex + '22', border: `1px solid ${rar.hex}66` }}>
              {rar.label}
            </span>
            {typeof ing.count === 'number' && (
              <span className="absolute top-1.5 right-1.5 text-[10px] font-mono font-bold text-white/80 bg-black/60 rounded-full px-1.5 py-0.5">×{ing.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ----- Bottom mix bar ----- */

const BottomMixBar = ({ count, onClear, onMix, canMix, isBrewing, isDailyLimitReached }) => (
  <div className="fixed inset-x-0 bottom-0 z-30 px-3 sm:px-4 pb-3 sm:pb-4 pt-2 pointer-events-none" data-testid="bottom-mix-bar">
    <div className="mx-auto max-w-3xl">
      <div className="pointer-events-auto rounded-3xl border border-cyan-400/30 bg-gradient-to-r from-[#0a0820]/95 via-[#0d0a2a]/95 to-[#0a0820]/95 backdrop-blur-lg shadow-[0_30px_80px_-10px_rgba(56,189,248,0.4)] p-2 sm:p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] font-mono text-cyan-300/60">Cargo</div>
          <div className="text-sm font-bold text-white">
            <span className="font-mono text-cyan-300">{count}</span> ingredient{count === 1 ? '' : 's'} loaded
          </div>
        </div>
        <button
          data-testid="mix-clear-btn"
          onClick={onClear}
          disabled={!count}
          className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 transition-all"
        >
          Clear
        </button>
        <button
          data-testid="mix-fire-btn"
          onClick={onMix}
          disabled={!canMix}
          className={classNames(
            'shrink-0 px-5 sm:px-7 py-3 rounded-2xl text-sm sm:text-base font-extrabold uppercase tracking-wider transition-all relative overflow-hidden',
            canMix
              ? 'text-black bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 shadow-[0_10px_30px_-5px_rgba(245,158,11,0.7)] hover:-translate-y-0.5 active:scale-95'
              : 'text-white/50 bg-white/5 border border-white/10 cursor-not-allowed'
          )}
        >
          <span className="relative z-10">
            {isBrewing ? 'Mixing…' : isDailyLimitReached ? '♥ Need Extra Life?' : 'Mix Now'}
          </span>
          {canMix && <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-150%] animate-mix-shimmer" />}
        </button>
      </div>
    </div>
  </div>
);

/* ----- Brewing overlay ----- */

const BrewingOverlay = () => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-auto" data-testid="brewing-overlay">
    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
    <div className="relative flex flex-col items-center">
      <div className="relative w-48 h-48 sm:w-56 sm:h-56">
        <div className="absolute inset-0 rounded-full border-4 border-cyan-400/70 animate-spin-slow" />
        <div className="absolute inset-3 rounded-full border-2 border-purple-400/70 border-dashed animate-spin-slower" />
        <div className="absolute inset-6 rounded-full border border-amber-300/70 animate-spin-slow-reverse" />
        <div className="absolute inset-12 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-fuchsia-500 animate-pulse opacity-90 shadow-[0_0_60px_rgba(168,85,247,0.7)]" />
        <Beaker className="absolute inset-0 m-auto w-12 h-12 text-white animate-pulse" />
      </div>
      <div className="mt-6 text-center">
        <div className="text-cyan-200/70 text-[11px] tracking-[0.4em] uppercase font-mono">Synthesizing</div>
        <div className="text-2xl font-extrabold text-white mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Meme Fusion Active
        </div>
      </div>
    </div>
  </div>
);

/* ----- Result reveal ----- */

const ResultReveal = ({ result, onClose }) => {
  const rarity = rarityFor(result);
  const isRare = ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(rarity);
  const isLegendary = ['Legendary', 'Mythic'].includes(rarity);
  const r = RARITY[rarity] || RARITY.Common;

  const treat = result?.treat || {};
  const outcome = result?.outcome || {};
  // Backend stores rewards as xp_reward / points_reward on the treat object
  const xpGained = treat.xp_reward ?? outcome.xp_reward ?? outcome.xp_gained ?? result.xp_gained ?? 0;
  const pointsGained = treat.points_reward ?? outcome.points_reward ?? outcome.points_gained ?? result.points_gained ?? 0;
  const fc = FLASK_COLORS[rarity] || FLASK_COLORS.Common;

  return (
    <div
      data-testid="result-reveal"
      className={classNames('fixed inset-0 z-[120] flex items-center justify-center p-4', isLegendary && 'animate-screen-shake')}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      {isLegendary && <div className="absolute inset-0 animate-rainbow-flash pointer-events-none" />}
      <div
        className="relative w-full max-w-sm rounded-3xl border-2 p-5 sm:p-6 text-center animate-result-pop"
        style={{ borderColor: r.hex, background: `radial-gradient(circle at 50% 0%, ${r.hex}33, transparent 60%), linear-gradient(to bottom, #0a0820, #04030f)`, boxShadow: `0 30px 80px -10px ${r.glow}, 0 0 40px ${r.glow}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center" aria-label="Close">
          <X className="w-4 h-4" />
        </button>

        {isLegendary && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-black animate-pulse"
            style={{ background: 'linear-gradient(to right, #f59e0b, #ec4899, #a855f7, #38bdf8)' }}>
            {rarity} Mutation
          </div>
        )}

        <div className="text-[10px] uppercase tracking-[0.3em] font-mono" style={{ color: r.hex }}>
          {isRare ? 'Mutation Success' : 'Sample Stabilized'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          {treat.name || outcome.name || 'Mystery Treat'}
        </h2>

        <div className="my-5 relative mx-auto" style={{ width: 110, height: 138 }}>
          {/* Glow behind flask */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 50% 65%, ${fc.glow}, transparent 60%)`,
            animation: 'rarity-pulse 1.6s ease-in-out infinite',
          }} />
          <svg viewBox="0 0 80 100" width="110" height="138"
            style={{ position: 'relative', zIndex: 1, filter: `drop-shadow(0 0 10px ${fc.liquid})` }}>
            <defs>
              <clipPath id="res-fc">
                <path d="M28 6 L28 36 L10 68 Q7 78 16 80 L64 80 Q73 78 70 68 L52 36 L52 6 Z" />
              </clipPath>
              <linearGradient id="res-lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fc.liquid} stopOpacity="0.95" />
                <stop offset="100%" stopColor={fc.liquid} stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {/* Glass */}
            <path d="M28 6 L28 36 L10 68 Q7 78 16 80 L64 80 Q73 78 70 68 L52 36 L52 6 Z"
              fill="rgba(255,255,255,0.03)" stroke={`${fc.liquid}88`} strokeWidth="2" />
            <rect x="24" y="2" width="32" height="8" rx="3"
              fill={`${fc.liquid}44`} stroke={`${fc.liquid}88`} strokeWidth="1.5" />
            {/* Liquid — 70% full */}
            <g clipPath="url(#res-fc)">
              <rect x="0" y="32" width="80" height="56" fill="url(#res-lg)" />
              {[0,1,2,3].map(i => (
                <circle key={i} cx={18+i*13} cy={42+i*3} r={i*1.4+1.2}
                  fill={fc.liquid} opacity="0.65"
                  style={{ animation: `float-bub ${1.4+i*0.35}s ease-in-out infinite`, animationDelay: `${i*0.28}s` }} />
              ))}
            </g>
            {/* Shine */}
            <path d="M32 9 L32 34 L18 60" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Check */}
            <circle cx="40" cy="54" r="13" fill={fc.liquid} opacity="0.92" />
            <path d="M33 54 L38 60 L48 46" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <StatPill label="XP" value={`+${xpGained}`} color="#22d3ee" />
          <StatPill label="POINTS" value={`+${pointsGained}`} color="#a855f7" />
        </div>

        {outcome.multiplier && (
          <div className="mt-2 text-[11px] text-white/70 font-mono">
            chance multiplier · <span className="text-amber-300 font-bold">x{outcome.multiplier}</span>
          </div>
        )}

        <button
          data-testid="result-continue-btn"
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-black font-extrabold uppercase tracking-wider shadow-[0_10px_30px_-5px_rgba(245,158,11,0.7)] hover:-translate-y-0.5 transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const StatPill = ({ label, value, color }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
    <div className="text-[9px] uppercase tracking-widest text-white/50">{label}</div>
    <div className="text-base font-extrabold font-mono" style={{ color }}>{value}</div>
  </div>
);

/* ----- Side rail: Shiba assistant, combo hints, market feed ----- */

const ShibaAssistant = ({ tip, overload, selectedCount }) => {
  const message = useMemo(() => {
    if (overload > 80) return 'Whoa — chamber going CRITICAL. Big risk, big reward.';
    if (selectedCount === 0) return tip;
    if (selectedCount === 1) return 'Add one more — solo ingredients waste energy.';
    if (selectedCount >= 4) return 'Four+ ingredients = wild mutations incoming.';
    return tip;
  }, [tip, overload, selectedCount]);

  return (
    <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-3 flex gap-3 items-start" data-testid="shiba-assistant">
      <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-2 ring-amber-300/60">
        <Bot className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-300">Lab Assistant</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <p className="text-sm text-white/85 leading-snug">{message}</p>
      </div>
    </div>
  );
};

const ComboDiscoveryHint = ({ ingredients, selected }) => {
  const known = selected.length >= 2 && selected.length <= 3;
  return (
    <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent p-3" data-testid="combo-discovery">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-widest font-bold text-fuchsia-300">Combo Discovery</span>
      </div>
      <p className="text-xs text-white/75 leading-snug">
        {known
          ? 'Combos of 2–3 unlock community recipes. Some hide bonus XP and secret NFTs.'
          : 'Load 2 or more ingredients to start hunting community-discovered combos.'}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {ingredients.slice(0, 6).map((i) => (
          <span key={i.id} className="text-base opacity-60" title={i.name}>{ingredientMeta(i.id, i.name).emoji}</span>
        ))}
        <span className="text-[10px] text-white/40 font-mono">… {ingredients.length} known</span>
      </div>
    </div>
  );
};

const LiveMarketFeed = ({ items }) => (
  <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-3" data-testid="live-market-feed">
    <div className="flex items-center gap-2 mb-2">
      <TrendingUp className="w-4 h-4 text-cyan-300" />
      <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-300">Live Market</span>
      <span className="ml-auto text-[10px] font-mono text-emerald-300 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
      </span>
    </div>
    {items.length === 0 ? (
      <div className="text-[11px] text-white/40">Awaiting chain transactions…</div>
    ) : (
      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 hide-scrollbar">
        {items.slice(0, 8).map((it, i) => (
          <li key={i} className="text-[11px] text-white/80 truncate flex items-center gap-1.5">
            <span className="text-cyan-300 font-mono">›</span>
            <span className="truncate">{it.message || it.text || `${it.player || 'Scientist'} mixed something`}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);


/* ============================================================
   FLASK COLORS — rarity → liquid colour mapping
   Used by both BrewingTreatsPanel and ResultReveal
   ============================================================ */
const FLASK_COLORS = {
  Starter:   { liquid: '#f59e0b', glow: 'rgba(245,158,11,0.6)',  glass: 'rgba(245,158,11,0.12)', label: '#fbbf24' },
  Rare:      { liquid: '#38bdf8', glow: 'rgba(56,189,248,0.6)',  glass: 'rgba(56,189,248,0.12)',  label: '#7dd3fc' },
  Epic:      { liquid: '#a855f7', glow: 'rgba(168,85,247,0.65)', glass: 'rgba(168,85,247,0.12)', label: '#d8b4fe' },
  Legendary: { liquid: '#fbbf24', glow: 'rgba(251,191,36,0.7)',  glass: 'rgba(251,191,36,0.12)', label: '#fde68a' },
  Mythic:    { liquid: '#ec4899', glow: 'rgba(236,72,153,0.7)',  glass: 'rgba(236,72,153,0.12)', label: '#f9a8d4' },
  Common:    { liquid: '#9ca3af', glow: 'rgba(156,163,175,0.5)', glass: 'rgba(156,163,175,0.08)', label: '#d1d5db' },
};

function flaskColor(rarity) {
  return FLASK_COLORS[rarity] || FLASK_COLORS.Common;
}

function formatTimer(secs) {
  if (!secs || secs <= 0) return 'READY';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`;
  return `${s}s`;
}

/* ── Individual flask card ── */
const FlaskCard = ({ treat, onCollect, isCollecting }) => {
  const rarity = treat?.rarity || 'Common';
  const fc = flaskColor(rarity);
  const timerData = treat?.timer || {};
  const [secsLeft, setSecsLeft] = useState(timerData.remaining_seconds ?? 0);
  const totalSecs = timerData.total_duration || 3600;
  const isReady = secsLeft <= 0 || treat.brewing_status === 'ready';

  useEffect(() => {
    if (isReady) return;
    const interval = setInterval(() => {
      setSecsLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isReady]);

  const fillPct = isReady ? 100 : Math.max(8, Math.min(94, ((totalSecs - secsLeft) / totalSecs) * 100));
  const bubbling = !isReady && secsLeft > 0;
  const liquidY = 84 - (fillPct / 100) * 79; // SVG coords: top of fill inside flask

  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 8, padding: '12px 8px 10px',
      borderRadius: 20, border: `1px solid ${fc.liquid}44`,
      background: `radial-gradient(circle at 50% 0%, ${fc.glass}, rgba(5,3,13,0.93) 70%)`,
      boxShadow: isReady
        ? `0 0 24px ${fc.glow}, 0 0 6px ${fc.glow}`
        : `0 0 10px ${fc.glow}33`,
      minWidth: 95, flex: '1 1 90px', maxWidth: 125,
      transition: 'box-shadow 0.4s',
    }}>
      {/* Rarity badge */}
      <div style={{
        fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em',
        color: fc.label, background: `${fc.liquid}1e`, border: `1px solid ${fc.liquid}44`,
        borderRadius: 99, padding: '2px 8px',
      }}>{rarity}</div>

      {/* Flask */}
      <div style={{ position: 'relative', width: 60, height: 76 }}>
        <svg viewBox="0 0 64 84" width="60" height="76"
          style={{ filter: isReady ? `drop-shadow(0 0 8px ${fc.liquid})` : 'none', transition: 'filter 0.4s' }}>
          <defs>
            <clipPath id={`fc-${treat.id}`}>
              <path d="M22 4 L22 30 L7 60 Q5 68 13 70 L51 70 Q59 68 57 60 L42 30 L42 4 Z" />
            </clipPath>
            <linearGradient id={`fl-${treat.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fc.liquid} stopOpacity="0.92" />
              <stop offset="100%" stopColor={fc.liquid} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {/* Glass */}
          <path d="M22 4 L22 30 L7 60 Q5 68 13 70 L51 70 Q59 68 57 60 L42 30 L42 4 Z"
            fill="rgba(255,255,255,0.03)" stroke={`${fc.liquid}77`} strokeWidth="1.5" />
          <rect x="19" y="1" width="26" height="6" rx="2.5"
            fill={`${fc.liquid}33`} stroke={`${fc.liquid}77`} strokeWidth="1" />
          {/* Liquid */}
          <g clipPath={`url(#fc-${treat.id})`}>
            <rect x="0" y={liquidY} width="64" height="84"
              fill={`url(#fl-${treat.id})`}
              style={{ transition: 'y 1.2s ease-out' }} />
            {bubbling && (
              <ellipse cx="32" cy={liquidY}
                rx="18" ry="2.5" fill={fc.liquid} opacity="0.35"
                style={{ animation: 'liquid-bubble 1.6s ease-in-out infinite' }} />
            )}
          </g>
          {/* Bubbles */}
          {bubbling && [0,1,2].map(i => (
            <circle key={i} cx={20 + i * 10} cy={liquidY + 6 + i * 4}
              r={i + 1.2} fill={fc.liquid} opacity="0.65"
              style={{ animation: `float-bub ${1.4 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }} />
          ))}
          {/* Shine */}
          <path d="M25 7 L25 28 L13 54"
            stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Ready check */}
          {isReady && (
            <g>
              <circle cx="32" cy="44" r="10" fill={fc.liquid} opacity="0.95" />
              <path d="M27 44 L31 48 L38 37"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          )}
        </svg>
        {/* Ready pulse ring */}
        {isReady && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: `2px solid ${fc.liquid}66`,
            animation: 'rarity-pulse 1.6s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.82)',
        textAlign: 'center', lineHeight: 1.3, maxWidth: 88,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{treat.name || `${rarity} Treat`}</div>

      {/* Timer / Collect */}
      {isReady ? (
        <button
          onClick={() => onCollect(treat.id)}
          disabled={isCollecting}
          style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: isCollecting ? 'wait' : 'pointer',
            background: isCollecting ? 'rgba(255,255,255,0.08)'
              : `linear-gradient(135deg, ${fc.liquid}ee, ${fc.liquid}99)`,
            color: isCollecting ? 'rgba(255,255,255,0.3)' : '#000',
            border: 'none',
            boxShadow: isCollecting ? 'none' : `0 4px 14px ${fc.glow}`,
            transition: 'all 0.2s',
          }}
        >{isCollecting ? '…' : 'Collect'}</button>
      ) : (
        <div style={{
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
          color: fc.label, letterSpacing: '0.05em',
          padding: '4px 10px', borderRadius: 99,
          background: `${fc.liquid}18`, border: `1px solid ${fc.liquid}33`,
        }}>{formatTimer(secsLeft)}</div>
      )}

      {/* Points badge */}
      {treat.points_reward > 0 && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: 8, fontWeight: 800, color: '#fbbf24',
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
          borderRadius: 99, padding: '1px 5px',
        }}>+{treat.points_reward}pts</div>
      )}
    </div>
  );
};

/* ── Brewing panel ── */
const BrewingTreatsPanel = ({ treats, onCollect, collectingId }) => {
  const readyCount = treats.filter(t =>
    (t?.timer?.remaining_seconds ?? 0) <= 0 || t.brewing_status === 'ready'
  ).length;

  return (
    <section data-testid="brewing-treats-panel" style={{
      borderRadius: 24,
      border: '1px solid rgba(56,189,248,0.18)',
      background: 'linear-gradient(135deg, rgba(10,8,32,0.95), rgba(6,4,22,0.98))',
      padding: 16,
      boxShadow: readyCount > 0
        ? '0 0 36px rgba(56,189,248,0.18), inset 0 0 36px rgba(56,189,248,0.03)'
        : '0 8px 28px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: readyCount > 0 ? '#4ade80' : '#f59e0b',
            boxShadow: readyCount > 0 ? '0 0 8px #4ade80' : '0 0 8px #f59e0b',
            animation: 'rarity-pulse 1.6s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em',
            fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)',
          }}>Reactor Output</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {readyCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 99,
              background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)',
              color: '#4ade80', letterSpacing: '0.1em',
            }}>{readyCount} READY</span>
          )}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            {treats.length} active
          </span>
        </div>
      </div>
      {/* Flasks */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        justifyContent: treats.length <= 3 ? 'center' : 'flex-start',
      }}>
        {treats.map(treat => (
          <FlaskCard
            key={treat.id}
            treat={treat}
            onCollect={onCollect}
            isCollecting={collectingId === treat.id}
          />
        ))}
      </div>
    </section>
  );
};

/* ── Collect result toast — FIXED: fully centered, no overflow ── */
const CollectResultToast = ({ result, onClose }) => {
  const rewards = result?.rewards || {};
  const pts  = rewards.total_points ?? rewards.points ?? 0;
  const xp   = rewards.total_xp   ?? rewards.xp    ?? 0;
  const happyHourBonus = rewards.happy_hour_bonus ?? 0;
  const leveledUp = result?.leveled_up;
  const newLevel  = result?.new_level;

  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        /* center both axes — no translateX trick that clips on narrow screens */
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 104,            /* clears the bottom mix bar */
        zIndex: 130,
        pointerEvents: 'none',         /* let touches pass through background */
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          pointerEvents: 'auto',
          width: 'calc(100% - 32px)', maxWidth: 320,
          borderRadius: 20, padding: '16px 18px',
          background: 'linear-gradient(135deg, rgba(10,8,32,0.98), rgba(6,4,22,0.98))',
          border: '1px solid rgba(74,222,128,0.45)',
          boxShadow: '0 20px 60px rgba(74,222,128,0.2)',
          animation: 'result-pop 0.45s cubic-bezier(.2,.9,.3,1.15) both',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🧪</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: '#4ade80',
              textTransform: 'uppercase', letterSpacing: '0.15em',
            }}>Treat Collected!</div>
            {leveledUp && (
              <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, marginTop: 2 }}>
                ⬆ Level Up! Now Level {newLevel}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        {/* Reward pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, borderRadius: 12, padding: '8px 0', textAlign: 'center',
            background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.22)',
          }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>XP</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: '#22d3ee', lineHeight: 1.1 }}>+{xp}</div>
          </div>
          <div style={{
            flex: 1, borderRadius: 12, padding: '8px 0', textAlign: 'center',
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)',
          }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>Points</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: '#a855f7', lineHeight: 1.1 }}>+{pts}</div>
          </div>
          {happyHourBonus > 0 && (
            <div style={{
              flex: 1, borderRadius: 12, padding: '8px 0', textAlign: 'center',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)',
            }}>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>Bonus</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: '#fbbf24', lineHeight: 1.1 }}>+{happyHourBonus}🔥</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



/* ----- Character Selection ----- */

const CharacterSelectionScreen = ({ characters, pending, onPick, onConfirm, selecting, onBack }) => (
  <div
    data-testid="character-selection-screen"
    className="min-h-screen relative bg-[#05030d] text-white overflow-auto"
  >
    <LabBackdrop />
    <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-cyan-200/80 hover:text-white text-sm font-semibold mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Menu
      </button>

      <div className="text-center mb-8">
        <div className="text-[10px] tracking-[0.3em] text-cyan-300/80 font-mono uppercase">Initiate Protocol</div>
        <h1
          className="text-3xl sm:text-5xl font-extrabold mt-1 bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Choose Your Scientist
        </h1>
        <p className="text-sm sm:text-base text-white/70 mt-2">
          Select your character to begin your DogeFood Lab adventure
        </p>
        <p className="text-xs text-amber-300/90 font-semibold mt-1">
          ⚠ This choice is permanent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-8">
        {characters.map((c) => {
          const active = pending?.id === c.id;
          return (
            <button
              key={c.id}
              data-testid={`character-card-${c.id}`}
              onClick={() => onPick(c)}
              className={classNames(
                'relative text-left rounded-3xl border-2 p-4 sm:p-5 transition-all',
                'bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur',
                active ? '-translate-y-1' : 'hover:-translate-y-0.5'
              )}
              style={{
                borderColor: active ? c.accent : 'rgba(255,255,255,0.1)',
                boxShadow: active
                  ? `0 30px 60px -10px ${c.accent}66, 0 0 0 4px ${c.accent}22`
                  : '0 12px 30px -10px rgba(0,0,0,0.4)',
              }}
            >
              <div
                className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 shadow-lg"
                style={{ borderColor: c.accent, boxShadow: `0 0 18px ${c.accent}66` }}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <h3 className="mt-3 text-center text-lg font-extrabold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                {c.name}
              </h3>
              <p className="text-center text-xs font-semibold mt-0.5" style={{ color: c.accent }}>
                {c.description}
              </p>
              <p className="mt-2 text-xs text-white/70 leading-snug text-center">{c.personality}</p>

              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {c.traits.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    style={{ background: `${c.accent}1a`, borderColor: `${c.accent}55`, color: c.accent }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div
                className="mt-3 rounded-xl px-3 py-2 text-center text-[11px] font-bold"
                style={{ background: `${c.accent}1f`, border: `1px solid ${c.accent}55`, color: '#fff' }}
              >
                ★ {c.bonus}
              </div>

              {active && (
                <div
                  className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-black font-bold shadow"
                  style={{ background: c.accent }}
                >
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-center">
        <button
          data-testid="character-confirm-btn"
          onClick={() => pending && onConfirm(pending)}
          disabled={!pending || selecting}
          className={classNames(
            'inline-flex items-center justify-center px-6 sm:px-10 py-3 sm:py-4 rounded-2xl text-sm sm:text-base font-extrabold uppercase tracking-wider transition-all',
            pending && !selecting
              ? 'text-black bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 shadow-[0_15px_40px_-10px_rgba(245,158,11,0.7)] hover:-translate-y-0.5'
              : 'text-white/40 bg-white/5 border border-white/10 cursor-not-allowed'
          )}
        >
          {selecting
            ? 'Selecting…'
            : pending
              ? `Start Adventure with ${pending.name.split(' ')[2]}`
              : 'Please select a character'}
        </button>
      </div>
    </div>
    <LabStyles />
  </div>
);

/* ----- Backdrop ----- */

const LabBackdrop = () => (
  <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
    <div className="absolute inset-0 lab-grid opacity-20" />
    <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
    <div className="absolute -top-20 -right-32 w-96 h-96 rounded-full bg-fuchsia-500/15 blur-3xl" />
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-96 rounded-full bg-amber-500/10 blur-3xl" />
    <div className="absolute inset-0 lab-noise opacity-[0.04] mix-blend-overlay" />
    {/* hex grid silhouette */}
    <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hex" width="40" height="46" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
          <polygon points="20,2 38,12 38,34 20,44 2,34 2,12" fill="none" stroke="white" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  </div>
);

/* ----- Styles ----- */

const LabStyles = () => (
  <style>{`
    @keyframes spin-slow { to { transform: rotate(360deg); } }
    @keyframes spin-slow-reverse { to { transform: rotate(-360deg); } }
    .animate-spin-slow { animation: spin-slow 14s linear infinite; }
    .animate-spin-slower { animation: spin-slow 22s linear infinite; }
    .animate-spin-slow-reverse { animation: spin-slow-reverse 18s linear infinite; }

    @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
    .animate-shimmer { animation: shimmer 2.4s linear infinite; }

    @keyframes mix-shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(150%); } }
    .animate-mix-shimmer { animation: mix-shimmer 1.8s linear infinite; }

    @keyframes liquid-bubble {
      0%,100% { transform: scaleY(1); }
      50%    { transform: scaleY(1.05) translateY(-2%); }
    }
    .animate-liquid-bubble { animation: liquid-bubble 1.6s ease-in-out infinite; transform-origin: bottom; }

    @keyframes float-bub {
      0%   { transform: translateY(0)    scale(1);   opacity: 0.9; }
      80%  { transform: translateY(-40px) scale(1.2); opacity: 1; }
      100% { transform: translateY(-46px) scale(0.5); opacity: 0; }
    }
    .animate-float-bub { animation: float-bub 2.2s ease-in-out infinite; }

    @keyframes screen-shake {
      0%,100% { transform: translate(0,0); }
      15%     { transform: translate(-2px, 1px); }
      30%     { transform: translate(2px, -1px); }
      45%     { transform: translate(-1px, 2px); }
      60%     { transform: translate(1px, -2px); }
      75%     { transform: translate(-2px, -1px); }
    }
    .animate-screen-shake { animation: screen-shake .55s ease-in-out 1; }

    @keyframes rainbow-flash {
      0%,100% { background: transparent; }
      30%    { background: radial-gradient(circle at center, rgba(245,158,11,.3), transparent 60%); }
      60%    { background: radial-gradient(circle at center, rgba(168,85,247,.3), transparent 60%); }
    }
    .animate-rainbow-flash { animation: rainbow-flash 1.2s ease-out 1; }

    @keyframes rarity-pulse {
      0%,100% { transform: scale(1);   opacity: .7; }
      50%     { transform: scale(1.08); opacity: 1; }
    }
    .animate-rarity-pulse { animation: rarity-pulse 1.6s ease-in-out infinite; }

    @keyframes result-pop {
      0%   { transform: translateY(24px) scale(.92); opacity: 0; }
      60%  { transform: translateY(-4px) scale(1.02); opacity: 1; }
      100% { transform: translateY(0)    scale(1);    opacity: 1; }
    }
    .animate-result-pop { animation: result-pop .55s cubic-bezier(.2,.9,.3,1.15) both; }

    .lab-grid {
      background-image:
        linear-gradient(to right, rgba(56,189,248,0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(56,189,248,0.08) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    .lab-scanline {
      background: repeating-linear-gradient(
        to bottom,
        rgba(255,255,255,0) 0,
        rgba(255,255,255,0) 3px,
        rgba(255,255,255,0.025) 4px
      );
    }
    .lab-noise {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
    }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    @media (prefers-reduced-motion: reduce) {
      .animate-spin-slow,
      .animate-spin-slower,
      .animate-spin-slow-reverse,
      .animate-shimmer,
      .animate-mix-shimmer,
      .animate-liquid-bubble,
      .animate-float-bub,
      .animate-screen-shake,
      .animate-rainbow-flash,
      .animate-rarity-pulse,
      .animate-result-pop { animation: none !important; }
    }
  `}</style>
);
