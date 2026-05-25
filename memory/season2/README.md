# DogeFood Lab — Season 2 Ingredient Drop-In (Prod Backend Repo)

This folder contains everything you need to mirror the Season 2 ingredient
catalog from this preview environment into your separate
**`Dogefood-lab-backend`** GitHub repo so the production API serves the new
50 ingredients identically.

## Files

| Path | Where it goes in your prod repo |
| --- | --- |
| `ingredient_system.py` | `backend/services/ingredient_system.py` (overwrite) |
| `ingredient_pngs/*.png` | These are **frontend** assets — they live in `frontend/public/images/ingredients/` of your frontend repo (already done here). The backend does NOT need the PNGs. |

## Step-by-step

1. **Backend (Dogefood-lab-backend repo)**
   - Overwrite `backend/services/ingredient_system.py` with the file in this folder.
   - Also update the `KERNEL_BONUS_COMBOS` block in `backend/server.py`
     (search for `KERNEL_BONUS_COMBOS`) to use the new Season 2 IDs as shown
     below.
   - Restart the backend service.
   - Verify: `GET /api/ingredients/catalog` returns `total_ingredients: 50`
     and `GET /api/ingredients/unlocked/50` returns 50 ingredients with IDs
     `S2_001` … `S2_050`.

2. **Frontend (this Emergent repo)**
   - Already updated (`/app/frontend/src/config/ingredientIcons.js` +
     `/app/frontend/public/images/ingredients/*.png`). Just deploy
     normally via the Save to GitHub button.

## `KERNEL_BONUS_COMBOS` replacement (paste into server.py)

```python
KERNEL_BONUS_COMBOS = {
    "legendary": {
        "bonus_percent": 30,
        "combos": [
            {"S2_040", "S2_038", "S2_033"},
            {"S2_039", "S2_034", "S2_031"},
        ],
        "description": "Legendary WOW Combo - Maximum boost!"
    },
    "epic": {
        "bonus_percent": 20,
        "combos": [
            {"S2_026", "S2_022"},
            {"S2_029", "S2_021"},
            {"S2_030", "S2_024"},
        ],
        "description": "Epic WOW Combo - Strong boost!"
    },
    "rare": {
        "bonus_percent": 15,
        "combos": [
            {"S2_011", "S2_015"},
            {"S2_013", "S2_018"},
            {"S2_017", "S2_020"},
        ],
        "description": "Rare WOW Combo - Good boost!"
    },
    "common": {
        "bonus_percent": 5,
        "combos": [],
        "description": "Basic WOW Combo - Small boost!"
    }
}
```

## `/api/ingredients/unlocked/{player_level}` patch (optional but recommended)

The frontend (`SeasonTwoLab.jsx`) consumes a flat `ingredients[]` array.
Add this block inside the return dict of the `get_unlocked_ingredients`
endpoint in `server.py` (right next to `unlocked_by_category`):

```python
"ingredients": [
    {
        "id": ing.id,
        "name": ing.name,
        "category": ing.category.value,
        "emoji": ing.emoji,
        "description": ing.description,
        "special_effect": ing.special_effect.value,
        "rarity_weight": ing.rarity_weight,
        "color": ing.color,
        "unlock_level": ing.unlock_level,
    }
    for ing in unlocked
],
```

## Notes

- **No crafting-engine changes were made.** The Pydantic models,
  `treat_game_engine`, anti-cheat, season manager, points system, and all
  treat endpoints remain untouched.
- The catalog is purely **data** — same `Ingredient` dataclass, same
  `IngredientSystem` API surface, same helper methods. Anything calling
  `ing_system.get_ingredient()` / `.get_unlocked_ingredients()` / etc.
  continues to work.
- Old IDs (`ING001`–`ING404`) are removed. Any persisted user records
  referencing those IDs will simply not resolve from the catalog (treated
  as unknown). If you need a migration script for historic player data,
  ask and I'll generate one.
