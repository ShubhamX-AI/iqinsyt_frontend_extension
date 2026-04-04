import { useEffect, useReducer } from 'react'
import { AppContext, useAppContext } from './context.tsx'
import type { AppState, AppAction, DetectedEvent, DetectedMarket } from '../shared/types.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { useEventDetection } from '../hooks/useEventDetection.ts'
import { useInsightQuery } from '../hooks/useInsightQuery.ts'
import StatusBar from '../components/StatusBar.tsx'
import EventCard from '../components/EventCard.tsx'
import ManualInput from '../components/ManualInput.tsx'
import ResearchOutput from '../components/ResearchOutput.tsx'
import ErrorState from '../components/ErrorState.tsx'

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  phase: 'idle',
  detectedEvent: null,
  result: null,
  error: null,
  isSiteAuthorized: null,
  user: { isAuthenticated: false, plan: null },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function toDetectedEvent(market: DetectedMarket): DetectedEvent {
  return {
    id: market.id,
    title: market.title,
    source: market.source,
    url: market.url,
    outcomes: market.outcomes,
    volume: market.volume,
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'MARKETS_DETECTED': {
      const markets = action.payload;
      if (!markets.length) {
        return { ...state, phase: 'manual', detectedEvent: null, result: null, error: null };
      }
      return {
        ...state,
        phase: 'detected',
        detectedEvent: toDetectedEvent(markets[0]),
        result: null,
        error: null,
      };
    }

    case 'EVENT_DETECTED':
      return {
        ...state,
        phase: 'detected',
        detectedEvent: action.payload,
        result: null,
        error: null,
      };

    case 'DETECTION_FAILED':
      return {
        ...state,
        phase: 'manual',
        detectedEvent: null,
        result: null,
        error: null,
      };

    case 'START_PICKING':
      return { ...state, phase: 'picking' };

    case 'PICKER_CANCELLED':
      return { ...state, phase: state.detectedEvent ? 'detected' : 'idle' };

    case 'REQUEST_ANALYSIS':
      return { ...state, phase: 'loading', error: null };

    case 'ANALYSIS_RESULT':
      return { ...state, phase: 'result', result: action.payload, error: null };

    case 'SHOW_ERROR':
      return { ...state, phase: 'error', error: action.payload };

    case 'DISMISS_ERROR':
      return { ...state, phase: 'idle', error: null };

    case 'AUTH_REQUIRED':
      return { ...initialState };

    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_SITE_AUTH_STATUS':
      return {
        ...state,
        isSiteAuthorized: action.payload,
        phase: !action.payload && state.phase === 'picking'
          ? (state.detectedEvent ? 'detected' : 'idle')
          : state.phase,
      };
  }
}

// ─── Panel Content ────────────────────────────────────────────────────────────
// Separate component so hooks can consume the context provided by App below.

function PanelContent() {
  const { state, dispatch } = useAppContext();
  const { triggerAnalysis } = useInsightQuery();
  useEventDetection();
  useAuth();

  const { phase, detectedEvent, result, error, isSiteAuthorized } = state;

  useEffect(() => {
    const requestStatus = () => {
      chrome.runtime.sendMessage({ type: 'REQUEST_SITE_AUTH_STATUS' }).catch(() => {});
    };
    requestStatus();
    const timer = window.setInterval(requestStatus, 1500);
    return () => window.clearInterval(timer);
  }, []);

  function handleStartPicking() {
    if (isSiteAuthorized !== true) return;
    dispatch({ type: 'START_PICKING' });
    chrome.runtime.sendMessage({ type: 'START_PICKER' }).catch(() => {});
  }

  function handleAnalyse() {
    if (!detectedEvent) return;
    triggerAnalysis(detectedEvent);
  }

  function handleManualSubmit(title: string) {
    const event: DetectedEvent = { title, source: 'manual' };
    dispatch({ type: 'EVENT_DETECTED', payload: event });
    triggerAnalysis(event);
  }

  function handleRerun() {
    if (detectedEvent) triggerAnalysis(detectedEvent);
  }

  function handleDismiss() {
    dispatch({ type: 'DISMISS_ERROR' });
  }

  function handleClosePanel() {
    chrome.runtime.sendMessage({ type: 'CLOSE_PANEL' }).catch(() => {});
  }

  return (
    <div className="iq-panel">
      <StatusBar onClose={handleClosePanel} />
      <div className="iq-content">

        {phase === 'idle' && (
          <div className="iq-idle">
            <p className="iq-idle__title">Ready to analyse</p>
            <p className="iq-idle__sub">
              Point to event content on the page to get started.
            </p>
            {isSiteAuthorized === false ? (
              <p className="iq-site-auth__notice">You are not authorized on this website.</p>
            ) : (
              <button className="iq-btn iq-btn--primary" onClick={handleStartPicking}>
                Select element
              </button>
            )}
          </div>
        )}

        {phase === 'picking' && (
          <div className="iq-idle">
            <p className="iq-idle__title">Click an event card</p>
            <p className="iq-idle__sub">
              Hover to highlight an element, then click to select it. Press Esc to cancel.
            </p>
          </div>
        )}

        {phase === 'manual' && (
          <>
            <ManualInput onSubmit={handleManualSubmit} />
            <div style={{ padding: '0 16px 16px' }}>
              {isSiteAuthorized === false ? (
                <p className="iq-site-auth__notice">You are not authorized on this website.</p>
              ) : (
                <button className="iq-btn iq-btn--ghost" onClick={handleStartPicking}
                  style={{ width: '100%' }}>
                  Select element instead
                </button>
              )}
            </div>
          </>
        )}

        {phase === 'detected' && detectedEvent && (
          <EventCard
            event={detectedEvent}
            onAnalyse={handleAnalyse}
            onPickAnotherEvent={handleStartPicking}
            canPickAnotherEvent={isSiteAuthorized === true}
          />
        )}

        {phase === 'loading' && (
          <div className="iq-loading">
            <div className="iq-loading__spinner" />
            <p className="iq-loading__text">Analysing event data...</p>
          </div>
        )}

        {phase === 'result' && result && detectedEvent && (
          <>
            <EventCard
              event={detectedEvent}
              onAnalyse={handleRerun}
              onPickAnotherEvent={handleStartPicking}
              canPickAnotherEvent={isSiteAuthorized === true}
            />
            <ResearchOutput response={result} onRerun={handleRerun} />
          </>
        )}

        {phase === 'error' && error && (
          <ErrorState message={error} onDismiss={handleDismiss} />
        )}

      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <PanelContent />
    </AppContext.Provider>
  );
}
