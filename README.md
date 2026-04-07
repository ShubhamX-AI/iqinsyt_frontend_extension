# IQinsyt Frontend Extension

Chrome Extension (Manifest V3) frontend for IQinsyt.  
This repository is intentionally structured around extension runtime boundaries:

- `sidepanel` for React UI rendering.
- `background` for privileged extension logic and API orchestration.
- `content` for page-level detection and message emission.

That split is important because Chrome Extension contexts have different capabilities and lifecycle rules.

## What This Project Does

IQinsyt provides a side panel experience that can detect relevant events from host pages and later fetch neutral research insights from backend APIs.

Current repository status is integrated extension foundation:

- Extension build pipeline is wired.
- Entry points for side panel/background/content exist.
- Shared type contracts are in place.
- Auth/API runtime layer is in place.
- Background message routing and content detection logic are in place.
- State machine/context layer is in place.
- Custom hook modules are in place.
- UI component modules are in place.
- Final app wiring and side-panel styling integration are in place.

## Why This Structure

- Manifest V3 requires a service worker background process instead of persistent background pages.
- Content scripts run inside webpages and should stay focused on DOM/event detection.
- Side panel React UI should remain decoupled from content script internals via message passing.
- This separation makes permissions, debugging, and testing clearer and safer.

## Quick Start

### Prerequisites

- Node.js 20+ recommended.
- `pnpm` installed globally.

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm -s tsc --noEmit
```

### Load in Chrome

1. Run `pnpm build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select this repo's `dist/` folder.

## Documentation Index

Primary frontend-extension documentation now lives in `docs/`:

- `docs/README.md` - frontend docs index and reading order.
- `docs/runtime-architecture.md` - context boundaries, responsibilities, and lifecycle.
- `docs/data-flow.md` - end-to-end flows with Mermaid sequence diagrams.
- `docs/state-machine.md` - side panel reducer phases and transitions.
- `docs/contracts.md` - message/API contracts and validation checks.
- `docs/troubleshooting.md` - practical debugging guide for common failures.

Legacy architecture references (`architecture.md`, `phases.md`) are kept as-is. For day-to-day extension frontend behavior, use `docs/` first.

## Environment

Required build-time variable:

- `VITE_BACKEND_URL`: backend base URL used by API calls and token refresh.
- `VITE_API_KEY` (optional but recommended): sent as `X-API-Key` for `/v1/research` streaming calls.

Where it is used:

- `src/api/client.ts` to call `/v1/research` (streaming), `/v1/auth/token`, and `/v1/user/plan`.
- `src/auth/tokenManager.ts` to call `/v1/auth/refresh`.

## Repository Map (Every Current File/Folder)

All paths below reflect the current repository contents.

### Visual Structure (Tree)

```text
iqinsyt_frontend_extension/
├── .agents/                 # Local agent/skill config
├── .claude/                 # Local assistant metadata
├── .codex                   # Codex environment marker/config artifact
├── .git/                    # Git metadata
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation (this file)
├── architecture.md          # Full architecture reference
├── docs/                    # Frontend extension documentation set
├── dist/                    # Build output (generated)
├── eslint.config.js         # ESLint configuration
├── manifest.json            # Manifest V3 contract
├── node_modules/            # Installed dependencies (generated)
├── package-lock.json        # npm lockfile
├── package.json             # Scripts and dependencies
├── phases.md                # Phased implementation plan
├── pnpm-lock.yaml           # pnpm lockfile
├── public/
│   ├── favicon.svg          # Static asset
│   └── icons.svg            # Static asset
├── src/
│   ├── api/
│   │   ├── client.ts        # API runtime client + typed fetch errors
│   │   └── types.ts         # API request/response contracts
│   ├── auth/
│   │   └── tokenManager.ts  # Chrome storage token handling + refresh path
│   ├── background/
│   │   └── index.ts         # Background message router + API bridge
│   ├── content/
│   │   ├── content-script.ts # Content script entrypoint
│   │   ├── floatingWidget.ts # Floating panel open/close + tab UI
│   │   ├── picker.ts        # Interactive element picker (highlight/click/cancel)
│   │   └── sites/
│   │       └── kalshi/
│   │           └── parseMarket.ts # Kalshi DOM finding + parsing (single source of truth)
│   ├── assets/              # Reserved local asset folder (currently empty)
│   ├── components/
│   │   ├── ErrorState.tsx   # Error state UI block
│   │   ├── EventCard.tsx    # Detected event summary + analyse action
│   │   ├── ManualInput.tsx  # Manual event input form
│   │   ├── ResearchOutput.tsx # Research response composition
│   │   ├── SectionBlock.tsx # Individual research section block
│   │   └── StatusBar.tsx    # Top status indicator
│   ├── hooks/
│   │   ├── useAuth.ts       # Auth/session hook for side panel
│   │   ├── useEventDetection.ts # Message listener for detected events
│   │   └── useInsightQuery.ts # Analysis request/response hook
│   ├── shared/
│   │   └── types.ts         # Shared app/message/state contracts
│   ├── sidepanel/
│   │   ├── App.tsx          # Reducer + provider root for side panel state
│   │   ├── context.tsx      # App context and context hook
│   │   ├── index.html       # Side panel HTML shell
│   │   └── main.tsx         # React bootstrap entrypoint
│   └── index.css            # Global styles/tokens
├── tsconfig.app.json        # TS config for app/browser code
├── tsconfig.json            # Root TS config
├── tsconfig.node.json       # TS config for Node/tooling code
└── vite.config.ts           # Vite + CRX build config
```

