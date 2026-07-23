import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useTelegram } from '../contexts/TelegramContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import LabInlineLoader from './LabInlineLoader';
import { 
  ArrowLeft, 
  Store, 
  Filter, 
  Search, 
  Tag, 
  ChevronDown,
  X,
  CircleDot,
  Clock,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/* ============================================================
   RARITY IMAGE MAP  (mirrors MyTreats / SeasonTwoLab)
   ============================================================ */
const RARITY_IMAGES = {
  mythic:    '/Mythic.png',
  legendary: '/Legendary.png',
  epic:      '/Epic.png',
  rare:      '/Rare.png',
  uncommon:  '/uncommon.png',
  common:    '/Common.png',
};

/**
 * Season 2 ingredients are prefixed with "S2_" (e.g. S2_001).
 * Season 1 ingredients use "ING" prefix (e.g. ING101).
 * This is the most reliable signal — it's baked into the listing data itself.
 */
function isSeasonTwo(listing) {
  const ings = listing.treat_ingredients || [];
  return ings.length > 0 && ings.some(ing => ing.startsWith('S2_'));
}

/**
 * Returns the correct display image for a marketplace listing.
 * - Season 2 treats → use rarity PNG from /public
 * - Season 1 treats → keep the original treat_image (cereal box Shiba art)
 */
function getListingImage(listing) {
  if (isSeasonTwo(listing)) {
    const key = (listing.treat_rarity || 'common').toLowerCase();
    return RARITY_IMAGES[key] || RARITY_IMAGES.common;
  }
  return listing.treat_image || null;
}

/* ============================================================
   RARITY STYLE CONFIG
   ============================================================ */
const RARITY_STYLE = {
  mythic:    { hex: '#ec4899', glow: 'rgba(236,72,153,0.5)',  border: 'rgba(236,72,153,0.55)', badge: 'linear-gradient(135deg,#f43f5e,#ec4899)', label: '#f9a8d4', icon: 'M', cls: 'text-rose-400'   },
  legendary: { hex: '#fbbf24', glow: 'rgba(251,191,36,0.5)',  border: 'rgba(251,191,36,0.5)',  badge: 'linear-gradient(135deg,#f59e0b,#fbbf24)', label: '#fde68a', icon: 'L', cls: 'text-amber-400'  },
  epic:      { hex: '#a855f7', glow: 'rgba(168,85,247,0.5)',  border: 'rgba(168,85,247,0.5)',  badge: 'linear-gradient(135deg,#7c3aed,#a855f7)', label: '#d8b4fe', icon: 'E', cls: 'text-purple-400' },
  rare:      { hex: '#38bdf8', glow: 'rgba(56,189,248,0.5)',  border: 'rgba(56,189,248,0.45)', badge: 'linear-gradient(135deg,#0284c7,#38bdf8)', label: '#7dd3fc', icon: 'R', cls: 'text-sky-400'    },
  uncommon:  { hex: '#2dd4bf', glow: 'rgba(45,212,191,0.45)', border: 'rgba(45,212,191,0.4)',  badge: 'linear-gradient(135deg,#0d9488,#2dd4bf)', label: '#99f6e4', icon: 'U', cls: 'text-teal-400'   },
  common:    { hex: '#4ade80', glow: 'rgba(74,222,128,0.35)', border: 'rgba(74,222,128,0.25)', badge: 'linear-gradient(135deg,#16a34a,#4ade80)', label: '#bbf7d0', icon: 'C', cls: 'text-green-400'  },
};

function getRarityStyle(rarity) {
  return RARITY_STYLE[(rarity || 'common').toLowerCase()] || RARITY_STYLE.common;
}

/* ============================================================
   NFT-STYLE LISTING CARD
   ============================================================ */
const ListingCard = ({ listing, ingredientMap, onBuy }) => {
  const [hovered, setHovered] = useState(false);
  const cfg  = getRarityStyle(listing.treat_rarity);
  const img  = getListingImage(listing);
  const isS2 = isSeasonTwo(listing);

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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Square image area ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '100%',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 60%, ${cfg.glow.replace(/[\d.]+\)$/, '0.12)')} 0%, #080c14 70%)`,
        flexShrink: 0,
      }}>
        {/* Corner accents */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 36, height: 36,
          borderTop: `2px solid ${cfg.hex}`, borderLeft: `2px solid ${cfg.hex}`,
          borderTopLeftRadius: 15,
          opacity: hovered ? 1 : 0.35, transition: 'opacity 0.2s', zIndex: 3,
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: 0, width: 36, height: 36,
          borderBottom: `2px solid ${cfg.hex}`, borderRight: `2px solid ${cfg.hex}`,
          borderBottomRightRadius: 15,
          opacity: hovered ? 1 : 0.35, transition: 'opacity 0.2s', zIndex: 3,
        }} />

        {/* Rarity badge — top left */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: cfg.badge, borderRadius: 7,
          padding: '3px 9px', fontSize: 9, fontWeight: 900,
          color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase',
          zIndex: 4, boxShadow: `0 2px 8px ${cfg.glow}`,
        }}>
          {cfg.icon} {listing.treat_rarity || 'Common'}
        </div>

        {/* Season badge — top right */}
        {isS2 && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
            padding: '2px 7px', fontSize: 9, fontWeight: 700,
            color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em', zIndex: 4,
          }}>S2</div>
        )}

        {/* Image */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Glow disc */}
          <div style={{
            position: 'absolute', width: '55%', height: '55%', borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
            opacity: hovered ? 1 : 0.45, transition: 'opacity 0.3s', filter: 'blur(10px)',
          }} />
          {img ? (
            <img
              src={img}
              alt={listing.treat_name}
              onError={(e) => { e.target.src = '/Common.png'; }}
              style={{
                width: isS2 ? '70%' : '80%',
                height: isS2 ? '70%' : '80%',
                objectFit: 'contain',
                position: 'relative', zIndex: 2,
                transform: hovered ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.3s ease-out',
                filter: hovered
                  ? `drop-shadow(0 0 14px ${cfg.hex})`
                  : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: cfg.badge, opacity: 0.5, zIndex: 2,
            }} />
          )}
        </div>

        {/* Hover shine sweep */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)',
          transform: hovered ? 'translateX(100%)' : 'translateX(-100%)',
          transition: 'transform 0.55s ease-out',
        }} />
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '12px 13px 13px',
        display: 'flex', flexDirection: 'column', gap: 9, flex: 1,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Name */}
        <div style={{
          fontSize: 12, fontWeight: 700, color: '#e2e8f0',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {listing.treat_name || 'Mysterious Treat'}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7,
            padding: '5px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: cfg.hex, lineHeight: 1 }}>
              {listing.treat_points_reward || 0}
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PTS</div>
          </div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7,
            padding: '5px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>
              {listing.treat_xp_reward || 0}
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>XP</div>
          </div>
        </div>

        {/* Ingredients */}
        {listing.treat_ingredients && listing.treat_ingredients.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {listing.treat_ingredients.slice(0, 3).map((ing, i) => (
              <span key={i} style={{
                fontSize: 8, background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                padding: '2px 5px', color: 'rgba(255,255,255,0.45)',
              }}>
                {getIngredientName(ing)}
              </span>
            ))}
            {listing.treat_ingredients.length > 3 && (
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', padding: '2px 3px' }}>
                +{listing.treat_ingredients.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Prices */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {listing.price_doge && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>DOGE</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
                {listing.price_doge.toLocaleString()}
              </span>
            </div>
          )}
          {listing.price_lab && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>$LAB</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                {listing.price_lab.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Seller */}
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
          by {listing.seller_nickname || `${listing.seller_address?.slice(0, 6)}...${listing.seller_address?.slice(-4)}`}
        </div>

        {/* Buy button */}
        <button
          onClick={() => onBuy(listing)}
          disabled
          style={{
            width: '100%', padding: '8px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.3)',
            cursor: 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          <Clock size={10} />
          Coming Soon
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   MARKETPLACE PAGE
   ============================================================ */
const Marketplace = () => {
  const { isConnected, address } = useAccount();
  const { isTelegram, telegramUser } = useTelegram();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [ingredientMap, setIngredientMap] = useState({});

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  const effectiveAddress = isTelegram && telegramUser
    ? `TG_${telegramUser.id}`
    : address;

  const rarities = ['all', 'mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
  const sortOptions = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'oldest',     label: 'Oldest First' },
    { value: 'price_low',  label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
  ];

  // Fetch ingredients catalog
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ingredients/catalog`);
        if (response.ok) {
          const data = await response.json();
          const ingMap = {};
          (data.ingredients || []).forEach(ing => { ingMap[ing.id] = ing.name; });
          setIngredientMap(ingMap);
        }
      } catch (err) {
        console.error('Error fetching ingredients:', err);
      }
    };
    fetchIngredients();
  }, []);

  // Fetch marketplace listings
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRarity !== 'all') params.append('rarity', selectedRarity);
      params.append('sort_by', sortBy);
      if (priceRange.min) params.append('min_price_doge', priceRange.min);
      if (priceRange.max) params.append('max_price_doge', priceRange.max);

      const response = await fetch(`${BACKEND_URL}/api/marketplace/listings?${params}`);
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRarity, sortBy, priceRange]);

  // Fetch marketplace stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/marketplace/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Client-side search filter
  const filteredListings = listings.filter(listing => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.treat_name?.toLowerCase().includes(query) ||
      listing.seller_nickname?.toLowerCase().includes(query)
    );
  });

  const handleBuy = (listing) => {
    alert('Trading is not live yet. Stay tuned for $LAB token launch!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" data-testid="marketplace-page">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-sky-500/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-sky-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-sky-400 bg-clip-text text-transparent">
                Marketplace
              </h1>
            </div>
          </div>

          {/* Stats Pills */}
          <div className="hidden md:flex items-center gap-3">
            <div className="px-3 py-1 bg-sky-500/20 rounded-full text-xs">
              <span className="text-slate-400">Listings:</span>
              <span className="text-sky-400 font-bold ml-1">{stats?.active_listings || 0}</span>
            </div>
            <div className="px-3 py-1 bg-yellow-500/20 rounded-full text-xs">
              <span className="text-slate-400">Fee:</span>
              <span className="text-yellow-400 font-bold ml-1">{stats?.marketplace_fee || 0.420} DOGE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Trading Not Live Banner */}
      <div className="bg-gradient-to-r from-yellow-500/20 via-sky-500/20 to-yellow-500/20 border-b border-yellow-500/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-200">
            <span className="font-bold">Trading Coming Soon!</span> List your treats now. Buying enabled when $LAB launches.
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search treats or sellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              data-testid="marketplace-search"
            />
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="border-sky-500/50 text-sky-400 hover:bg-sky-500/20"
            data-testid="filter-toggle-btn"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-testid="sort-select"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Rarity</label>
                <div className="flex flex-wrap gap-2">
                  {rarities.map(rarity => {
                    const cfg = rarity === 'all' ? null : getRarityStyle(rarity);
                    const isActive = selectedRarity === rarity;
                    return (
                      <button
                        key={rarity}
                        onClick={() => setSelectedRarity(rarity)}
                        style={isActive && cfg ? {
                          background: cfg.badge, color: '#fff',
                          border: `1px solid ${cfg.border}`,
                          boxShadow: `0 0 8px ${cfg.glow}`,
                        } : {}}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isActive
                            ? rarity === 'all' ? 'bg-white text-slate-900' : ''
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                        }`}
                        data-testid={`filter-rarity-${rarity}`}
                      >
                        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Price Range (DOGE)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="w-24 bg-slate-700/50 border-slate-600 text-white text-sm"
                    data-testid="filter-price-min"
                  />
                  <span className="text-slate-500">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="w-24 bg-slate-700/50 border-slate-600 text-white text-sm"
                    data-testid="filter-price-max"
                  />
                  <Button
                    onClick={() => setPriceRange({ min: '', max: '' })}
                    variant="ghost" size="sm" className="text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">
            {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} found
          </p>
          <Link to="/nfts">
            <Button variant="outline" size="sm" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20">
              <Tag className="w-4 h-4 mr-2" />
              List Your Treats
            </Button>
          </Link>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <LabInlineLoader message="Fetching listings…" />
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                ingredientMap={ingredientMap}
                onBuy={handleBuy}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Store className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No Listings Yet</h3>
            <p className="text-slate-500 mb-6">Be the first to list your treats on the marketplace!</p>
            <Link to="/nfts">
              <Button className="bg-gradient-to-r from-yellow-500 to-sky-500 text-slate-900 font-bold">
                <CircleDot className="w-4 h-4 mr-2" />
                List a Treat
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;
