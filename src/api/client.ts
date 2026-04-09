// import { getAccessToken } from '../auth/tokenManager.ts'  // TODO: re-enable auth
import type {
  InsightResponse,
  InsightSections,
  DeepDownCompletedEvent,
  DeepDownDeltaEvent,
  DeepDownErrorEvent,
  DeepDownStartedEvent,
  // AuthTokenResponse,  // TODO: re-enable auth
  // UserPlanResponse,   // TODO: re-enable auth
  ResearchStartedEvent,
  ResearchProgressEvent,
  ResearchSectionDeltaEvent,
  ResearchCompletedEvent,
  ResearchErrorEvent,
} from './types.ts'
import type { DetectedEvent } from '../shared/types.ts'

const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;
const API_KEY = (import.meta.env.VITE_API_KEY as string | undefined) ?? '';

// ─── Errors ───────────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(message: string) { super(message); this.name = 'AuthError'; }
}

export class SubscriptionError extends Error {
  constructor(message: string) { super(message); this.name = 'SubscriptionError'; }
}

export class ApiError extends Error {
  constructor(message: string) { super(message); this.name = 'ApiError'; }
}

export class ResearchStreamError extends Error {
  code: string;
  statusCode: number;
  requestId: string;

  constructor(payload: ResearchErrorEvent | DeepDownErrorEvent) {
    super(payload.message);
    this.name = 'ResearchStreamError';
    this.code = payload.error;
    this.statusCode = payload.status_code;
    this.requestId = payload.request_id;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(text: string, maxLength: number): string {
  return text.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

function toInsightRequest(event: DetectedEvent) {
  return {
    eventTitle: sanitize(event.title, 500),
    eventSource: sanitize(event.source, 253),
    timestamp: Date.now(),
  };
}

function toInsightResponse(payload: ResearchCompletedEvent): InsightResponse {
  return {
    requestId: payload.request_id,
    cached: payload.data.cached,
    cachedAt: payload.data.cachedAt ?? undefined,
    sections: payload.data.sections,
    dataRetrievalAvailable: payload.data.dataRetrievalAvailable,
    generatedAt: payload.data.generatedAt,
  };
}

function parseSseFrame(frame: string): { eventName: string; dataText: string } | null {
  const lines = frame.split('\n');
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) return null;
  return { eventName, dataText: dataLines.join('\n') };
}

function parseJsonPayload<T>(dataText: string): T | null {
  try {
    return JSON.parse(dataText) as T;
  } catch {
    return null;
  }
}

async function authedFetch(path: string, init: RequestInit): Promise<Response> {
  // TODO: re-enable auth
  // const token = await getAccessToken();
  // if (!token) throw new AuthError('No token');
  const token = ''; // dev mode — no auth

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) throw new AuthError('Session expired');
  if (response.status === 402) throw new SubscriptionError('Plan inactive');
  if (!response.ok) throw new ApiError(`Request failed: ${response.status}`);

  return response;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

interface StreamInsightOptions {
  redo?: boolean;
  signal?: AbortSignal;
  onStarted?: (payload: ResearchStartedEvent) => void;
  onProgress?: (payload: ResearchProgressEvent) => void;
  onSectionDelta?: (payload: ResearchSectionDeltaEvent) => void;
}

function normalizeResearchSection(payload: Record<string, unknown>): keyof InsightSections | null {
  const section = payload.section ?? payload.sectionKey ?? payload.section_key ?? payload.key;
  if (typeof section !== 'string') return null;

  const normalized = section.trim();
  const aliases: Record<string, keyof InsightSections> = {
    eventSummary: 'eventSummary',
    event_summary: 'eventSummary',
    'event summary': 'eventSummary',
    keyVariables: 'keyVariables',
    key_variables: 'keyVariables',
    'key variables': 'keyVariables',
    historicalContext: 'historicalContext',
    historical_context: 'historicalContext',
    'historical context': 'historicalContext',
    currentDrivers: 'currentDrivers',
    current_drivers: 'currentDrivers',
    'current drivers': 'currentDrivers',
    riskFactors: 'riskFactors',
    risk_factors: 'riskFactors',
    'risk factors': 'riskFactors',
    dataConfidence: 'dataConfidence',
    data_confidence: 'dataConfidence',
    'data confidence': 'dataConfidence',
    dataGaps: 'dataGaps',
    data_gaps: 'dataGaps',
    'data gaps': 'dataGaps',
  };

  return aliases[normalized] ?? null;
}

function normalizeResearchDelta(payload: Record<string, unknown>): string | null {
  const delta = payload.delta ?? payload.content ?? payload.text;
  return typeof delta === 'string' ? delta : null;
}

export async function streamInsight(event: DetectedEvent, options: StreamInsightOptions = {}): Promise<InsightResponse> {
  const body = { ...toInsightRequest(event), redo: options.redo ?? false };

  const response = await authedFetch('/v1/research', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(body),
    signal: options.signal ?? AbortSignal.timeout(45_000),
  });

  if (!response.body) throw new ApiError('Readable stream not available');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed: InsightResponse | null = null;

  const processFrame = (frame: string) => {
    const parsedFrame = parseSseFrame(frame);
    if (!parsedFrame) return;

    if (parsedFrame.eventName === 'research.started') {
      const payload = parseJsonPayload<ResearchStartedEvent>(parsedFrame.dataText);
      if (payload) options.onStarted?.(payload);
      return;
    }

    if (parsedFrame.eventName === 'research.progress') {
      const payload = parseJsonPayload<ResearchProgressEvent>(parsedFrame.dataText);
      if (payload) options.onProgress?.(payload);
      return;
    }

    if (parsedFrame.eventName === 'research.section_delta') {
      const payload = parseJsonPayload<Record<string, unknown>>(parsedFrame.dataText);
      if (!payload) return;

      const requestId = typeof payload.request_id === 'string' ? payload.request_id : null;
      const section = normalizeResearchSection(payload);
      const delta = normalizeResearchDelta(payload);

      if (requestId && section && delta) {
        options.onSectionDelta?.({ request_id: requestId, section, delta });
      }
      return;
    }

    if (parsedFrame.eventName === 'research.completed') {
      const payload = parseJsonPayload<ResearchCompletedEvent>(parsedFrame.dataText);
      if (payload && payload.success === true) completed = toInsightResponse(payload);
      return;
    }

    if (parsedFrame.eventName === 'research.error') {
      const payload = parseJsonPayload<ResearchErrorEvent>(parsedFrame.dataText);
      if (payload && payload.success === false) {
        throw new ResearchStreamError(payload);
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true })
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (frame) processFrame(frame);
      boundary = buffer.indexOf('\n\n');
    }
  }