| Path | Type | Why It Exists |
|---|---|---|
| `.agents/` | Dir | Local agent/skill configuration used by coding assistants in this workspace. Not runtime app code. |
| `.claude/` | Dir | Local assistant metadata/workflow files. Tooling support only. |
| `.codex` | File | Local marker/config artifact for Codex environment integration. |
| `.git/` | Dir | Git metadata and version history. |
| `.gitignore` | File | Defines files/folders that should not be committed (build artifacts, dependencies, etc.). |
| `README.md` | File | Canonical project documentation and onboarding guide. |
| `architecture.md` | File | Full product and system architecture reference for extension behavior and constraints. |
| `docs/` | Dir | Frontend extension documentation set for architecture, flow, state, contracts, and troubleshooting. |
| `dist/` | Dir (generated) | Build output for loading as unpacked extension in Chrome. Generated by `pnpm build`. |
| `eslint.config.js` | File | ESLint configuration for static analysis and code quality enforcement. |
| `manifest.json` | File | Manifest V3 extension contract: permissions, entrypoints, content scripts, side panel path. |
| `node_modules/` | Dir (generated) | Installed dependencies. |
| `package-lock.json` | File | npm lockfile for deterministic installs when using npm. |
| `package.json` | File | Project metadata, scripts, dependencies, and devDependencies. |
| `phases.md` | File | Phase-by-phase implementation plan used to build incrementally. |
| `pnpm-lock.yaml` | File | pnpm lockfile for deterministic installs with pnpm. |
| `public/` | Dir | Static assets copied into build output. |
| `public/favicon.svg` | File | Browser/extension icon asset used by build outputs and UI entry HTML. |
| `public/icons.svg` | File | Additional static icon asset bundle used by UI or branding. |
| `src/` | Dir | All source code for side panel UI, background worker, and content script. |
| `src/api/` | Dir | API-layer contracts and runtime client module for backend communication. |
| `src/api/client.ts` | File | Runtime API wrapper (auth headers, endpoint calls, typed API/auth/subscription errors). |
| `src/api/types.ts` | File | Defines API request/response/auth/user contract types consumed across modules. |
| `src/auth/` | Dir | Authentication utilities isolated from UI/runtime contexts. |
| `src/auth/tokenManager.ts` | File | Manages token storage in `chrome.storage.local` and handles token refresh flow. |
| `src/assets/` | Dir | Local source-asset folder reserved for future static assets (currently empty). |
| `src/components/` | Dir | Presentational UI components for side panel states and research output rendering. |
| `src/components/StatusBar.tsx` | File | Status strip component that reflects current app phase and streaming state. |
| `src/components/EventCard.tsx` | File | Displays detected event details and analysis action trigger. |
| `src/components/ManualInput.tsx` | File | Manual event-entry fallback form when automatic detection fails. |
| `src/components/SectionBlock.tsx` | File | Expandable/collapsible section renderer for research content blocks. |
| `src/components/ResearchOutput.tsx` | File | Renders canonical 7-section research output and meta badges. |
| `src/components/ErrorState.tsx` | File | Error display component with dismiss action. |
| `src/hooks/` | Dir | Side-panel hooks that bridge Chrome runtime messaging with reducer dispatch. |
| `src/hooks/useAuth.ts` | File | Session/auth hook that syncs token status and user plan into app state. |
| `src/hooks/useEventDetection.ts` | File | Listener hook for detection messages emitted from content/background contexts. |
| `src/hooks/useInsightQuery.ts` | File | Analysis hook that dispatches requests and consumes background analysis responses. |
| `src/shared/` | Dir | Cross-context shared contracts for extension messaging and app state. |
| `src/shared/types.ts` | File | Defines message, event, reducer action, and app-state types shared by contexts. |
| `src/sidepanel/context.tsx` | File | Defines `AppContext` and `useAppContext` helper for shared state access. |
| `src/sidepanel/App.tsx` | File | Integrates hooks + reducer and performs phase-based UI composition for the side panel. |
| `tsconfig.app.json` | File | TypeScript compiler settings for browser/app code under `src/`. |
| `tsconfig.json` | File | Root TypeScript project references/coordination file. |
| `tsconfig.node.json` | File | TypeScript settings for Node-side tooling/config files (for example Vite config typing). |
| `vite.config.ts` | File | Vite bundler config plus CRX plugin integration for extension packaging. |

