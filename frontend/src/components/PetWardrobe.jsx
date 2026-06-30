import React, { useState, useEffect, useCallback } from 'react';
import COSMETIC_LAYERS from './ShibaCosmetics';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://dogefood-lab-api.onrender.com';

const RARITY_COLORS = {
  Common:    '#94a3b8',
  Uncommon:  '#34d399',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
  Mythic:    '#f97316',
};

const CATEGORIES = [
  { id: 'all',   label: 'All',     icon: '🧳' },
  { id: 'head',  label: 'Head',    icon: '🎩' },
  { id: 'face',  label: 'Face',    icon: '🕶️' },
  { id: 'body',  label: 'Body',    icon: '👕' },
  { id: 'neck',  label: 'Neck',    icon: '📿' },
  { id: 'back',  label: 'Back',    icon: '🎒' },
  { id: 'aura',  label: 'Aura',    icon: '🌟' },
];

// Built-in cosmetic catalogue (unlocked via crates)
export const COSMETIC_CATALOGUE = [
  // Head
  { id: 'cap_basic',       name: 'Lab Cap',          category: 'head', rarity: 'Common',    icon: '🧢', effect: null },
  { id: 'goggles_lab',     name: 'Lab Goggles',      category: 'head', rarity: 'Rare',      icon: '🥽', effect: null },
  { id: 'crown_gold',      name: 'Gold Crown',       category: 'head', rarity: 'Epic',      icon: '👑', effect: 'glow' },
  { id: 'helmet_astro',    name: 'Astro Helmet',     category: 'head', rarity: 'Epic',      icon: '🪖', effect: null },
  { id: 'crown_mythic',    name: 'Mythic Crown',     category: 'head', rarity: 'Mythic',    icon: '💎', effect: 'pulse' },
  // Face
  { id: 'glasses_nerd',    name: 'Nerd Glasses',     category: 'face', rarity: 'Common',    icon: '🤓', effect: null },
  { id: 'monocle_laser',   name: 'Laser Monocle',    category: 'face', rarity: 'Rare',      icon: '🔭', effect: null },
  { id: 'mask_cyber',      name: 'Cyber Mask',       category: 'face', rarity: 'Epic',      icon: '😷', effect: 'glow' },
  { id: 'visor_elite',     name: 'Elite Visor',      category: 'face', rarity: 'Legendary', icon: '😎', effect: 'pulse' },
  // Body
  { id: 'coat_lab',        name: 'Lab Coat',         category: 'body', rarity: 'Common',    icon: '🥼', effect: null },
  { id: 'hoodie_doge',     name: 'Doge Hoodie',      category: 'body', rarity: 'Uncommon',  icon: '👕', effect: null },
  { id: 'jacket_cyber',    name: 'Cyber Jacket',     category: 'body', rarity: 'Rare',      icon: '🧥', effect: null },
  { id: 'armor_reactor',   name: 'Reactor Armor',    category: 'body', rarity: 'Epic',      icon: '🛡️', effect: 'glow' },
  { id: 'suit_scientist',  name: 'Scientist Suit',   category: 'body', rarity: 'Mythic',    icon: '🦺', effect: 'pulse' },
  // Neck
  { id: 'chain_gold',      name: 'Gold Chain',       category: 'neck', rarity: 'Uncommon',  icon: '📿', effect: null },
  { id: 'collar_lab',      name: 'Lab Collar',       category: 'neck', rarity: 'Common',    icon: '🔵', effect: null },
  { id: 'medal_champion',  name: 'Champion Medal',   category: 'neck', rarity: 'Legendary', icon: '🥇', effect: 'glow' },
  // Back
  { id: 'wings_angel',     name: 'Angel Wings',      category: 'back', rarity: 'Epic',      icon: '🪽', effect: null },
  { id: 'jetpack_rocket',  name: 'Rocket Jetpack',   category: 'back', rarity: 'Legendary', icon: '🚀', effect: 'glow' },
  { id: 'cape_mythic',     name: 'Mythic Cape',      category: 'back', rarity: 'Mythic',    icon: '🦸', effect: 'pulse' },
  // Aura
  { id: 'aura_fire',       name: 'Fire Aura',        category: 'aura', rarity: 'Rare',      icon: '🔥', effect: 'fire' },
  { id: 'aura_rainbow',    name: 'Rainbow Aura',     category: 'aura', rarity: 'Epic',      icon: '🌈', effect: 'rainbow' },
  { id: 'aura_electric',   name: 'Electric Aura',    category: 'aura', rarity: 'Legendary', icon: '⚡', effect: 'electric' },
  { id: 'aura_galaxy',     name: 'Galaxy Aura',      category: 'aura', rarity: 'Mythic',    icon: '🌌', effect: 'galaxy' },
  { id: 'aura_toxic',      name: 'Toxic Aura',       category: 'aura', rarity: 'Epic',      icon: '☣️', effect: 'toxic' },
];

