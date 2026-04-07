# Contracts and Checks

## Chrome Runtime Message Contract

Defined in `src/shared/types.ts`.

- `EVENT_DETECTED`: `payload` is `DetectedEvent`
- `MARKETS_DETECTED`: `payload` is `DetectedMarket[]`
- `REQUEST_ANALYSIS`: `payload` is `DetectedEvent`
- `CANCEL_ANALYSIS`: no payload
- `ANALYSIS_STARTED`: `payload` is `ResearchStartedEvent`
- `ANALYSIS_PROGRESS`: `payload` is `ResearchProgressEvent`
- `ANALYSIS_CANCELLED`: no payload
- `ANALYSIS_RESULT`: `payload` is `InsightResponse`
- `ANALYSIS_ERROR`: `payload` is user-facing error message string
- `DETECTION_FAILED`: no payload
- `AUTH_REQUIRED`: no payload
- `START_PICKER`: no payload
- `PICKER_CANCELLED`: no payload
- `CLOSE_PANEL`: no payload (side panel → background → content script, closes floating panel)
- `REQUEST_SITE_AUTH_STATUS`: no payload (side panel → background)
- `SITE_AUTH_STATUS`: `payload` is `boolean` (background → side panel)
- `TOGGLE_FLOATING_PANEL`: no payload (background → content script)

Notes:

- Picker success currently emits `MARKETS_DETECTED` with a single-item array: `[market]`.
- The reducer uses only the first detected market (`payload[0]`) as `detectedEvent`.

`DetectedMarket` shape:

- `id: string`
- `title: string`
- `source: string`
- `url: string | null`
- `outcomes: { label: string; probability: string | null }[]`
- `volume: string | null`

`DetectedEvent` shape:

- `title: string`
- `source: string`
- `id?: string`
- `url?: string | null`
- `outcomes?: { label: string; probability: string | null }[]`
- `volume?: string | null`

## API Contract Used by Frontend

Defined in `src/api/types.ts` and consumed by `src/api/client.ts`.

- `POST /v1/research` with `InsightRequest`
  - `eventTitle`
  - `eventSource`
  - `timestamp`
- `POST /v1/auth/token`
- `POST /v1/auth/refresh`
- `GET /v1/user/plan`

`/v1/research` now streams server-sent events (`text/event-stream`) and emits:

- `research.started`
- `research.progress`
- `research.completed`
- `research.error`

Frontend behavior:

- Background reads stream events and relays `ANALYSIS_STARTED`/`ANALYSIS_PROGRESS` to side panel.
- `research.completed` is mapped into the existing `InsightResponse` shape and emitted as `ANALYSIS_RESULT`.
- `research.error` is normalized into `ANALYSIS_ERROR`.

`InsightResponse` required fields used by UI:

- `requestId`, `cached`, `cachedAt?`
- `sections` (`eventSummary`, `keyVariables`, `historicalContext`, `currentDrivers`, `riskFactors`, `dataConfidence`, `dataGaps`)
- `dataRetrievalAvailable`, `generatedAt`

## Validation, Sanitization, and Error Normalization

- `sanitize()` strips HTML-like tags and truncates:
  - event title to 500 chars
  - event source to 253 chars
- `authedFetch()` maps HTTP statuses:
  - `401` -> `AuthError`
  - `402` -> `SubscriptionError`
  - other non-2xx -> `ApiError`
- Auth header wiring is currently stubbed in client for dev mode (`token = ''`); auth code path remains prepared for re-enable.
- `streamInsight()` requests `Accept: text/event-stream` and includes `X-API-Key` when `VITE_API_KEY` is present.
- `streamInsight()` sets a default timeout (`45_000 ms`) unless a caller-provided abort signal is used.
- Picker candidate selection uses ancestor scoring plus market indicators (percentages/outcome-like text).
- `parseKalshiListingTile()` / `parseKalshiDetailPage()` require non-empty text, a valid title, and at least one parsed outcome.
- Picker emits `DETECTION_FAILED` when no candidate is found or parsing fails.
- Background maps errors to UI-safe messages/events:
  - `AuthError` -> `AUTH_REQUIRED`
  - stream abort -> `ANALYSIS_CANCELLED`
  - `ResearchStreamError` (`research.error`) -> `ANALYSIS_ERROR` with backend-provided message
  - `SubscriptionError` -> `ANALYSIS_ERROR` with plan-upgrade message
  - any other error -> `ANALYSIS_ERROR` with generic retry message

## Auth Token Lifecycle

Implemented in `src/auth/tokenManager.ts`.

- Tokens are stored in `chrome.storage.local` under `iqinsyt_auth`.
- Access token JWT `exp` claim is inspected before authed calls.
- If access token expires in under 60s, refresh is attempted via `/v1/auth/refresh`.
- Refresh failure clears stored tokens and returns `null`.