## Source Map (`src/`)

### Visual Structure (`src/`)

```text
src/
├── api/
│   ├── client.ts
│   └── types.ts
├── assets/
├── auth/
│   └── tokenManager.ts
├── background/
│   └── index.ts
├── content/
│   ├── content-script.ts
│   ├── floatingWidget.ts
│   ├── picker.ts
│   └── sites/
│       └── kalshi/
│           └── parseMarket.ts
├── components/
│   ├── ErrorState.tsx
│   ├── EventCard.tsx
│   ├── ManualInput.tsx
│   ├── ResearchOutput.tsx
│   ├── SectionBlock.tsx
│   └── StatusBar.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useEventDetection.ts
│   └── useInsightQuery.ts
├── shared/
│   └── types.ts
├── sidepanel/
│   ├── App.tsx
│   ├── context.tsx
│   ├── index.html
│   └── main.tsx
└── index.css
```

| Path | Type | Why It Exists |
|---|---|---|
| `src/api/` | Dir | API-facing module area for backend contract and request-layer code. |
| `src/api/client.ts` | File | Encapsulates backend calls, auth-bearing fetch flow, and normalized API error classes. |
| `src/api/types.ts` | File | Shared type contracts for insight/auth/user endpoints. Keeps API shape centralized. |
| `src/assets/` | Dir | Reserved source-asset directory (currently empty). |
| `src/auth/` | Dir | Authentication boundary for token persistence/refresh behavior. |
| `src/auth/tokenManager.ts` | File | Reads/writes auth tokens from extension storage and refreshes access tokens as needed. |
| `src/background/` | Dir | Background service worker code. Centralized privileged extension logic lives here. |
| `src/background/index.ts` | File | Background service worker routing layer: relays detection and triggers analysis fetch flow. |
| `src/content/` | Dir | Content-script layer for webpage context interaction. |
| `src/content/content-script.ts` | File | Content script entrypoint — auto-detect on Kalshi + picker activation + PING handler. |
| `src/content/floatingWidget.ts` | File | Floating panel DOM, styles, open/close toggle, and tab UI. |
| `src/content/picker.ts` | File | Interactive picker that highlights candidates, handles click/cancel, and emits detection messages. Delegates Kalshi logic to `sites/kalshi/parseMarket.ts`. |
| `src/content/sites/kalshi/parseMarket.ts` | File | Single source of truth for all Kalshi DOM logic: finding candidates for highlighting, parsing listing tiles and detail pages, and auto-detecting market data on detail pages. |
| `src/components/` | Dir | Side panel presentation layer for status, selected event, manual input, output, and errors. |
| `src/components/StatusBar.tsx` | File | Header/status component reflecting current phase and stream activity indicator. |
| `src/components/EventCard.tsx` | File | Event summary card with action button to trigger analysis. |
| `src/components/ManualInput.tsx` | File | Manual entry form fallback when no event is auto-detected. |
| `src/components/SectionBlock.tsx` | File | Section item renderer with expandable body and unavailable fallback text. |
| `src/components/ResearchOutput.tsx` | File | Composes section blocks from response payload with metadata badges and rerun control. |
| `src/components/ErrorState.tsx` | File | Error panel with message and dismiss action. |
| `src/hooks/` | Dir | Side panel hook layer for auth checks and Chrome message subscriptions. |
| `src/hooks/useAuth.ts` | File | Performs auth bootstrap and user-plan sync, exposes authentication status/logout. |
| `src/hooks/useEventDetection.ts` | File | Subscribes to runtime detection messages and dispatches reducer actions. |
| `src/hooks/useInsightQuery.ts` | File | Triggers analysis requests and handles analysis/auth/error responses from background. |
| `src/shared/` | Dir | Shared type contracts used by background/content/sidepanel without duplication. |
| `src/shared/types.ts` | File | Defines message/action/state/event contracts for reducer and runtime messaging. |
| `src/sidepanel/` | Dir | React application for Chrome side panel UI. |
| `src/sidepanel/index.html` | File | Side panel HTML shell with root mount node and module script entry. |
| `src/sidepanel/main.tsx` | File | React mount/bootstrap entrypoint for side panel app. |
| `src/sidepanel/App.tsx` | File | Final integration shell that invokes hooks and renders components by current phase. |
| `src/sidepanel/context.tsx` | File | Exposes context object and strict hook for typed `state`/`dispatch` access. |
| `src/index.css` | File | Global design tokens plus integrated side-panel layout/component styling. |

