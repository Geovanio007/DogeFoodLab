# DogeFood Lab — PRD & Project Memory

## Original Problem Statement
The user is integrating the **DogeOS SDK** (`@dogeos/dogeos-sdk`) for wallet-connect on the frontend, replacing the previous `wagmi` / RainbowKit setup. Deployment on Render was failing with an `ERESOLVE` peer-dep conflict (React 18 vs React 19 required by `@react-three/fiber`). The user provided a Client ID and asked to remove wagmi/RainbowKit entirely.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS v3, DogeOS SDK for wallet connect.
- **Backend**: FastAPI + MongoDB (untouched in this session).
- **Build system switched from `react-scripts` to `@craco/craco`** so we can inject Webpack 5 polyfills (crypto, stream, buffer…) required by the SDK and module-replace unused non-EVM chain adapters.

## Implemented (Feb 2026)

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
