// ─── Chrome Messaging ────────────────────────────────────────────────────────

export type MessageType =
  | 'EVENT_DETECTED'   // content script → background → side panel
  | 'REQUEST_ANALYSIS' // side panel → background → API
  | 'ANALYSIS_RESULT'  // background → side panel
  | 'DETECTION_FAILED' // background → side panel (trigger manual input)
  | 'AUTH_REQUIRED';   // background → side panel

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

// ─── Event Detection ─────────────────────────────────────────────────────────

export interface DetectedEvent {
  title: string;   // e.g. "Manchester City vs Arsenal"
  source: string;  // hostname, e.g. "sportsbet.com.au"
}

// ─── App State ────────────────────────────────────────────────────────────────

export type AppPhase = 'idle' | 'detected' | 'loading' | 'result' | 'error' | 'manual';

export interface UserInfo {
  isAuthenticated: boolean;
  plan: 'free' | 'starter' | 'pro' | null;
}

export interface AppState {
  phase: AppPhase;
  detectedEvent: DetectedEvent | null;
  result: InsightResponse | null;
  error: string | null;
  user: UserInfo;
}

// ─── App Actions (useReducer) ─────────────────────────────────────────────────

import type { InsightResponse } from '../api/types.ts'

export type AppAction =
  | { type: 'EVENT_DETECTED'; payload: DetectedEvent }
  | { type: 'DETECTION_FAILED' }
  | { type: 'REQUEST_ANALYSIS' }
  | { type: 'ANALYSIS_RESULT'; payload: InsightResponse }
  | { type: 'SHOW_ERROR'; payload: string }
  | { type: 'DISMISS_ERROR' }
  | { type: 'AUTH_REQUIRED' }
  | { type: 'SET_USER'; payload: UserInfo };
