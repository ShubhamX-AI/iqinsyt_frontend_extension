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
import StreamingStatus from '../components/StreamingStatus.tsx'

// ─── Initial State ────────────────────────────────────────────────────────────

const emptyStreamState: AppState['stream'] = {
  requestId: null,
  stage: null,
  message: null,
  progress: [],
};

const initialState: AppState = {
  phase: 'idle',
  detectedEvent: null,
  result: null,
  error: null,
  stream: emptyStreamState,
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
      // If user is currently viewing analysis, don't wipe it — just update the detected event
      if (state.phase === 'result') {
        return {
          ...state,
          detectedEvent: markets.length ? toDetectedEvent(markets[0]) : null,
        };
      }
      // Original behavior for all other phases
      if (!markets.length) {
        return { ...state, phase: 'manual', detectedEvent: null, result: null, error: null, stream: emptyStreamState };
      }
      return {
        ...state,
        phase: 'detected',
        detectedEvent: toDetectedEvent(markets[0]),
        result: null,
        error: null,
        stream: emptyStreamState,
      };
    }

    case 'EVENT_DETECTED':
      // If user is currently viewing analysis, don't wipe it — just update the detected event
      if (state.phase === 'result') {
        return { ...state, detectedEvent: action.payload };
      }
      return {
        ...state,
        phase: 'detected',
        detectedEvent: action.payload,
        result: null,
        error: null,
        stream: emptyStreamState,
      };

    case 'DETECTION_FAILED':
      // If user is currently viewing analysis, don't wipe it — just clear the detected event
      if (state.phase === 'result') {
        return { ...state, detectedEvent: null };
      }
      return {
        ...state,
        phase: 'manual',
        detectedEvent: null,
        result: null,
        error: null,
        stream: emptyStreamState,
      };

    case 'START_PICKING':
      return { ...state, phase: 'picking', error: null, stream: emptyStreamState };

    case 'PICKER_CANCELLED':
      return { ...state, phase: state.detectedEvent ? 'detected' : 'idle', stream: emptyStreamState };

    case 'REQUEST_ANALYSIS':
      return { ...state, phase: 'connecting', error: null, result: null, stream: emptyStreamState };

    case 'ANALYSIS_STARTED':
      return {
        ...state,
        phase: 'streaming',
        error: null,
        stream: {
          requestId: action.payload.request_id,
          stage: action.payload.stage,
          message: action.payload.message,
          progress: [{
            request_id: action.payload.request_id,
            stage: action.payload.stage,
            message: action.payload.message,
          }],
        },
      };

    case 'ANALYSIS_PROGRESS':
      return {
        ...state,
        phase: 'streaming',
        stream: {
          requestId: action.payload.request_id,
          stage: action.payload.stage,
          message: action.payload.message,
          progress: [...state.stream.progress, action.payload].slice(-40),
        },
      };

    case 'ANALYSIS_CANCELLED':
      return {
        ...state,
        phase: state.detectedEvent ? 'detected' : 'idle',
        error: null,
        stream: emptyStreamState,
      };

    case 'ANALYSIS_RESULT':
      return { ...state, phase: 'result', result: action.payload, error: null };

    case 'SHOW_ERROR':
      return { ...state, phase: 'error', error: action.payload };

    case 'DISMISS_ERROR':
      return {
        ...state,
        phase: state.detectedEvent ? 'detected' : 'idle',
        error: null,
        stream: emptyStreamState,
      };

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
  const { triggerAnalysis, cancelAnalysis } = useInsightQuery();
  useEventDetection();
  useAuth();

  const { phase, detectedEvent, result, error, stream, isSiteAuthorized } = state;

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
    triggerAnalysis(detectedEvent, false);
  }

  function handleManualSubmit(title: string) {
    const event: DetectedEvent = { title, source: 'manual' };
    dispatch({ type: 'EVENT_DETECTED', payload: event });
    triggerAnalysis(event);
  }

  function handleRerun() {
    if (detectedEvent) triggerAnalysis(detectedEvent, true);
  }

  function handleCancelAnalysis() {
    cancelAnalysis();
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
      <div className={`iq-content ${phase === 'detected' ? 'iq-content--centered' : ''}`}>

        {phase === 'idle' && (
          <div className="iq-idle iq-idle--hero">
            <span className="iq-kicker">Smart event research</span>
            <p className="iq-idle__title">Ready to analyse this page</p>
            <p className="iq-idle__sub">
              Select an event card on the website and turn it into a structured research brief.
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
          <div className="iq-idle iq-idle--hero">
            <span className="iq-kicker">Selection mode</span>
            <p className="iq-idle__title">Click an event card</p>
            <p className="iq-idle__sub">
              Hover to highlight an element, then click to select it. Press Esc to cancel.
            </p>
          </div>
        )}

        {phase === 'manual' && (
          <>
            <ManualInput onSubmit={handleManualSubmit} />
            <div className="iq-manual__secondary">
              {isSiteAuthorized === false ? (
                <p className="iq-site-auth__notice">You are not authorized on this website.</p>
              ) : (
                <button className="iq-btn iq-btn--ghost" onClick={handleStartPicking}>
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

        {(phase === 'connecting' || phase === 'streaming') && (
          <StreamingStatus
            phase={phase}
            stage={stream.stage}
            message={stream.message}
            progress={stream.progress}
            onCancel={handleCancelAnalysis}
          />
        )}

        {phase === 'result' && result && detectedEvent && (
          <>
            <EventCard
              event={detectedEvent}
              onAnalyse={handleRerun}
              onPickAnotherEvent={handleStartPicking}
              canPickAnotherEvent={isSiteAuthorized === true}
              showRerun={true}
              onRerun={handleRerun}
            />
            <ResearchOutput response={result} />
          </>
        )}

        {phase === 'error' && error && (
          <ErrorState message={error} onDismiss={handleDismiss} onRetry={detectedEvent ? handleRerun : undefined} />
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
