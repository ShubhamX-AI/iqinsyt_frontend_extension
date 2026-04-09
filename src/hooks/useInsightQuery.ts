import { useEffect } from 'react'
import { useAppContext } from '../sidepanel/context.tsx'
import type { ExtensionMessage, DetectedEvent } from '../shared/types.ts'
import type { InsightResponse, ResearchStartedEvent, ResearchProgressEvent } from '../api/types.ts'

export function useInsightQuery() {
  const { dispatch } = useAppContext();

  // Listen for responses coming back from the background worker
  useEffect(() => {
    function handleMessage(message: ExtensionMessage) {
      if (message.type === 'ANALYSIS_STARTED') {
        dispatch({ type: 'ANALYSIS_STARTED', payload: message.payload as ResearchStartedEvent });
      } else if (message.type === 'ANALYSIS_PROGRESS') {
        dispatch({ type: 'ANALYSIS_PROGRESS', payload: message.payload as ResearchProgressEvent });
      } else if (message.type === 'ANALYSIS_RESULT') {
        dispatch({ type: 'ANALYSIS_RESULT', payload: message.payload as InsightResponse });
      } else if (message.type === 'ANALYSIS_ERROR') {
        dispatch({ type: 'SHOW_ERROR', payload: message.payload as string });
      } else if (message.type === 'ANALYSIS_CANCELLED') {
        dispatch({ type: 'ANALYSIS_CANCELLED' });
      } else if (message.type === 'AUTH_REQUIRED') {
        dispatch({ type: 'SHOW_ERROR', payload: 'Not signed in. Please sign in to continue.' });
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [dispatch]);

  // Called by components when the user triggers an analysis
  function triggerAnalysis(event: DetectedEvent, redo = false) {
    dispatch({ type: 'REQUEST_ANALYSIS' });
    chrome.runtime.sendMessage({ type: 'REQUEST_ANALYSIS', payload: { event, redo } }).catch(() => {});
  }

  function cancelAnalysis() {
    dispatch({ type: 'ANALYSIS_CANCELLED' });
    chrome.runtime.sendMessage({ type: 'CANCEL_ANALYSIS' }).catch(() => {});
  }

  return { triggerAnalysis, cancelAnalysis };
}
