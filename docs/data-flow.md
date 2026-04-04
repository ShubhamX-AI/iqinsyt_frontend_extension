# Data Flow

## Happy Path: Picker Selection to Result

```mermaid
sequenceDiagram
  participant User as User
  participant Page as Host Page DOM
  participant Content as Content Script
  participant BG as Background Worker
  participant API as Backend API
  participant Panel as Side Panel UI

  User->>Panel: Click "Pick element"
  Panel->>Panel: phase = picking
  Panel->>BG: START_PICKER
  BG->>Content: START_PICKER (active tab)
  Content->>Page: Inject picker style + attach capture listeners
  User->>Page: Hover and click market-like element
  Content->>Content: findKalshiCandidate() + parseKalshiListingTile()/parseKalshiDetailPage()
  Content->>BG: MARKETS_DETECTED [market]
  BG->>Panel: MARKETS_DETECTED
  Panel->>Panel: phase = detected, detectedEvent = markets[0]
  Panel->>BG: REQUEST_ANALYSIS {title, source}
  BG->>API: POST /v1/insight (Bearer token)
  API-->>BG: InsightResponse
  BG-->>Panel: ANALYSIS_RESULT
  Panel->>Panel: phase = result
```

## Picker Failure Fallback: Manual Input Path

```mermaid
sequenceDiagram
  participant Content as Content Script
  participant BG as Background Worker
  participant Panel as Side Panel UI

  Content->>Content: No candidate OR parseKalshiListingTile/parseKalshiDetailPage returns null
  Content->>BG: DETECTION_FAILED
  Panel->>Panel: phase = manual
  Panel->>BG: REQUEST_ANALYSIS (manual event)
  BG-->>Panel: ANALYSIS_RESULT | ANALYSIS_ERROR
```

## Picker Cancel Path

```mermaid
sequenceDiagram
  participant User as User
  participant Content as Content Script
  participant BG as Background Worker
  participant Panel as Side Panel UI

  User->>Content: Press Esc while picker is active
  Content->>BG: PICKER_CANCELLED
  BG->>Panel: PICKER_CANCELLED
  Panel->>Panel: phase = detected (if prior event) else idle
```

## Auth and Error Mapping Path

```mermaid
sequenceDiagram
  participant Panel as Side Panel UI
  participant BG as Background Worker
  participant Client as API Client
  participant Auth as Token Manager
  participant API as Backend API

  Panel->>BG: REQUEST_ANALYSIS
  BG->>Client: fetchInsight(event)
  Client->>Auth: getAccessToken()
  Auth-->>Client: token | null
  alt no token or 401
    Client-->>BG: throw AuthError
    BG-->>Panel: AUTH_REQUIRED
  else 402 subscription
    Client-->>BG: throw SubscriptionError
    BG-->>Panel: ANALYSIS_ERROR("Update your plan to continue.")
  else other API failures/timeouts
    Client-->>BG: throw ApiError
    BG-->>Panel: ANALYSIS_ERROR("Something went wrong. Try again.")
  else success
    Client->>API: POST /v1/insight
    API-->>Client: InsightResponse
    Client-->>BG: response
    BG-->>Panel: ANALYSIS_RESULT
  end
```

## Kalshi Auto-Detect Path

```mermaid
sequenceDiagram
  participant Page as Kalshi Detail Page
  participant Content as Content Script
  participant BG as Background Worker
  participant Panel as Side Panel UI

  Page->>Content: Page loads (kalshi.com detail URL)
  Content->>Content: detectKalshiDetail() after 1.5s
  Content->>BG: MARKETS_DETECTED [market] (if found)
  BG->>Panel: MARKETS_DETECTED
  Panel->>Panel: phase = detected, detectedEvent = markets[0]
```

## Checks and Guards in Flow

- Event text is sanitized before request (`<...>` tags stripped, trimmed, max 500 chars).
- Picker click interception uses capture phase and prevents default page click action while active.
- Candidate lookup uses site-specific finders (`findKalshiCandidate`) with generic scoring fallback.
- `parseKalshiListingTile()` / `parseKalshiDetailPage()` require a valid title and at least one parsed outcome before emitting `MARKETS_DETECTED`.
- JWT expiry is checked before each authed request; refresh is attempted if near expiry (`< 60s`).
- Request timeout is enforced (`AbortSignal.timeout(12_000)`).
- UI receives normalized message types, not raw exceptions.
