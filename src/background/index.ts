import { fetchInsight, AuthError, SubscriptionError } from '../api/client.ts'
import type { ExtensionMessage, DetectedEvent } from '../shared/types.ts'

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.type) {
    case 'EVENT_DETECTED':
      // Relay from content script to side panel
      chrome.runtime.sendMessage(message).catch(() => {
        // Side panel not open — ignore
      });
      break;

    case 'REQUEST_ANALYSIS':
      handleAnalysis(message.payload as DetectedEvent);
      break;
  }
});

async function handleAnalysis(event: DetectedEvent): Promise<void> {
  try {
    const result = await fetchInsight(event);
    chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: result }).catch(() => {});
  } catch (err) {
    if (err instanceof AuthError) {
      chrome.runtime.sendMessage({ type: 'AUTH_REQUIRED' }).catch(() => {});
    } else {
      const message = err instanceof SubscriptionError
        ? 'Update your plan to continue.'
        : 'Something went wrong. Try again.';
      chrome.runtime.sendMessage({ type: 'ANALYSIS_ERROR', payload: message }).catch(() => {});
    }
  }
}
