# DogeFood Lab — PRD & Project Memory

## Original Problem Statement
The user is integrating the **DogeOS SDK** (`@dogeos/dogeos-sdk`) for wallet-connect on the frontend, replacing the previous `wagmi` / RainbowKit setup. Deployment on Render was failing with an `ERESOLVE` peer-dep conflict (React 18 vs React 19 required by `@react-three/fiber`). The user provided a Client ID and asked to remove wagmi/RainbowKit entirely.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS v3, DogeOS SDK for wallet connect.
- **Backend**: FastAPI + MongoDB (untouched in this session).
- **Build system switched from `react-scripts` to `@craco/craco`** so we can inject Webpack 5 polyfills (crypto, stream, buffer…) required by the SDK and module-replace unused non-EVM chain adapters.

## Implemented (Feb 2026)

### DogeOS Modal Text-Visibility Fix  ✅ (Feb 11, 2026)
- **Bug:** Modal text ("Log in or sign up", "Or connect a wallet", Twitter/Google labels, Continue button, legal text, Powered by) was rendering nearly invisible (white-on-white).
- **Root cause:** The host app forces `<html class="dark dark-mode">` and applies `body { color: var(--text-primary) }` = `#f1f5f9` (slate-100). The DogeOS SDK's modal renders inside a white-card portal and relies on HeroUI tokens (`--heroui-foreground: 240 40% 11.76%`) for text — but the host's white inherited color was overriding HeroUI's intended dark text.
- **Fix:** Added a CSS rule in `frontend/src/index.css` scoped **strictly to `#modal-container [role="dialog"]`** (the SDK's portal root, NOT the SDK's outer `.light` wrapper that contains the whole app) that resets `color` and `-webkit-text-fill-color` to `hsl(var(--heroui-foreground) / 1)` with `!important`. A secondary rule allows the SDK's own muted-text utility classes (`text-default-*`, `text-foreground-*`, `text-content-*`, anchors, `text-t*`) to inherit so legal/secondary text keeps its intended gray.
- **Regression fixed:** An initial broader selector (`.dark .light *`) inadvertently matched the SDK's app-wide `<div class="light">` wrapper (TomoUIProvider injects it around all WalletConnectProvider children), which turned the entire dark-mode UI dark navy. Narrowed to `#modal-container` only.
- **Verified live:**  
  • Welcome screen body color = `rgb(241, 245, 249)` (original dark-mode white) ✓  
  • Modal text color = `rgb(18, 18, 42)` (dark navy on white card) ✓

### What's New Toast — MyDoge Wallet V3 Rollout  ✅ (Feb 11, 2026)
- `frontend/src/components/WhatsNewToast.jsx` — themed first-visit toast that surfaces the new MyDoge Wallet V3 rollout.
- Title: **"Cheers! MyDoge Wallet V3 is here"** (no sparkle emoji).
- Visual: custom illustration of two scientist Shiba Inus in lab coats clinking glowing chemistry beakers (cyan + gold) — generated via Gemini Nano Banana (`gemini-3.1-flash-image-preview`), saved to `frontend/public/shibas-toasting.png`.
- **CTA "Connect Wallet" opens the DogeOS wallet-connect modal directly** via the SDK's `useWalletConnect().openModal()` and dismisses the toast.
- Behavior: appears 1.4s after the welcome screen mounts, also dismissible via close button, gated by `localStorage['dogefood_whats_new_seen'] === 'mydoge-wallet-v3'` so it shows only once per browser. Bumping `WHATS_NEW_VERSION` in the component re-surfaces it for future updates.
- Theme: matches app palette (blue→indigo glass gradient, yellow-300 accent ring, Fredoka heading font, kawaii doge image), `prefers-reduced-motion` respected, fixed bottom-center on mobile / bottom-right on desktop.
- Mounted inside `WelcomeScreen.jsx` so it only shows pre-auth.

### DogeOS SDK Integration  ✅
- `frontend/.npmrc` with `legacy-peer-deps=true` to bypass React peer-dep conflicts on Render builds.
- `frontend/craco.config.js` with Webpack 5 polyfills, `NormalModuleReplacementPlugin` for unused chain SDKs (Sui, Tron, Solana, Cosmos…), `ProvidePlugin` for Buffer/process, and a dedicated CSS pipeline that bypasses Tailwind/PostCSS for the SDK's prebuilt stylesheet.
- `frontend/src/empty-chain-stub.js` no-op stub for non-EVM chain adapters.
- `frontend/src/config/dogeos.js` — `WalletConnectKitConfig` with user's Client ID.
- `frontend/src/components/DogeConnectButton.jsx` — render-prop wrapper replacing the old RainbowKit `ConnectButton.Custom`.
- `frontend/src/components/Web3Provider.js` and `WalletConnection.jsx` updated to use DogeOS SDK.

### Tailwind v3 ↔ Tailwind v4 SDK CSS Conflict  ✅ (Feb 11, 2026)
- The SDK ships its CSS as Tailwind v4 — including `@property --tw-gradient-from { syntax: "<color>"; initial-value: #0000 }`. The strict typing caused the host app's Tailwind v3 utility values (e.g. `--tw-gradient-from: #a855f7 var(--tw-gradient-from-position)` — composite "color + position") to be parse-rejected and reset to the transparent initial value, washing out every `from-*` / `to-*` gradient in the app (VIP, Leaderboard, Share & Earn icons, etc.).
- `frontend/scripts/strip-dogeos-base-loader.js` (webpack loader) and `frontend/scripts/patch-dogeos-sdk.js` (postinstall) now:
  1. Strip `@layer base { … }` (Preflight global resets)
  2. Strip `@layer properties { … }`
  3. **Strip every `@property --tw-… { … }` registration** ← the actual fix for the transparency regression.
- Postinstall marker bumped to `v2` to force re-patch on existing installs.
- Verified live on preview: `getComputedStyle()` on a synthetic `.bg-gradient-to-br.from-purple-500.to-pink-500` returns proper purple→pink `linear-gradient(...)`.

## Files of Reference
- `/app/frontend/.npmrc`
- `/app/frontend/craco.config.js`
- `/app/frontend/scripts/patch-dogeos-sdk.js`
- `/app/frontend/scripts/strip-dogeos-base-loader.js`
- `/app/frontend/src/config/dogeos.js`
- `/app/frontend/src/components/DogeConnectButton.jsx`
- `/app/frontend/src/components/Web3Provider.js`
- `/app/frontend/src/components/WalletConnection.jsx`
- `/app/frontend/src/empty-chain-stub.js`
- `/app/frontend/src/index.css`

## Pending / Backlog
- **User verification** — please load the preview and confirm the VIP / Leaderboard / Share & Earn icon gradients and all other Tailwind gradients look identical to https://dogefoodlab.xyz/.
- After approval: **Save to GitHub** for Render deployment.
- (Optional/Backlog) Add a CI lint step that fails if `@property --tw-` slips back into the SDK files post-install.

## Test Credentials
None required for verification — visual check on welcome screen + main menu after PLAY NOW.
