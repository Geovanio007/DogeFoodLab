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

function getTreatImage(rarity) {
  return RARITY_IMAGES[getRarityKey(rarity)] || RARITY_IMAGES.common;
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
  const img   = getTreatImage(treat?.rarity);
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

// Glass Treat Card Component
const TreatCard = ({ treat, index, ingredientMap = {}, onListForSale, isListed = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Helper to get ingredient name from ID
  const getIngredientName = (ing) => {
    // If it's an ID like "ING001", look it up in the map
    if (ing && ing.startsWith('ING')) {
      return ingredientMap[ing] || ing;
    }
    // Otherwise return as-is (already a name)
    return ing;
  };
  
  const getRarityConfig = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'mythic':
        return {
          gradient: 'from-rose-400 via-pink-500 to-red-500',
          glow: 'shadow-rose-400/40',
          border: 'border-rose-400/60',
          bg: 'from-rose-500/15 to-pink-500/10',
          text: 'text-rose-400',
          icon: 'M',
          shine: 'bg-gradient-to-r from-transparent via-rose-200/40 to-transparent'
        };
      case 'legendary':
        return {
          gradient: 'from-amber-400 via-yellow-300 to-amber-500',
          glow: 'shadow-amber-400/30',
          border: 'border-amber-400/50',
          bg: 'from-amber-500/10 to-yellow-500/5',
          text: 'text-amber-400',
          icon: 'L',
          shine: 'bg-gradient-to-r from-transparent via-amber-200/30 to-transparent'
        };
      case 'epic':
        return {
          gradient: 'from-purple-400 via-pink-400 to-purple-500',
          glow: 'shadow-purple-400/30',
          border: 'border-purple-400/50',
          bg: 'from-purple-500/10 to-pink-500/5',
          text: 'text-purple-400',
          icon: 'E',
          shine: 'bg-gradient-to-r from-transparent via-purple-200/30 to-transparent'
        };
      case 'rare':
        return {
          gradient: 'from-blue-400 via-cyan-400 to-blue-500',
          glow: 'shadow-blue-400/30',
          border: 'border-blue-400/50',
          bg: 'from-blue-500/10 to-cyan-500/5',
          text: 'text-blue-400',
          icon: 'R',
          shine: 'bg-gradient-to-r from-transparent via-blue-200/30 to-transparent'
        };
      case 'uncommon':
        return {
          gradient: 'from-cyan-400 via-teal-400 to-cyan-500',
          glow: 'shadow-cyan-400/25',
          border: 'border-cyan-400/40',
          bg: 'from-cyan-500/10 to-teal-500/5',
          text: 'text-cyan-400',
          icon: 'U',
          shine: 'bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent'
        };
      default:
        return {
          gradient: 'from-green-400 via-emerald-400 to-green-500',
          glow: 'shadow-green-400/20',
          border: 'border-green-400/30',
          bg: 'from-green-500/10 to-emerald-500/5',
          text: 'text-green-400',
          icon: 'C',
          shine: 'bg-gradient-to-r from-transparent via-green-200/20 to-transparent'
        };
    }
  };
  
  const config = getRarityConfig(treat.rarity);
  
  return (
    <div
      className={`
        relative group cursor-pointer
        transform transition-all duration-500 ease-out
        ${isHovered ? 'scale-[1.02] -translate-y-1' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Glow Effect */}
      <div className={`
        absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
        bg-gradient-to-r ${config.gradient} blur-xl
      `} />
      
      {/* Card */}
      <div className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br ${config.bg}
        backdrop-blur-xl border ${config.border}
        ${isHovered ? `shadow-2xl ${config.glow}` : 'shadow-lg'}
        transition-all duration-500
      `}>
        {/* Shine Effect */}
        <div className={`
          absolute inset-0 ${config.shine}
          transform -skew-x-12 -translate-x-full group-hover:translate-x-full
          transition-transform duration-1000 ease-out
        `} />
        
        {/* Glass Overlay */}
        <div className="absolute inset-0 bg-white/5" />
        
        {/* Content */}
        <div className="relative p-4">
          {/* Rarity Badge */}
          <div className="flex justify-between items-start mb-3">
            <Badge className={`
              bg-gradient-to-r ${config.gradient} text-white font-bold
              px-3 py-1 rounded-full text-xs shadow-lg
            `}>
              {config.icon} {treat.rarity || 'Common'}
            </Badge>
            {treat.season_id && (
              <Badge className="bg-slate-800/80 text-slate-300 border border-slate-600/50 text-xs">
                S{treat.season_id}
              </Badge>
            )}
          </div>
          
          {/* Treat Image — Season 2 rarity-specific art */}
          <div className="relative w-full aspect-square mb-4 flex items-center justify-center">
            <div className={`
              absolute inset-0 rounded-xl bg-gradient-to-br ${config.bg}
              opacity-50
            `} />
            {/* Glow pulse on hover */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ boxShadow: `inset 0 0 40px ${config.glowColor || 'rgba(255,255,255,0.1)'}` }}
            />
            <img
              src={getTreatImage(treat.rarity)}
              alt={treat.name || 'DogeFood Treat'}
              className="relative w-24 h-24 object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500"
              onError={(e) => { e.target.src = '/Common.png'; }}
            />
          </div>
          
          {/* Treat Info */}
          <div className="text-center">
            <h3 className="font-bold text-white text-lg mb-1 truncate">
              {treat.name || 'Mysterious Treat'}
            </h3>
            
            {/* Stats Row */}
            <div className="flex justify-center gap-4 mt-3">
              <div className="text-center">
                <div className={`text-lg font-bold ${config.text}`}>
                  {treat.points_reward || treat.points || 0}
                </div>
                <div className="text-xs text-slate-400">Points</div>
              </div>
              <div className="w-px bg-slate-600/50" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">
                  {treat.xp_reward || treat.xp || 0}
                </div>
                <div className="text-xs text-slate-400">XP</div>
              </div>
            </div>
          </div>
          
          {/* Ingredients */}
          {treat.ingredients && treat.ingredients.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-slate-400 mb-1.5 text-center">Ingredients:</div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {treat.ingredients.slice(0, 4).map((ing, i) => (
                  <span key={i} className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                    {getIngredientName(ing)}
                  </span>
                ))}
                {treat.ingredients.length > 4 && (
                  <span className="text-xs text-slate-400 px-2 py-0.5">+{treat.ingredients.length - 4} more</span>
                )}
              </div>
            </div>
          )}
          
          {/* Creation Date */}
          {treat.created_at && (
            <div className="mt-2 text-center">
              <span className="text-xs text-slate-500">
                {new Date(treat.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {/* List for Sale Button / Listed Badge */}
          <div className="mt-3 pt-3 border-t border-white/10">
            {isListed ? (
              <div className="flex items-center justify-center gap-2 py-2 px-3 bg-sky-500/20 rounded-lg border border-sky-500/30">
                <Store className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-medium text-sky-400">Listed on Marketplace</span>
              </div>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onListForSale && onListForSale(treat);
                }}
                className="w-full bg-gradient-to-r from-yellow-500/20 to-sky-500/20 hover:from-yellow-500/30 hover:to-sky-500/30 text-white text-xs border border-yellow-500/30 hover:border-sky-500/50"
                size="sm"
                data-testid={`list-btn-${treat.id}`}
              >
                <Tag className="w-3 h-3 mr-1" />
                List for Sale
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, value, label, color = 'green', subtext }) => (
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
        w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center
        bg-${color}-500/20 text-${color}-400
      `}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-2xl sm:text-3xl font-bold text-${color}-400`}>
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
        
        const [playerResponse, treatsResponse, ingredientsResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/api/player/${effectiveAddress}`),
          fetch(`${BACKEND_URL}/api/treats/${effectiveAddress}`),
          fetch(`${BACKEND_URL}/api/ingredients/catalog`)
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
          if (dispatch) {
            dispatch({ type: 'SET_NFT_HOLDER', payload: playerData.is_nft_holder === true });
            dispatch({ type: 'LOAD_PLAYER_DATA', payload: {
              level: playerData.level || 1,
              experience: playerData.experience || 0,
              points: playerData.points || 0
            }});
          }
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
            value="0.00" 
            label="$LAB Tokens" 
            color="blue"
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