const CosmeticCard = ({ item, owned, equipped, onEquip, onUnequip }) => {
  const col = RARITY_COLORS[item.rarity] || '#94a3b8';
  const SvgLayer = COSMETIC_LAYERS[item.id];
  return (
    <div
      style={{
        borderRadius: 14,
        border: `2px solid ${equipped ? col : owned ? col + '55' : 'rgba(255,255,255,0.06)'}`,
        background: equipped
          ? `linear-gradient(160deg, ${col}22, rgba(5,3,13,0.97))`
          : 'rgba(255,255,255,0.03)',
        padding: '8px 6px 6px',
        textAlign: 'center',
        position: 'relative',
        opacity: owned ? 1 : 0.4,
        cursor: owned ? 'pointer' : 'default',
        transition: 'all 0.25s',
        boxShadow: equipped ? `0 0 18px ${col}55, inset 0 0 12px ${col}11` : 'none',
        userSelect: 'none',
      }}
      onClick={() => {
        if (!owned) return;
        if (equipped) onUnequip(item);
        else onEquip(item);
      }}
    >
      {/* Equipped checkmark */}
      {equipped && (
        <div style={{
          position: 'absolute', top: 4, right: 4, zIndex: 2,
          width: 15, height: 15, borderRadius: '50%',
          background: col, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#000',
        }}>✓</div>
      )}

      {/* SVG icon preview — renders the real in-game cosmetic in a mini viewport */}
      <div style={{
        width: '100%', aspectRatio: '1', borderRadius: 10,
        background: `radial-gradient(circle at 50% 60%, ${col}18, rgba(5,3,13,0.8))`,
        border: `1px solid ${col}22`,
        overflow: 'hidden', position: 'relative', marginBottom: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {SvgLayer ? (
          <svg viewBox="0 0 140 150" width="100%" height="100%"
            style={{ overflow: 'visible' }}>
            {SvgLayer(col)}
          </svg>
        ) : (
          <span style={{ fontSize: 22 }}>{item.icon}</span>
        )}
        {/* Lock overlay */}
        {!owned && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 9,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" fill={col} opacity="0.8"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke={col} strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="12" cy="16" r="1.5" fill="#000"/>
            </svg>
            <span style={{ fontSize: 7, color: col, fontWeight: 800, opacity: 0.8 }}>LOCKED</span>
          </div>
        )}
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: 2 }}>
        {item.name}
      </div>
      <div style={{
        fontSize: 7, fontWeight: 900, color: col,
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {item.rarity}
      </div>
    </div>
  );
};

const PetWardrobe = ({ playerAddress, petStage = 0, onClose, onEquipChange }) => {
  const [inventory, setInventory] = useState({ owned: [], equipped: {} });
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadInventory = useCallback(async () => {
    if (!playerAddress) return;
    try {
      const res = await fetch(`${API_URL}/api/lab/wardrobe/${playerAddress}`);
      if (res.ok) setInventory(await res.json());
    } catch (e) {
      console.warn('[Wardrobe] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [playerAddress]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const equip = useCallback(async (item) => {
    const newEquipped = { ...inventory.equipped, [item.category]: item.id };
    setInventory(p => ({ ...p, equipped: newEquipped }));
    setSaving(true);
    if (onEquipChange) onEquipChange(newEquipped);
    try {
      await fetch(`${API_URL}/api/lab/wardrobe/${playerAddress}/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, category: item.category }),
      });
    } catch (e) { console.warn('[Wardrobe] equip failed:', e); }
    finally { setSaving(false); }
  }, [inventory.equipped, playerAddress, onEquipChange]);

  const unequip = useCallback(async (item) => {
    const newEquipped = { ...inventory.equipped };
    delete newEquipped[item.category];
    setInventory(p => ({ ...p, equipped: newEquipped }));
    setSaving(true);
    if (onEquipChange) onEquipChange(newEquipped);
    try {
      await fetch(`${API_URL}/api/lab/wardrobe/${playerAddress}/unequip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: item.category }),
      });
    } catch (e) { console.warn('[Wardrobe] unequip failed:', e); }
    finally { setSaving(false); }
  }, [inventory.equipped, playerAddress, onEquipChange]);

  const visible = COSMETIC_CATALOGUE.filter(c =>
    activeCategory === 'all' || c.category === activeCategory
  );
  const ownedIds = new Set(inventory.owned);
  const ownedCount = COSMETIC_CATALOGUE.filter(c => ownedIds.has(c.id)).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Lab Companion
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>Pet Wardrobe</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {ownedCount}/{COSMETIC_CATALOGUE.length} collected
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'white', borderRadius: 8, padding: '6px 10px',
              cursor: 'pointer', fontSize: 14,
            }}>✕</button>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 99,
              background: activeCategory === cat.id ? '#38bdf8' : 'rgba(255,255,255,0.06)',
              color: activeCategory === cat.id ? '#000' : 'rgba(255,255,255,0.6)',
              border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>{cat.icon}</span>{cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40, fontSize: 13 }}>
            Loading wardrobe…
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {visible.map(item => (
              <CosmeticCard
                key={item.id}
                item={item}
                owned={ownedIds.has(item.id)}
                equipped={inventory.equipped[item.category] === item.id}
                onEquip={equip}
                onUnequip={unequip}
              />
            ))}
          </div>
        )}
      </div>

      {/* Equipped summary */}
      <div style={{
        padding: '10px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Currently equipped
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(inventory.equipped).length === 0 ? (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Nothing equipped yet — unlock cosmetics from Lab Crates!</div>
          ) : Object.entries(inventory.equipped).map(([cat, id]) => {
            const item = COSMETIC_CATALOGUE.find(c => c.id === id);
            if (!item) return null;
            const col = RARITY_COLORS[item.rarity];
            return (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 99,
                background: col + '22', border: `1px solid ${col}55`,
                fontSize: 10, color: col, fontWeight: 700,
              }}>
                <span>{item.icon}</span> {item.name}
              </div>
            );
          })}
        </div>
        {saving && <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 6 }}>Saving…</div>}
      </div>
    </div>
  );
};

export default PetWardrobe;
