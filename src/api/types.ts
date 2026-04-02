// ─── Request ──────────────────────────────────────────────────────────────────

export interface InsightRequest {
  eventTitle: string;   // e.g. "Manchester City vs Arsenal"
  eventSource: string;  // hostname, e.g. "sportsbet.com.au"
  timestamp: number;    // Unix ms
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
