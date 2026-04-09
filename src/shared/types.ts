// ─── Chrome Messaging ────────────────────────────────────────────────────────

export type MessageType =
  | 'MARKETS_DETECTED' // content script → background → side panel
  | 'EVENT_DETECTED'   // content script → background → side panel
  | 'REQUEST_ANALYSIS' // side panel → background → API
  | 'CANCEL_ANALYSIS'  // side panel → background (abort stream)
  | 'ANALYSIS_STARTED' // background → side panel (stream opened)
  | 'ANALYSIS_PROGRESS' // background → side panel (stream event)
  | 'ANALYSIS_SECTION_DELTA' // background → side panel (section text chunk)
  | 'ANALYSIS_CANCELLED' // background → side panel (stream aborted)
  | 'ANALYSIS_RESULT'  // background → side panel
  | 'ANALYSIS_ERROR'   // background → side panel (API call failed)
  | 'DETECTION_FAILED' // background → side panel (trigger manual input)
  | 'AUTH_REQUIRED'    // background → side panel
  | 'START_PICKER'     // side panel → background → content script
  | 'PICKER_CANCELLED' // content script → background → side panel
  | 'REQUEST_SITE_AUTH_STATUS' // side panel → background
  | 'SITE_AUTH_STATUS' // background → side panel
  | 'TOGGLE_FLOATING_PANEL' // background → content script
  | 'CLOSE_PANEL'; // side panel → background → content script

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

// ─── Event Detection ─────────────────────────────────────────────────────────

export interface DetectedOutcome {
  label: string;
  probability: string | null;
}

export interface DetectedMarket {
  id: string;
  title: string;
  source: string;
  url: string | null;
  outcomes: DetectedOutcome[];
  volume: string | null;
}

export interface DetectedEvent {
  title: string;   // e.g. "Manchester City vs Arsenal"
  source: string;  // hostname, e.g. "polymarket.com"
  id?: string;
  url?: string | null;
  outcomes?: DetectedOutcome[];
  volume?: string | null;
}

// ─── App State ────────────────────────────────────────────────────────────────

import type {
  InsightResponse,
  InsightSections,
  ResearchStartedEvent,
  ResearchProgressEvent,
  ResearchSectionDeltaEvent,
} from '../api/types.ts'

export type AppPhase =
  | 'idle'
  | 'picking'
  | 'detected'
  | 'connecting'
  | 'streaming'
  | 'result'
  | 'error'
  | 'manual';

export interface UserInfo {
  isAuthenticated: boolean;
  plan: 'free' | 'starter' | 'pro' | null;
}

export interface AnalysisStreamState {
  requestId: string | null;
  stage: string | null;
  message: string | null;
  progress: ResearchProgressEvent[];
  sections: InsightSections;
}

export interface AppState {
  phase: AppPhase;
  detectedEvent: DetectedEvent | null;
  result: InsightResponse | null;
  error: string | null;
  stream: AnalysisStreamState;
  isSiteAuthorized: boolean | null;
  user: UserInfo;
}

// ─── App Actions (useReducer) ─────────────────────────────────────────────────

export type AppAction =
  | { type: 'MARKETS_DETECTED'; payload: DetectedMarket[] }
  | { type: 'EVENT_DETECTED'; payload: DetectedEvent }
  | { type: 'DETECTION_FAILED' }
  | { type: 'REQUEST_ANALYSIS' }
  | { type: 'ANALYSIS_STARTED'; payload: ResearchStartedEvent }
  | { type: 'ANALYSIS_PROGRESS'; payload: ResearchProgressEvent }
  | { type: 'ANALYSIS_SECTION_DELTA'; payload: ResearchSectionDeltaEvent }
  | { type: 'ANALYSIS_CANCELLED' }
  | { type: 'ANALYSIS_RESULT'; payload: InsightResponse }
  | { type: 'SHOW_ERROR'; payload: string }
  | { type: 'DISMISS_ERROR' }
  | { type: 'AUTH_REQUIRED' }
  | { type: 'SET_USER'; payload: UserInfo }
  | { type: 'START_PICKING' }
  | { type: 'PICKER_CANCELLED' }
  | { type: 'SET_SITE_AUTH_STATUS'; payload: boolean };
