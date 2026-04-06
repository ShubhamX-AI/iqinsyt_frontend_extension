import { detectKalshiDetail, detectKalshiSlides } from './sites/kalshi/parseMarket.ts'
import { activatePicker } from './picker.ts'
import { injectFloatingWidget, collapseFloatingPanel, togglePanel } from './floatingWidget.ts'

// ─── Floating widget (all supported sites) ──────────────────────────────────

injectFloatingWidget();

// ─── Auto-detect on Kalshi pages ─────────────────────────────────────────────

function tryAutoDetect(): void {
  const markets: ReturnType<typeof detectKalshiDetail>[] = [];

  const detail = detectKalshiDetail();
  if (detail) markets.push(detail);

  if (!detail) {
    // On home/browse pages, detect visible slide cards instead
    const slides = detectKalshiSlides();
    markets.push(...slides);
  }

  if (markets.length) {
    console.log('[IQ Auto-detect]', markets);
    chrome.runtime.sendMessage({ type: 'MARKETS_DETECTED', payload: markets }).catch(() => {});
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
