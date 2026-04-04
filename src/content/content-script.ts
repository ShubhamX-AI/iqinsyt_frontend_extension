import { detectKalshiDetail } from './sites/kalshi/autoDetect.ts'
import { activatePicker } from './picker.ts'
import { injectFloatingWidget, collapseFloatingPanel, togglePanel } from './floatingWidget.ts'

// ─── Floating widget (all supported sites) ──────────────────────────────────

injectFloatingWidget();

// ─── Auto-detect on Kalshi detail pages ──────────────────────────────────────

function tryAutoDetect(): void {
  const market = detectKalshiDetail();
  if (market) {
    console.log('[IQ Auto-detect]', market);
    chrome.runtime.sendMessage({ type: 'MARKETS_DETECTED', payload: [market] }).catch(() => {});
  }
}

if (window.location.hostname === 'kalshi.com') {
  setTimeout(tryAutoDetect, 1500);
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const url = window.location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(tryAutoDetect, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
}

// ─── Manual picker & messaging ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: { type: string }, _sender, sendResponse) => {
  if (message.type === 'PING_CONTENT_SCRIPT') {
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'START_PICKER') {
    collapseFloatingPanel();
    activatePicker();
  }

  if (message.type === 'TOGGLE_FLOATING_PANEL') {
    togglePanel();
  }
});
