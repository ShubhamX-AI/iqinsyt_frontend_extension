// ─── Request ──────────────────────────────────────────────────────────────────

export interface InsightRequest {
  eventTitle: string;   // e.g. "Manchester City vs Arsenal"
  eventSource: string;  // hostname, e.g. "polymarket.com"
  timestamp: number;    // Unix ms
  redo: boolean;        // true when user explicitly re-runs a completed analysis
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface InsightSections {
  eventSummary: string;
  keyVariables: string;
  historicalContext: string;
  currentDrivers: string;
  riskFactors: string;
  dataConfidence: string;
  dataGaps: string;
}

export interface InsightResponse {
  requestId: string;
  cached: boolean;
  cachedAt?: string;               // ISO timestamp, present only when cached
  sections: InsightSections;
  dataRetrievalAvailable: boolean; // false if Firecrawl scraping failed
  generatedAt: string;             // ISO timestamp
}

// ─── Streaming Events (/v1/research, SSE) ────────────────────────────────────

export interface ResearchStartedEvent {
  request_id: string;
  stage: string;
  message: string;
}

export interface ResearchProgressEvent {
  request_id: string;
  stage: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ResearchSectionDeltaEvent {
  request_id: string;
  section: keyof InsightSections;
  delta: string;
}

export interface ResearchCompletedEvent {
  success: true;
  data: {
    cached: boolean;
    cachedAt: string | null;
    sections: InsightSections;
    dataRetrievalAvailable: boolean;
    generatedAt: string;
  };
  request_id: string;
  timestamp: string;
}

export interface StreamErrorEvent {
  success: false;
  error: string;
  message: string;
  status_code: number;
  request_id: string;
  timestamp: string;
}

export type ResearchErrorEvent = StreamErrorEvent;

// ─── Deep Down ────────────────────────────────────────────────────────────────

export interface DeepDownRequest {
  sectionTitle: string;
  sectionContent: string;
}

export interface DeepDownResponse {
  request_id: string;
  result: string;
}

export interface DeepDownStartedEvent {
  request_id: string;
  section: string;
}

export interface DeepDownDeltaEvent {
  delta: string;
}

export type DeepDownCompletedEvent = DeepDownResponse;

export type DeepDownErrorEvent = StreamErrorEvent;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserPlanResponse {
  plan: 'free' | 'starter' | 'pro';
  queriesRemaining: number;
  resetsAt: string; // ISO timestamp
}