## Build and Runtime Architecture

### Build Layer

- Vite handles TS/React bundling.
- `@crxjs/vite-plugin` transforms extension entrypoints and generates the final extension manifest in `dist/`.
- CRX pipeline rewrites some output paths to built assets, so `dist/` file names differ from source names.

### Runtime Layer

- `manifest.json` declares extension permissions and execution surfaces.
- `background` service worker handles privileged and long-lived orchestration.
- `content script` runs on configured host domains and performs user-triggered element picking.
- `side panel` is the user-facing React interface.

## Why Manifest and Entrypoints Are Set This Way

- `manifest_version: 3` is mandatory for modern Chrome extensions.
- `background.service_worker` points to a TS entry that CRX builds into a worker loader/output.
- `content_scripts` declares the page-injected script entry.
- `side_panel.default_path` points to the side panel HTML entry.
- Keeping explicit entrypoints per context avoids cross-context coupling and makes permissions auditable.

## Development Principles for This Repo

- Keep side effects in the correct extension context.
- Keep shared contracts in dedicated type modules as phases progress.
- Prefer message-based communication over direct context coupling.
- Treat `architecture.md` as product behavior reference and `phases.md` as implementation sequence.

## Current Phase Baseline

As of now, Phases 1 through 9 are implemented in the repository:

- Build infrastructure is present.
- Folder and entrypoint skeleton is present.
- Shared API and cross-context type contracts are present (`src/api/types.ts`, `src/shared/types.ts`).
- Auth/token manager and API client modules are present (`src/auth/tokenManager.ts`, `src/api/client.ts`).
- Background message routing and picker logic are present (`src/background/index.ts`, `src/content/content-script.ts`, `src/content/picker.ts`, `src/content/sites/kalshi/parseMarket.ts`) with `MARKETS_DETECTED` relay support.
- Reducer/context state foundation is present (`src/sidepanel/App.tsx`, `src/sidepanel/context.tsx`).
- Hook modules are present (`src/hooks/useAuth.ts`, `src/hooks/useEventDetection.ts`, `src/hooks/useInsightQuery.ts`).
- UI component modules are present (`src/components/StatusBar.tsx`, `src/components/EventCard.tsx`, `src/components/ManualInput.tsx`, `src/components/SectionBlock.tsx`, `src/components/ResearchOutput.tsx`, `src/components/ErrorState.tsx`).
- Final app wiring is present (`src/sidepanel/App.tsx`) including hook invocation and phase-based rendering.
- Integrated side-panel styling is present (`src/index.css`).
