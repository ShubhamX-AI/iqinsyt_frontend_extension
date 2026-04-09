import { streamInsight, AuthError, SubscriptionError, ResearchStreamError } from '../api/client.ts'
import type { ExtensionMessage, DetectedEvent } from '../shared/types.ts'

let activeAnalysisAbort: AbortController | null = null;

// Toggle the floating panel when the toolbar icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.type) {
    case 'MARKETS_DETECTED':
    case 'EVENT_DETECTED':
    case 'DETECTION_FAILED':
    case 'PICKER_CANCELLED':
      // Relay from content script to side panel
      chrome.runtime.sendMessage(message).catch(() => {
        // Side panel not open — ignore
      });
      break;

    case 'START_PICKER':
      // Forward to the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId != null) {
          chrome.tabs.sendMessage(tabId, { type: 'START_PICKER' }).catch(() => {
            chrome.runtime.sendMessage({ type: 'SITE_AUTH_STATUS', payload: false }).catch(() => {});
            chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED' }).catch(() => {});
          });
        } else {
          chrome.runtime.sendMessage({ type: 'SITE_AUTH_STATUS', payload: false }).catch(() => {});
          chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED' }).catch(() => {});
        }
      });
      break;

    case 'REQUEST_SITE_AUTH_STATUS':
      broadcastSiteAuthStatus().catch(() => {});
      break;

    case 'REQUEST_ANALYSIS': {
      const { event, redo } = message.payload as { event: DetectedEvent; redo: boolean };
      handleAnalysis(event, redo);
      break;
    }

    case 'CANCEL_ANALYSIS':
      if (activeAnalysisAbort) {
        activeAnalysisAbort.abort();
      } else {
        chrome.runtime.sendMessage({ type: 'ANALYSIS_CANCELLED' }).catch(() => {});
      }
      break;

    case 'CLOSE_PANEL':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId != null) {
          chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_FLOATING_PANEL' }).catch(() => {});
        }
      });
      break;
  }
});

async function handleAnalysis(event: DetectedEvent, redo: boolean): Promise<void> {
  console.log('[Background] Starting analysis for:', event.title);
  if (activeAnalysisAbort) activeAnalysisAbort.abort();
  const controller = new AbortController();
  activeAnalysisAbort = controller;

  try {
    const result = await streamInsight(event, {
      redo,
      signal: controller.signal,
      onStarted: (payload) => {
        chrome.runtime.sendMessage({ type: 'ANALYSIS_STARTED', payload }).catch(() => {});
      },
      onProgress: (payload) => {
        chrome.runtime.sendMessage({ type: 'ANALYSIS_PROGRESS', payload }).catch(() => {});
      },
    });

    if (activeAnalysisAbort !== controller) return;
    console.log('[Background] Analysis result received');
    chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: result }).catch(() => {});
  } catch (err) {
    if (activeAnalysisAbort !== controller) return;

    if (err instanceof DOMException && err.name === 'AbortError') {
      chrome.runtime.sendMessage({ type: 'ANALYSIS_CANCELLED' }).catch(() => {});
      return;
    }

    console.log('[Background] Analysis error:', err);
    if (err instanceof AuthError) {
      chrome.runtime.sendMessage({ type: 'AUTH_REQUIRED' }).catch(() => {});
    } else if (err instanceof ResearchStreamError) {
      chrome.runtime.sendMessage({ type: 'ANALYSIS_ERROR', payload: err.message }).catch(() => {});
    } else {
      const message = err instanceof SubscriptionError
        ? 'Update your plan to continue.'
        : 'Something went wrong. Try again.';
      chrome.runtime.sendMessage({ type: 'ANALYSIS_ERROR', payload: message }).catch(() => {});
    }
  } finally {
    if (activeAnalysisAbort === controller) {
      activeAnalysisAbort = null;
    }
  }
}

async function checkActiveTabAuthorized(): Promise<boolean> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (tabId == null) return false;

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING_CONTENT_SCRIPT' });
    return Boolean((response as { ok?: boolean } | undefined)?.ok);
  } catch {
    return false;
  }
}

async function broadcastSiteAuthStatus(): Promise<void> {
  const isAuthorized = await checkActiveTabAuthorized();
  chrome.runtime.sendMessage({ type: 'SITE_AUTH_STATUS', payload: isAuthorized }).catch(() => {});
}
