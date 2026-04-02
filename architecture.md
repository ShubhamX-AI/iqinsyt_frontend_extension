# IQinsyt Chrome Extension — Full Architecture & Developer Guide

> **Scope:** This document covers the Chrome extension only — its structure, frontend, backend integration, AI pipeline, data flow, and everything a developer needs to build it from scratch. The web app is a separate deliverable.

---

## Table of Contents

1. [What Is This Extension?](#1-what-is-this-extension)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Extension Project Structure](#3-extension-project-structure)
4. [Manifest V3 Setup](#4-manifest-v3-setup)
5. [Frontend — Side Panel UI](#5-frontend--side-panel-ui)
6. [Event Detection Engine](#6-event-detection-engine)
7. [Backend Integration](#7-backend-integration)
8. [AI Pipeline — How the AI Works](#8-ai-pipeline--how-the-ai-works)
9. [Neutrality & Compliance Layer](#9-neutrality--compliance-layer)
10. [End-to-End Data Flow (Step by Step)](#10-end-to-end-data-flow-step-by-step)
11. [Error Handling & Fallbacks](#11-error-handling--fallbacks)
12. [Authentication & Security](#12-authentication--security)
13. [State Management](#13-state-management)
14. [Build & Development Setup](#14-build--development-setup)
15. [Loading the Extension in Chrome](#15-loading-the-extension-in-chrome)
16. [Testing Strategy](#16-testing-strategy)

---

## 1. What Is This Extension?

IQinsyt is a **neutral AI-powered research utility** delivered as a Chrome extension (Manifest V3). It sits alongside any sports or prediction-market page (Kalshi, Polymarket, Sportsbet, Bet365, TAB, etc.), detects the event the user is viewing, and returns structured, factual research output in 2–5 seconds.

**What it is NOT:**
- Not a betting tool
- Does not show odds, predictions, or recommendations
- Does not integrate with platform APIs or read cookies/session data from host pages
- Does not modify the host page DOM in any way

**What it IS:**
- A research assistant that surfaces factual context about an event
- Platform-agnostic — works on any page via DOM parsing
- Delivers a structured 7-section research output every time

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER                           │
│                                                                 │
│   Host Page (Sportsbet, Kalshi, etc.)                           │
│        │                                                        │
│        │  MutationObserver / DOM parsing                        │
│        ▼                                                        │
│   Content Script  ──────────────────────►  Side Panel UI       │
│   (event detection)       Chrome messaging  (React/TypeScript)  │
│                                                  │              │
│   Background Service Worker                      │              │
│   (manages auth, coordinates messaging)          │              │
└──────────────────────────────────────────────────┼─────────────┘
                                                   │
                                          HTTPS + JWT
                                                   │
                                                   ▼
                                        ┌──────────────────┐
                                        │   API Gateway     │
                                        │ (rate limit, JWT) │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  Backend Insight  │
                                        │     Engine        │
                                        │ (NestJS/FastAPI)  │
                                        └────────┬─────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              │                  │                  │
                              ▼                  ▼                  ▼
                         Redis Cache       Vector DB          PostgreSQL
                         (response)    (semantic match)    (users, audit)
                              │
                              ▼
                     Brave Search API
                     Firecrawl Scraper
                              │
                              ▼
                        LLM API Call
                     (GPT-4o-mini / GPT-4o)
                              │
                              ▼
                  Neutrality & Compliance Layer
                     (mandatory filter pass)
                              │
                              ▼
                   Structured 7-Section Response
                       → Back to Extension
```

---

## 3. Extension Project Structure

```
iqinsyt-extension/
├── public/
│   ├── manifest.json          # Manifest V3 config
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── sidepanel.html         # Entry HTML for side panel
│
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background service worker
│   │
│   ├── content/
│   │   ├── content-script.ts  # Injected into host page
│   │   └── detector.ts        # MutationObserver + DOM parser
│   │
│   ├── sidepanel/
│   │   ├── index.tsx           # Side panel React entry point
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── EventCard.tsx
│   │   │   ├── ResearchOutput.tsx
│   │   │   ├── SectionBlock.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── ManualInput.tsx
│   │   │   └── ErrorState.tsx
│   │   ├── hooks/
│   │   │   ├── useEventDetection.ts
│   │   │   ├── useInsightQuery.ts
│   │   │   └── useAuth.ts
│   │   └── styles/
│   │       └── global.css
│   │
│   ├── api/
│   │   └── client.ts          # Axios/fetch wrapper for backend calls
│   │
│   ├── auth/
│   │   └── token.ts           # JWT storage and refresh logic
│   │
│   ├── shared/
│   │   ├── types.ts            # Shared TypeScript interfaces
│   │   ├── constants.ts
│   │   └── messages.ts         # Chrome message type definitions
│   │
│   └── utils/
│       └── sanitize.ts         # Input sanitization helpers
│
├── .env.example
├── tsconfig.json
├── webpack.config.js           # Or Vite config
├── package.json
└── architecture.md             # This file
```

---

## 4. Manifest V3 Setup

`public/manifest.json` — every field below is required:

```json
{
  "manifest_version": 3,
  "name": "IQinsyt",
  "version": "1.0.0",
  "description": "Neutral AI-powered research for sports and prediction events.",

  "permissions": [
    "sidePanel",
    "storage",
    "activeTab",
    "scripting"
  ],

  "host_permissions": [
    "<all_urls>"
  ],

  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_idle"
    }
  ],

  "side_panel": {
    "default_path": "sidepanel.html"
  },

  "action": {
    "default_title": "Open IQinsyt",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Key notes for the developer:**
- `sidePanel` permission is required for the side panel API (Chrome 114+)
- `host_permissions: <all_urls>` lets the content script run on any page — this is intentional (platform-agnostic)
- No `popup` is defined — the extension opens a side panel, never a popup
- The background script is a **service worker** (MV3 requirement) — it cannot use `localStorage`, only `chrome.storage`

---

## 5. Frontend — Side Panel UI

### Technology
- **React 18** + **TypeScript**
- **Vite** (recommended) or Webpack for bundling
- **CSS Modules** or **Tailwind CSS** for styling
- No UI component library required — keep it lightweight

### Side Panel Entry Point

`public/sidepanel.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IQinsyt</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="sidepanel/index.js"></script>
  </body>
</html>
```

### App Shell (`App.tsx`)

The app has three states:

```
App
 ├── [no event detected]   → ManualInput component
 ├── [event detected]      → EventCard + "Analyse" button
 └── [result loaded]       → ResearchOutput (7 sections)
```

```tsx
// src/sidepanel/App.tsx
type AppState = 'idle' | 'detected' | 'loading' | 'result' | 'error';
```

### Component Breakdown

| Component | Purpose |
|---|---|
| `EventCard` | Displays the detected event name and source page |
| `ManualInput` | Text input form — shown when auto-detect fails |
| `StatusBar` | Shows loading state: "Detecting...", "Analysing...", "Done" |
| `ResearchOutput` | Renders all 7 research sections |
| `SectionBlock` | Renders a single section (title + body) |
| `ErrorState` | Displays error messages for each failure type |

### Design Rules (Non-negotiable)

- **No green or red colours anywhere in the UI** — use neutral greys, whites, and blues only
- **No directional arrows** (up/down) — never imply an outcome direction
- **No percentage chances, odds, or probability language** in the UI layer
- Side panel width: fixed at Chrome's default side panel width (~400px)
- Font: system font stack — `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### The 7 Output Sections

Every research result renders exactly these 7 sections in order:

```
1. Event Summary
2. Key Variables
3. Historical Context
4. Current Drivers
5. Risk Factors
6. Data Confidence / Reliability
7. Data Gaps / Unknowns
```

Each section renders as a collapsible `SectionBlock` with a title and plain-text body. If a section is missing (partial output), render it with label `"[Data unavailable for this section]"` — never skip it silently.

---

## 6. Event Detection Engine

### How Detection Works

The content script runs on every page the user visits. It uses two mechanisms:

**Step 1 — MutationObserver (passive, automatic)**

```typescript
// src/content/detector.ts

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' || mutation.type === 'characterData') {
      const event = extractEventFromDOM();
      if (event) {
        sendEventToBackground(event);
        observer.disconnect(); // stop watching once found
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
```

**Step 2 — DOM Parsing (`extractEventFromDOM`)**

The parser looks for event-like text using heuristics:
- `<h1>`, `<h2>` tags containing vs / v / @ patterns (e.g., "Team A vs Team B")
- `<title>` tag parsing as a fallback
- Any element with data attributes like `data-event`, `data-match`, `data-fixture`
- Text pattern matching: `"[Team/Player] vs [Team/Player]"`, `"[Event] on [Date]"`

```typescript
function extractEventFromDOM(): DetectedEvent | null {
  // Try headings first
  const headings = document.querySelectorAll('h1, h2, h3');
  for (const h of headings) {
    const text = h.textContent?.trim();
    if (text && /\bvs\.?\b|\bv\b|@/i.test(text)) {
      return { title: text, source: window.location.hostname };
    }
  }
  // Fallback to page title
  const titleMatch = document.title.match(/(.+?\s+vs\.?\s+.+?)(\s*[-|]|$)/i);
  if (titleMatch) {
    return { title: titleMatch[1].trim(), source: window.location.hostname };
  }
  return null;
}
```

**Step 3 — Fallback Chain**

```
Auto-detect (MutationObserver + DOM parse)
    ↓ fails
User highlights text on page → context menu or selection capture
    ↓ fails
Manual text input in side panel
```

The content script sends the detected event to the background service worker via `chrome.runtime.sendMessage`. The background worker forwards it to the side panel.

### Chrome Messaging Flow

```
Content Script  ──sendMessage──►  Background Service Worker
                                         │
                              chrome.runtime.sendMessage
                                         │
                                         ▼
                                    Side Panel (React)
                              listens via chrome.runtime.onMessage
```

Message types (defined in `src/shared/messages.ts`):

```typescript
type MessageType =
  | 'EVENT_DETECTED'      // content script → background → side panel
  | 'REQUEST_ANALYSIS'    // side panel → background → API
  | 'ANALYSIS_RESULT'     // background → side panel
  | 'DETECTION_FAILED'    // background → side panel (trigger manual input)
  | 'AUTH_REQUIRED';      // background → side panel

interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}
```

---

## 7. Backend Integration

### API Client (`src/api/client.ts`)

The extension communicates with the backend over HTTPS only. Use `fetch` (available in MV3 service workers) or Axios.

```typescript
const BASE_URL = process.env.BACKEND_URL; // e.g. https://api.iqinsyt.com

async function requestInsight(event: DetectedEvent, token: string): Promise<InsightResponse> {
  const response = await fetch(`${BASE_URL}/v1/insight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      eventTitle: event.title,
      eventSource: event.source,
      timestamp: Date.now(),
    }),
    signal: AbortSignal.timeout(12000), // client-side timeout (12s, backend has 8s)
  });

  if (response.status === 401) throw new AuthError('Session expired');
  if (response.status === 402) throw new SubscriptionError('Plan inactive');
  if (!response.ok) throw new ApiError(`Request failed: ${response.status}`);

  return response.json();
}
```

### Backend Endpoints Used by Extension

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/insight` | POST | Submit event, get 7-section research |
| `/v1/auth/token` | POST | Exchange credentials for JWT |
| `/v1/auth/refresh` | POST | Refresh expiring JWT |
| `/v1/user/plan` | GET | Check subscription status |

### Request Payload

```typescript
interface InsightRequest {
  eventTitle: string;     // e.g. "Manchester City vs Arsenal"
  eventSource: string;    // hostname, e.g. "sportsbet.com.au"
  timestamp: number;      // Unix ms
}
```

### Response Structure

```typescript
interface InsightResponse {
  requestId: string;
  cached: boolean;
  cachedAt?: string;        // ISO timestamp if cached
  sections: {
    eventSummary: string;
    keyVariables: string;
    historicalContext: string;
    currentDrivers: string;
    riskFactors: string;
    dataConfidence: string;
    dataGaps: string;
  };
  dataRetrievalAvailable: boolean; // false if Firecrawl failed
  generatedAt: string;
}
```

---

## 8. AI Pipeline — How the AI Works

This section describes what happens inside the backend when the extension sends a request. The developer building the extension does not implement this, but must understand it to handle responses correctly.

### Step-by-Step AI Pipeline

```
Extension POST /v1/insight
         │
         ▼
1. JWT validated by API Gateway
         │
         ▼
2. Redis cache lookup
   → Cache HIT:  return immediately (response tagged "Cached [Date]")
   → Cache MISS: continue
         │
         ▼
3. Vector DB semantic match
   → Similar prior query found: return adapted cached result
   → No match: continue
         │
         ▼
4. Public data retrieval
   ├── Brave Search API  (avg 2.5 queries/session)
   │     Searches: "[event] news", "[team/player] recent form", "[event] analysis"
   └── Firecrawl scraper (avg 3 credits/session)
         Scrapes top 2–3 results from Brave Search
         → If Firecrawl fails: flag `dataRetrievalAvailable: false`, continue with event text only
         │
         ▼
5. Prompt Assembly
   System prompt:    "You are a neutral research analyst..."
   Event context:    Injected event title + source page
   Research context: Scraped/searched content (if available)
   Output structure: Enforced 7-section format
   Negative constraints: Explicit prohibitions (see Section 9)
         │
         ▼
6. LLM API Call
   Default model: GPT-4o-mini
   Premium model:  GPT-4o (for paid tier users)
   Hard timeout:   8 seconds
   → Timeout: return partial output with missing section labels
         │
         ▼
7. Neutrality & Compliance Layer
   → PASS: cache result in Redis, store in Vector DB, return to extension
   → FAIL: re-queue for LLM regeneration (max 2 attempts)
   → Still failing after 2 attempts: return partial output
         │
         ▼
8. Structured JSON response → extension
```

### LLM Prompt Structure (Overview)

```
[SYSTEM]
You are a neutral research analyst. Your role is to surface factual,
structured information about the following event. You must not make
predictions, issue recommendations, suggest probabilities, or use
persuasive language of any kind.

[EVENT CONTEXT]
Event: {eventTitle}
Detected on: {eventSource}

[RESEARCH CONTEXT]
{scrapedContent}

[OUTPUT INSTRUCTIONS]
Return exactly these 7 sections:
1. Event Summary
2. Key Variables
3. Historical Context
4. Current Drivers
5. Risk Factors
6. Data Confidence / Reliability
7. Data Gaps / Unknowns

[NEGATIVE CONSTRAINTS]
Do NOT use: "likely", "expected", "odds favour", "recommend",
"consider backing", or any language that ranks or predicts outcomes.
```

### LLM Provider Failover

```
GPT-4o-mini (primary)
    ↓ provider outage / timeout
GPT-4o (secondary fallback)
    ↓ also unavailable
Serve most recent cached result (labelled with cache date)
    ↓ no cache exists
Return error: "Insight temporarily unavailable"
```

---

## 9. Neutrality & Compliance Layer

This is a **mandatory, non-bypassable** filter that every LLM response passes through before it reaches the extension. The extension developer must understand this layer because:
- Partial outputs are a valid, expected response state
- Every compliance intervention is audit-logged

### Blocked Patterns (Hard Rules)

The compliance layer scans every LLM output for the following and rejects it if found:

```
Predictive language:
  "likely to win", "expected to", "odds favour", "probability of",
  "projected", "anticipated", "forecast"

Recommendation language:
  "recommended bet", "consider backing", "favourable", "good pick",
  "strong case for", "worth backing"

Emotionally charged phrasing:
  "dominant", "unstoppable", "inevitably", "sure to", "guaranteed"

Ranking outcomes by likelihood:
  Any language that implies one outcome is more probable than another
```

### Compliance Flow

```
LLM output received
      │
      ▼
Pattern scan (regex + semantic check)
      │
 PASS │       FAIL │
      │            ▼
      │     Re-queue for LLM regeneration
      │            │
      │      Attempt 2 ──PASS──►  Cache + Return
      │            │
      │           FAIL
      │            │
      │      Attempt 3 ──PASS──►  Cache + Return
      │            │
      │           FAIL
      │            ▼
      │     Return partial output (whatever sections passed)
      │     Log intervention: timestamp + trigger phrase + action
      ▼
Cache result in Redis
Store embedding in Vector DB
Return to extension
```

### What the Extension Must Handle

- A valid `sections` object may have some fields as empty strings or `"[Unavailable]"` — render them gracefully
- The `cached: true` flag means show "Cached [cachedAt date]" label in the UI
- `dataRetrievalAvailable: false` means show "Data retrieval unavailable" label

---

## 10. End-to-End Data Flow (Step by Step)

This is the complete journey of a single user request:

```
STEP 1 — User opens a supported page
  User navigates to e.g. sportsbet.com.au/match/123
  Chrome loads the page normally. Extension content script is already injected.

STEP 2 — Content script activates
  MutationObserver watches document.body for DOM changes.
  Once the page settles, extractEventFromDOM() runs.
  Detected event: { title: "Arsenal vs Chelsea", source: "sportsbet.com.au" }

STEP 3 — Event sent to background service worker
  chrome.runtime.sendMessage({ type: 'EVENT_DETECTED', payload: event })

STEP 4 — Background worker opens side panel
  chrome.sidePanel.open({ windowId: currentWindow.id })
  Forwards EVENT_DETECTED to side panel.

STEP 5 — Side panel displays detected event
  EventCard renders "Arsenal vs Chelsea (sportsbet.com.au)"
  "Analyse" button appears.
  StatusBar shows: "Event detected"

  [If no event detected → ManualInput shown instead. User types event. Go to Step 5b.]

STEP 6 — User clicks "Analyse"
  Side panel fires REQUEST_ANALYSIS message to background worker.
  StatusBar shows: "Analysing..."

STEP 7 — Background worker calls backend
  GET /v1/user/plan → verify subscription is active
  POST /v1/insight with JWT + event payload

STEP 8 — API Gateway receives request
  Validates JWT signature and expiry.
  Checks rate limit (per user, per plan tier).
  If invalid/expired JWT → 401 → extension shows "Session expired, please log in"
  If rate limit exceeded → 429 → extension shows "Request limit reached"

STEP 9 — Backend checks Redis cache
  Key: hash(eventTitle + date)
  HIT  → return cached response immediately (response time: ~50ms)
  MISS → continue to Step 10

STEP 10 — Backend checks Vector DB
  Encodes event title as embedding.
  Searches for semantically similar prior queries.
  MATCH (cosine similarity > 0.92) → return adapted cached result
  NO MATCH → continue to Step 11

STEP 11 — Public data retrieval
  Brave Search API: queries "[event] news", "[teams] recent form"
  Firecrawl: scrapes top 2 search results
  Results assembled into research context string.
  [If Firecrawl fails → set dataRetrievalAvailable=false, continue with event text only]

STEP 12 — Prompt assembly
  System prompt + event context + research context + output structure + negative constraints
  Total token budget managed to stay within model context limits.

STEP 13 — LLM call
  Model: GPT-4o-mini (default) or GPT-4o (premium)
  Hard timeout: 8 seconds
  [If timeout → return partial output with available sections]

STEP 14 — Neutrality & Compliance Layer
  Regex + semantic scan of LLM output.
  PASS → cache in Redis (TTL: 4 hours), store embedding in Vector DB, go to Step 15.
  FAIL → re-queue (max 2 more attempts), then return partial output.
  All interventions audit-logged to PostgreSQL.

STEP 15 — Response returned to extension
  Backend returns InsightResponse JSON.
  Background worker receives it, sends ANALYSIS_RESULT to side panel.

STEP 16 — Side panel renders result
  StatusBar: "Done"
  ResearchOutput component renders all 7 SectionBlocks.
  If cached: shows "Cached [date]" label.
  If dataRetrievalAvailable=false: shows "Data retrieval unavailable" label.
  User can copy, save, or re-run.

TOTAL TIME TARGET: 2–5 seconds (cache hit: <200ms)
```

---

## 11. Error Handling & Fallbacks

Every error state must be visible to the user — no silent failures.

| Failure | Extension Behaviour | UI Message |
|---|---|---|
| No event detected | Show ManualInput | "No event detected — enter manually" |
| Auth failure (401) | Redirect to login | "Session expired. Please log in." |
| Subscription inactive (402) | Block request | "Update your plan to continue." |
| Rate limit (429) | Show error | "Request limit reached. Try again shortly." |
| LLM timeout (>8s) | Return partial output | "Partial result — some sections unavailable" |
| LLM provider outage | Failover → serve cache | Show cached result with date label |
| Compliance rejection (3rd attempt) | Return partial output | "Partial result — compliance filter applied" |
| Firecrawl failure | Proceed without scraped data | "Data retrieval unavailable" label on result |
| Network offline | Show error | "No connection. Please check your network." |
| Backend 5xx | Show error + retry button | "Something went wrong. Try again." |

### Error Handling in Code

```typescript
// src/api/client.ts
try {
  const result = await requestInsight(event, token);
  dispatch({ type: 'ANALYSIS_RESULT', payload: result });
} catch (e) {
  if (e instanceof AuthError) {
    dispatch({ type: 'AUTH_REQUIRED' });
  } else if (e instanceof SubscriptionError) {
    dispatch({ type: 'SHOW_ERROR', message: 'Update your plan to continue.' });
  } else if (e.name === 'TimeoutError') {
    dispatch({ type: 'SHOW_ERROR', message: 'Request timed out. Try again.' });
  } else {
    dispatch({ type: 'SHOW_ERROR', message: 'Something went wrong. Try again.' });
  }
}
```

---

## 12. Authentication & Security

### JWT Flow

```
1. User logs in via web app → receives JWT access token + refresh token
2. Extension stores tokens in chrome.storage.local (NOT localStorage)
3. Every API request includes: Authorization: Bearer <accessToken>
4. When accessToken expires (check exp claim before request):
     → call POST /v1/auth/refresh with refreshToken
     → store new accessToken
5. If refresh fails → clear tokens, show login prompt
```

### Token Storage

```typescript
// src/auth/token.ts

const TOKEN_KEY = 'iqinsyt_auth';

export async function saveTokens(access: string, refresh: string) {
  await chrome.storage.local.set({
    [TOKEN_KEY]: { access, refresh, savedAt: Date.now() }
  });
}

export async function getAccessToken(): Promise<string | null> {
  const data = await chrome.storage.local.get(TOKEN_KEY);
  const tokens = data[TOKEN_KEY];
  if (!tokens) return null;
  // Check if token is about to expire (within 60 seconds)
  const payload = JSON.parse(atob(tokens.access.split('.')[1]));
  if (payload.exp * 1000 - Date.now() < 60_000) {
    return await refreshAccessToken(tokens.refresh);
  }
  return tokens.access;
}
```

### Security Rules

- **Never store tokens in `localStorage`** — not accessible in service workers, and less secure
- **Never log tokens** in console or error messages
- **Never send tokens in URL query params** — header only
- All backend communication over **HTTPS only** — no HTTP fallback
- Input from the DOM (event title) must be **sanitized** before sending: strip HTML tags, limit to 500 characters
- Content Security Policy in manifest: restrict `script-src` and `connect-src` to known domains

---

## 13. State Management

The side panel is a standalone React app. Use React's built-in `useReducer` + `useContext` for state — no need for Redux at MVP scale.

### App State Shape

```typescript
interface AppState {
  phase: 'idle' | 'detected' | 'loading' | 'result' | 'error' | 'manual';
  detectedEvent: DetectedEvent | null;
  result: InsightResponse | null;
  error: string | null;
  user: {
    isAuthenticated: boolean;
    plan: 'free' | 'starter' | 'pro' | null;
  };
}
```

### State Transitions

```
idle ──────────────────────► detected  (EVENT_DETECTED message)
idle ──────────────────────► manual    (DETECTION_FAILED message)
manual ────────────────────► loading   (user submits manual input)
detected ──────────────────► loading   (user clicks Analyse)
loading ────────────────────► result   (ANALYSIS_RESULT received)
loading ────────────────────► error    (any error thrown)
result ─────────────────────► loading  (user clicks Re-run)
error ──────────────────────► idle     (user dismisses error)
any ────────────────────────► idle     (AUTH_REQUIRED → show login)
```

---

## 14. Build & Development Setup

### Prerequisites

```bash
node >= 20.x
npm >= 10.x   # or pnpm / yarn
```

### Initial Setup

```bash
git clone <repo>
cd iqinsyt-extension
npm install
cp .env.example .env
```

`.env` file:
```
BACKEND_URL=https://api.iqinsyt.com
# For local dev:
# BACKEND_URL=http://localhost:3000
```

### Build Commands

```bash
# Development build (watch mode)
npm run dev

# Production build (outputs to /dist)
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

### Vite Config for Chrome Extension

Use the `vite-plugin-web-extension` or `@crxjs/vite-plugin` package — these handle the multi-entry-point build (background, content script, side panel) automatically.

```bash
npm install -D @crxjs/vite-plugin
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
});
```

This plugin:
- Compiles `manifest.json` and all entry points in one pass
- Handles hot reload for the side panel during development
- Generates the correct `dist/` folder structure for Chrome

---

## 15. Loading the Extension in Chrome

After running `npm run build`:

1. Open Chrome → navigate to `chrome://extensions`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder from the project
5. The IQinsyt extension appears in the extensions list
6. Pin it to the toolbar (puzzle icon → pin)
7. Navigate to any sports/prediction page
8. Click the IQinsyt icon → side panel opens

**For development (watch mode):**

1. Run `npm run dev` — Vite watches for changes
2. After each change, go to `chrome://extensions` → click the **refresh icon** on the IQinsyt card
3. The side panel auto-refreshes on React changes (hot reload) without needing to reload the whole extension

---

## 16. Testing Strategy

### Unit Tests
- Test `extractEventFromDOM()` with mock DOM structures from each supported platform
- Test the compliance pattern scanner with known violating and passing strings
- Test JWT expiry logic in `token.ts`
- Test each error type is correctly mapped to the right UI message

```bash
npm run test        # Jest + jsdom
```

### Integration Tests
- Mock the backend with MSW (Mock Service Worker) to test full request/response cycle
- Test each error response code (401, 402, 429, 500) produces the correct UI state
- Test that `cached: true` renders the cache label
- Test that missing sections render `"[Data unavailable for this section]"` not blank

### Manual Test Checklist (before every release)

```
[ ] Load extension on sportsbet.com.au — event auto-detects correctly
[ ] Load extension on Kalshi — event auto-detects correctly
[ ] Test with a page where detection fails — manual input appears
[ ] Submit manual input — full flow completes
[ ] Simulate network offline — shows network error, no crash
[ ] Let JWT expire — refresh runs, request succeeds
[ ] Force JWT refresh failure — login prompt appears
[ ] Confirm no green/red colours appear anywhere in UI
[ ] Confirm no predictive language appears in any rendered output
[ ] Confirm "Cached [date]" label appears on cache hit
[ ] Confirm "Data retrieval unavailable" label when flagged
[ ] Confirm all 7 sections render (even if some show [Unavailable])
```

---

*This document covers the Chrome extension in full. The web app (subscription management, manual input portal) is documented separately.*
