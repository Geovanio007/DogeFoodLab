/**
 * DogeFood Lab — Season 2 Ingredient Icons
 * 50 ingredients across 5 tiers (Starter / Rare / Epic / Legendary / Mythic)
 * Icons are served locally from /images/ingredients/{slug}.png
 */

const ICON = (slug) => `/images/ingredients/${slug}.png`;

export const INGREDIENT_ICONS = {
  // ============ STARTER (Level 1–10) ============
  'S2_001': { name: 'Pupcorn Bits',          emoji: '🍿', icon: ICON('pupcorn-bits') },
  'S2_002': { name: 'Dogeberry Syrup',       emoji: '🫐', icon: ICON('dogeberry-syrup') },
  'S2_003': { name: 'Bark Biscuit Crumbs',   emoji: '🍪', icon: ICON('bark-biscuit-crumbs') },
  'S2_004': { name: 'Meme Milk Capsules',    emoji: '🥛', icon: ICON('meme-milk-capsules') },
  'S2_005': { name: 'Cheddar Woof Chips',    emoji: '🧀', icon: ICON('cheddar-woof-chips') },
  'S2_006': { name: 'Rocket Ramen Strands',  emoji: '🍜', icon: ICON('rocket-ramen-strands') },
  'S2_007': { name: 'Frosted Paw Sugar',     emoji: '❄️', icon: ICON('frosted-paw-sugar') },
  'S2_008': { name: 'Moonbone Jelly',        emoji: '🌙', icon: ICON('moonbone-jelly') },
  'S2_009': { name: 'Turbo Tail Spice',      emoji: '🌶️', icon: ICON('turbo-tail-spice') },
  'S2_010': { name: 'Pupperoni Slices',      emoji: '🍕', icon: ICON('pupperoni-slices') },

  // ============ RARE (Level 11–20) ============
  'S2_011': { name: 'Galaxy Kibble',         emoji: '🌌', icon: ICON('galaxy-kibble') },
  'S2_012': { name: 'Neon Nuggies',          emoji: '🟦', icon: ICON('neon-nuggies') },
  'S2_013': { name: 'Alpha Bacon Strips',    emoji: '🥓', icon: ICON('alpha-bacon-strips') },
  'S2_014': { name: 'Lunar Marshmallows',    emoji: '☁️', icon: ICON('lunar-marshmallows') },
  'S2_015': { name: 'Boneblast Seasoning',   emoji: '💥', icon: ICON('boneblast-seasoning') },
  'S2_016': { name: 'Crypto Caramel Drizzle',emoji: '🍯', icon: ICON('crypto-caramel-drizzle') },
  'S2_017': { name: 'Shiba Spice Cubes',     emoji: '🌶️', icon: ICON('shiba-spice-cubes') },
  'S2_018': { name: 'Plasma Peanut Butter',  emoji: '🥜', icon: ICON('plasma-peanut-butter') },
  'S2_019': { name: 'Byte-sized Sausages',   emoji: '🌭', icon: ICON('byte-sized-sausages') },
  'S2_020': { name: 'Doge Dust Crunch',      emoji: '✨', icon: ICON('doge-dust-crunch') },

  // ============ EPIC (Level 21–30) ============
  'S2_021': { name: 'Cyber Corn Nuggets',    emoji: '🌽', icon: ICON('cyber-corn-nuggets') },
  'S2_022': { name: 'Quantum Treat Flakes',  emoji: '🥣', icon: ICON('quantum-treat-flakes') },
  'S2_023': { name: 'Mega Moo Protein Gel',  emoji: '🥤', icon: ICON('mega-moo-protein-gel') },
  'S2_024': { name: 'Astro Syrup Drops',     emoji: '💧', icon: ICON('astro-syrup-drops') },
  'S2_025': { name: 'Hyper Bone Broth',      emoji: '🍲', icon: ICON('hyper-bone-broth') },
  'S2_026': { name: 'Electric Biscuit Chunks', emoji: '⚡', icon: ICON('electric-biscuit-chunks') },
  'S2_027': { name: 'Meme Pepper Sprinkles', emoji: '🌶️', icon: ICON('meme-pepper-sprinkles') },
  'S2_028': { name: 'Infinity Ice Cream Bits', emoji: '🍨', icon: ICON('infinity-ice-cream-bits') },
  'S2_029': { name: 'Darkmatter Donut Crumbs', emoji: '🍩', icon: ICON('darkmatter-donut-crumbs') },
  'S2_030': { name: 'Stellar Steak Cubes',   emoji: '🥩', icon: ICON('stellar-steak-cubes') },

  // ============ LEGENDARY (Level 31–40) ============
  'S2_031': { name: 'Golden Tail Granules',  emoji: '🌟', icon: ICON('golden-tail-granules') },
  'S2_032': { name: 'Nebula Nacho Dust',     emoji: '🌠', icon: ICON('nebula-nacho-dust') },
  'S2_033': { name: 'Titanium Taffy Chunks', emoji: '🔱', icon: ICON('titanium-taffy-chunks') },
  'S2_034': { name: 'Omega Bacon Powder',    emoji: '🥓', icon: ICON('omega-bacon-powder') },
  'S2_035': { name: 'Celestial Cheese Melt', emoji: '🧀', icon: ICON('celestial-cheese-melt') },
  'S2_036': { name: 'Frostfang Yogurt Drops',emoji: '🧊', icon: ICON('frostfang-yogurt-drops') },
  'S2_037': { name: 'Meteor Meat Flakes',    emoji: '☄️', icon: ICON('meteor-meat-flakes') },
  'S2_038': { name: 'Shiba Stardust Syrup',  emoji: '💫', icon: ICON('shiba-stardust-syrup') },
  'S2_039': { name: 'Royal Rocket Crunch',   emoji: '🚀', icon: ICON('royal-rocket-crunch') },
  'S2_040': { name: 'Mythic Paw Crystals',   emoji: '🐾', icon: ICON('mythic-paw-crystals') },

  // ============ MYTHIC (Level 41–50) ============
  'S2_041': { name: 'Infinity Bone Essence', emoji: '♾️', icon: ICON('infinity-bone-essence') },
  'S2_042': { name: 'Galactic Gravy Cubes',  emoji: '🌀', icon: ICON('galactic-gravy-cubes') },
  'S2_043': { name: 'Ultra Woof Extract',    emoji: '🧪', icon: ICON('ultra-woof-extract') },
  'S2_044': { name: 'Eclipse Energy Flakes', emoji: '🌑', icon: ICON('eclipse-energy-flakes') },
  'S2_045': { name: 'Phoenix Pepper Oil',    emoji: '🔥', icon: ICON('phoenix-pepper-oil') },
  'S2_046': { name: 'Cosmic Kibble Core',    emoji: '🪐', icon: ICON('cosmic-kibble-core') },
  'S2_047': { name: 'Dragon Tail Protein',   emoji: '🐉', icon: ICON('dragon-tail-protein') },
  'S2_048': { name: 'Meme Core Crystals',    emoji: '💎', icon: ICON('meme-core-crystals') },
  'S2_049': { name: 'Supernova Snack Dust',  emoji: '🌟', icon: ICON('supernova-snack-dust') },
  'S2_050': { name: 'Godtier Shiba Serum',   emoji: '👑', icon: ICON('godtier-shiba-serum') },
};

// Helper function to get icon URL or fallback to emoji
export const getIngredientIcon = (ingredientId) => {
  const ingredient = INGREDIENT_ICONS[ingredientId];
  if (!ingredient) return null;
  return ingredient.icon || null;
};

// Helper to get emoji fallback
export const getIngredientEmoji = (ingredientId) => {
  const ingredient = INGREDIENT_ICONS[ingredientId];
  return ingredient?.emoji || '❓';
};

export default INGREDIENT_ICONS;
