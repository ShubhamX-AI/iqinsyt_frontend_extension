# Troubleshooting

## Event Never Appears in Panel

Checks:

- Confirm content script is injected on one of the configured hosts in `manifest.json` (`*.polymarket.com`, `*.kalshi.com`, `*.metaculus.com`, `*.manifold.markets`, `*.predictit.org`, `*.betfair.com`, `*.smarkets.com`).
- Click "Pick element" in the side panel and confirm status changes to `Waiting for selection`.
- Verify `START_PICKER` is forwarded by background to the active tab content script.
- Hover over a market-like block (contains percentages and outcome text) and confirm highlight outline appears.
- After click, verify picker emits either `MARKETS_DETECTED` (success) or `DETECTION_FAILED` (fallback to manual).

Likely outcome:

- UI should move to `manual` phase and allow manual submission.

## Analysis Stuck or Fails

Checks:

- Verify `REQUEST_ANALYSIS` is sent from side panel hook.
- Verify background worker receives message and calls `fetchInsight`.
- Confirm `VITE_BACKEND_URL` is set correctly at build time.
- Inspect network/API status mapping (`401`, `402`, other errors).

Likely UI results:

- `401` or missing token -> `AUTH_REQUIRED` reset.
- `402` -> plan-upgrade error message.
- other failures/timeouts -> generic retry error message.

## Unexpected Auth Resets

Checks:

- Validate stored token payload has valid JWT structure and `exp` claim.
- Confirm refresh endpoint behavior and response shape (`accessToken`, `refreshToken`).
- Check whether refresh failures are causing token clear.

## Result Renders but Some Sections Empty

Checks:

- Inspect `InsightResponse.sections` content from backend.
- UI intentionally renders `[Data unavailable for this section]` when a section is missing/empty.

## Message Handling Debug Path

- Content script entry + auto-detect: `src/content/content-script.ts`
- Floating widget panel: `src/content/floatingWidget.ts`
- Picker orchestration and candidate matching: `src/content/picker.ts`
- Kalshi DOM finding + parsing (single source): `src/content/sites/kalshi/parseMarket.ts`
- Background relay/orchestration: `src/background/index.ts`
- Side panel listeners: `src/hooks/useEventDetection.ts`, `src/hooks/useInsightQuery.ts`
- Reducer transitions: `src/sidepanel/App.tsx`
