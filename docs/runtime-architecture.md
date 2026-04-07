# Runtime Architecture

## Context Boundaries

The extension runs in three isolated contexts, each with separate capabilities.

- `content` (`src/content/content-script.ts`, `src/content/picker.ts`, `src/content/floatingWidget.ts`, `src/content/sites/kalshi/parseMarket.ts`): handles interactive element picking, auto-detect on Kalshi pages, parses selected DOM into a market payload, emits detection messages.
- `background` (`src/background/index.ts`): service worker that routes messages and performs privileged API orchestration.
- `sidepanel` (`src/sidepanel/*`): React UI state machine and rendering layer.

This separation is required by Manifest V3 and is also the reason all communication happens through `chrome.runtime` messaging.

## Entrypoints

- `manifest.json -> background.service_worker`: `src/background/index.ts`
- `manifest.json -> content_scripts.js`: `src/content/content-script.ts`
- `manifest.json -> side_panel.default_path`: `src/sidepanel/index.html`

## Responsibility Split

- Content script:
  - Inject and manage the floating widget panel (open/close/tab).
  - Auto-detect market data on Kalshi detail pages via SPA route observer.
  - Wait for `START_PICKER` and activate an interactive picker on the current page.
  - Highlight candidate elements under the cursor using capture-phase listeners.
  - Resolve a candidate container via site-specific or generic scoring heuristics.
  - Parse the selected candidate into one `DetectedMarket` via `sites/kalshi/parseMarket.ts`.
  - Emit `MARKETS_DETECTED` (single-item array), `DETECTION_FAILED`, or `PICKER_CANCELLED`.
- Background service worker:
  - Enable open-on-action side panel behavior.
  - Relay picker detection messages (`MARKETS_DETECTED`, `DETECTION_FAILED`, `PICKER_CANCELLED`) and `EVENT_DETECTED` to side panel listeners.
  - Forward `START_PICKER` from side panel to active-tab content script.
  - Handle `REQUEST_ANALYSIS` by calling streaming API client (`/v1/research` SSE).
  - Relay stream lifecycle messages (`ANALYSIS_STARTED`, `ANALYSIS_PROGRESS`, `ANALYSIS_RESULT`, `ANALYSIS_ERROR`, `ANALYSIS_CANCELLED`).
  - Handle `CANCEL_ANALYSIS` by aborting active stream via `AbortController`.
  - Normalize error outcomes into message types the UI can consume.
- Side panel:
  - Own local reducer state (`phase`, single `detectedEvent`, `result`, `error`, `stream`, `user`) and phase transitions.
  - Subscribe to runtime messages via hooks.
  - Trigger analysis/cancel requests through background, never direct privileged orchestration.

## Lifecycle Notes

- Background is non-persistent (MV3 service worker lifecycle), so message handlers must stay stateless and deterministic.
- Side panel hooks attach listeners on mount and remove listeners on unmount.
- Picker activation is idempotent (`activatePicker()` returns early if already active).
- While picker is active, content script injects transient highlight/toast styles and capture-phase listeners; all are removed on selection/cancel.