  buffer += decoder.decode();
  const trailingFrame = buffer.trim();
  if (trailingFrame) processFrame(trailingFrame);

  if (!completed) {
    throw new ApiError('Research stream ended before completion');
  }

  return completed;
}

interface DeepDownOptions {
  onStarted?: (payload: DeepDownStartedEvent) => void;
  onDelta?: (delta: string) => void;
  signal?: AbortSignal;
}

export async function deepDown(
  sectionTitle: string,
  sectionContent: string,
  options: DeepDownOptions = {},
): Promise<string> {
  const response = await authedFetch('/v1/research/deepdown', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ sectionTitle, sectionContent }),
    signal: options.signal ?? AbortSignal.timeout(60_000),
  });

  if (!response.body) throw new ApiError('Readable stream not available');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed: string | null = null;
  const accumulated: string[] = [];

  const processFrame = (frame: string) => {
    const parsed = parseSseFrame(frame);
    if (!parsed) return;

    if (parsed.eventName === 'deepdown.started') {
      const payload = parseJsonPayload<DeepDownStartedEvent>(parsed.dataText);
      if (payload) options.onStarted?.(payload);
      return;
    }

    if (parsed.eventName === 'deepdown.delta') {
      const payload = parseJsonPayload<DeepDownDeltaEvent>(parsed.dataText);
      if (payload?.delta) {
        accumulated.push(payload.delta);
        options.onDelta?.(payload.delta);
      }
      return;
    }

    if (parsed.eventName === 'deepdown.completed') {
      const payload = parseJsonPayload<DeepDownCompletedEvent>(parsed.dataText);
      if (payload) completed = payload.result || accumulated.join('');
      return;
    }

    if (parsed.eventName === 'deepdown.error') {
      const payload = parseJsonPayload<DeepDownErrorEvent>(parsed.dataText);
      if (payload && payload.success === false) throw new ResearchStreamError(payload);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (frame) processFrame(frame);
      boundary = buffer.indexOf('\n\n');
    }
  }

  buffer += decoder.decode();
  const trailing = buffer.trim();
  if (trailing) processFrame(trailing);

  if (completed === null) throw new ApiError('Deep down stream ended before completion');
  return completed;
}

// TODO: re-enable auth
// export async function fetchAuthToken(code: string): Promise<AuthTokenResponse> {
//   const response = await fetch(`${BASE_URL}/v1/auth/token`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ code }),
//   });
//
//   if (!response.ok) throw new ApiError(`Auth failed: ${response.status}`);
//   return response.json() as Promise<AuthTokenResponse>;
// }

// export async function fetchUserPlan(): Promise<UserPlanResponse> {
//   const response = await authedFetch('/v1/user/plan', { method: 'GET' });
//   return response.json() as Promise<UserPlanResponse>;
// }
