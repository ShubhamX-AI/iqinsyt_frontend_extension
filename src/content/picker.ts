import { findKalshiCandidate, parseKalshiListingTile, parseKalshiDetailPage } from './sites/kalshi/parseMarket.ts'
import { expandFloatingPanel } from './floatingWidget.ts'
import type { DetectedMarket } from '../shared/types.ts'

const HIGHLIGHT_ATTR = 'data-iq-highlight';
const STYLE_ID = 'iq-picker-style';
const TOAST_ID = 'iq-picker-toast';
const DEBUG_KEY = 'iq-picker-debug';

let currentHighlight: HTMLElement | null = null;
let pickerActive = false;

export function activatePicker(): void {
  if (pickerActive) return;
  pickerActive = true;
  injectStyle();
  showToast(getDebugStatusMessage());
  document.addEventListener('mouseover', handleMouseOver, { capture: true });
  document.addEventListener('mouseout', handleMouseOut, { capture: true });
  document.addEventListener('click', handleClick, { capture: true });
  document.addEventListener('keydown', handleKeyDown, { capture: true });
}

function deactivatePicker(): void {
  if (!pickerActive) return;
  pickerActive = false;
  document.removeEventListener('mouseover', handleMouseOver, { capture: true });
  document.removeEventListener('mouseout', handleMouseOut, { capture: true });
  document.removeEventListener('click', handleClick, { capture: true });
  document.removeEventListener('keydown', handleKeyDown, { capture: true });
  clearHighlight();
  removeStyle();
  expandFloatingPanel();
}

function handleMouseOver(e: MouseEvent): void {
  const candidate = findCandidate(e.target as HTMLElement);
  if (candidate === currentHighlight) return;
  clearHighlight();
  if (candidate) {
    candidate.setAttribute(HIGHLIGHT_ATTR, 'true');
    currentHighlight = candidate;
  }
}

function handleMouseOut(e: MouseEvent): void {
  const related = e.relatedTarget as HTMLElement | null;
  if (currentHighlight && !currentHighlight.contains(related)) clearHighlight();
}

function handleClick(e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();

  const candidate = findCandidate(currentHighlight ?? (e.target as HTMLElement));
  deactivatePicker();

  if (!candidate) {
    sendMessage('DETECTION_FAILED');
    return;
  }

  const market = parseCandidate(candidate);
  if (!market) {
    showToast('Could not detect event data. Try selecting a different element.', 3000);
    sendMessage('DETECTION_FAILED');
    return;
  }

  logDebug('Event data detected:', JSON.stringify(market, null, 2));
  showSuccessToast();
  sendMessage('MARKETS_DETECTED', [market]);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    deactivatePicker();
    sendMessage('PICKER_CANCELLED');
  }
  if (e.key === 'd' && e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    toggleDebug();
    showToast(getDebugStatusMessage(), 2000);
  }
}

// ─── Candidate Detection ─────────────────────────────────────────────────────

function findCandidate(el: HTMLElement): HTMLElement | null {
  const kalshi = findKalshiCandidate(el);
  if (kalshi) { logDebug('Found Kalshi element'); return kalshi; }
  return findGenericCandidate(el);
}

function parseCandidate(el: HTMLElement): DetectedMarket | null {
  return parseKalshiListingTile(el) ?? parseKalshiDetailPage(el) ?? null;
}

// ─── Generic Fallback ────────────────────────────────────────────────────────

function findGenericCandidate(el: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el;
  let best: HTMLElement | null = null;
  let bestScore = 0;

  while (cur && cur !== document.body) {
    const score = scoreElement(cur);
    if (score > bestScore) { bestScore = score; best = cur; }
    if (score >= 2) return cur;
    cur = cur.parentElement;
  }

  return best ?? (hasPercentage(el) ? el : null);
}

function scoreElement(el: HTMLElement): number {
  const text = el.innerText ?? '';
  const pcts = text.match(/\b\d{1,3}(?:\.\d+)?%\b/g);
  let score = pcts?.length ?? 0;
  if (text.length > 20 && text.length < 2000) score += 0.5;
  if (['HTML', 'BODY', 'HEAD'].includes(el.tagName)) score -= 2;
  return score;
}

function hasPercentage(el: HTMLElement): boolean {
  const text = el.innerText ?? '';
  if (/\b\d{1,3}(?:\.\d+)?%\b/.test(text)) return true;
  const parent = el.parentElement;
  if (parent && /\b\d{1,3}(?:\.\d+)?%\b/.test(parent.innerText ?? '')) return true;
  return false;
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function clearHighlight(): void {
  if (currentHighlight) {
    currentHighlight.removeAttribute(HIGHLIGHT_ATTR);
    currentHighlight = null;
  }
}

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
  [${HIGHLIGHT_ATTR}] { outline: 2px solid #aa3bff !important; outline-offset: 2px !important; cursor: crosshair !important; }
  .iq-picker-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a1a2e; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid #aa3bff; animation: iq-toast-in 0.3s ease; }
  .iq-picker-toast.debug-on { border-color: #ffaa3b; }
  @keyframes iq-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  `;
  document.head.appendChild(style);
}

function removeStyle(): void {
  document.getElementById(STYLE_ID)?.remove();
}

function showToast(message: string, duration = 3000): void {
  document.getElementById(TOAST_ID)?.remove();
  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = message;
  toast.className = 'iq-picker-toast' + (isDebugMode() ? ' debug-on' : '');
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function showSuccessToast(): void {
  showToast('Event selected successfully!', 2000);
}

// ─── Messaging ───────────────────────────────────────────────────────────────

function sendMessage(type: string, payload?: unknown): void {
  chrome.runtime.sendMessage({ type, payload }).catch(() => {});
}

// ─── Debug ───────────────────────────────────────────────────────────────────

function isDebugMode(): boolean {
  try { return localStorage.getItem(DEBUG_KEY) === 'true'; } catch { return false; }
}

function toggleDebug(): void {
  try {
    const current = localStorage.getItem(DEBUG_KEY) === 'true';
    localStorage.setItem(DEBUG_KEY, String(!current));
  } catch {}
}

function getDebugStatusMessage(): string {
  return isDebugMode()
    ? 'Picker active (Debug ON - Ctrl+Shift+D to toggle)'
    : 'Select an event-related element on the page';
}

function logDebug(...args: unknown[]): void {
  if (isDebugMode()) console.log('[IQ Picker]', ...args);
}
