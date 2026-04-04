import type { DetectedMarket, DetectedOutcome } from '../../../shared/types.ts'

const PCT_REGEX = /\b\d{1,3}(?:\.\d+)?%\b/;
const VOLUME_REGEX = /\$[\d,]+(?:\.\d+)?[kmb]?\b/i;

// ─── Public API ────────────────────────────────────────────────────────────────

/** Find a Kalshi market element for picker highlighting. Returns null if not on Kalshi or no match. */
export function findKalshiCandidate(el: HTMLElement): HTMLElement | null {
  return findKalshiTile(el) ?? findKalshiDetailContainer(el);
}

/** Parse a clicked element as a Kalshi listing tile. Returns null if not a tile. */
export function parseKalshiListingTile(el: HTMLElement): DetectedMarket | null {
  const tile = el.closest('[data-testid="market-tile"]') ??
               el.querySelector('[data-testid="market-tile"]') ??
               (el.getAttribute('data-testid') === 'market-tile' ? el : null);

  if (!tile) return null;
  return parseTile(tile);
}

/** Parse a clicked element as a Kalshi detail page. Returns null if not a detail page. */
export function parseKalshiDetailPage(el: HTMLElement): DetectedMarket | null {
  const h1 = document.querySelector('h1');
  const title = h1?.textContent?.trim();
  if (!title || title.length < 5) return null;

  const container = findOutcomesContainer(el);
  if (!container) return null;

  const outcomes = extractDetailOutcomes(container);
  if (!outcomes.length) return null;

  const volume = extractVolume(container.innerText ?? '');
  const id = buildId(title);

  return { id, title, source: 'kalshi.com', url: window.location.href, outcomes, volume };
}

/** Auto-detect a Kalshi detail page market without user interaction. */
export function detectKalshiDetail(): DetectedMarket | null {
  if (window.location.hostname !== 'kalshi.com') return null;

  const title = extractPageTitle();
  if (!title) return null;

  const outcomes = extractPageOutcomes();
  if (!outcomes.length) return null;

  const volume = extractVolume(document.body?.innerText ?? '');
  const id = buildId(title);

  return { id, title, source: 'kalshi.com', url: window.location.href, outcomes, volume };
}

// ─── Finding Helpers (for picker highlighting) ─────────────────────────────────

function findKalshiTile(el: HTMLElement): HTMLElement | null {
  if (el.getAttribute('data-testid') === 'market-tile') return el;
  const parent = el.closest('[data-testid="market-tile"]');
  if (parent) return parent as HTMLElement;
  const child = el.querySelector('[data-testid="market-tile"]');
  if (child) return child as HTMLElement;
  return null;
}

function findKalshiDetailContainer(el: HTMLElement): HTMLElement | null {
  if (window.location.hostname !== 'kalshi.com') return null;

  for (const box of document.querySelectorAll('div[class*="box-border"][class*="overflow-hidden"]')) {
    if (countOutcomeHeaders(box as HTMLElement) >= 2) return box as HTMLElement;
  }

  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body) {
    if (countOutcomeHeaders(cur) >= 2) return cur;
    cur = cur.parentElement;
  }

  return null;
}

function countOutcomeHeaders(container: Element): number {
  let count = 0;
  container.querySelectorAll('h2.typ-headline-x10').forEach(h => {
    const t = h.textContent?.trim() ?? '';
    if (/\d+%/.test(t) || /<1%/.test(t)) count++;
  });
  return count;
}

// ─── Parsing Helpers ───────────────────────────────────────────────────────────

function parseTile(tile: Element): DetectedMarket | null {
  const titleEl = tile.querySelector('h2');
  const title = titleEl?.textContent?.trim();
  if (!title || title.length < 5) return null;

  const outcomes = extractTileOutcomes(tile);
  if (!outcomes.length) return null;

  const volume = extractVolume((tile as HTMLElement).innerText ?? '');
  const id = buildId(title);

  return { id, title, source: 'kalshi.com', url: window.location.href, outcomes, volume };
}

function extractTileOutcomes(tile: Element): DetectedOutcome[] {
  const outcomes: DetectedOutcome[] = [];
  const seen = new Set<string>();

  for (const bar of tile.querySelectorAll('[aria-valuenow]')) {
    const row = findOutcomeRow(bar as Element);
    if (!row || row.hasAttribute('data-iq-parsed')) continue;
    row.setAttribute('data-iq-parsed', 'true');

    const label = findLabel(row);
    const probability = findProbability(row);
    if (!label || !probability) continue;

    if (isValidLabel(label)) {
      const key = `${label}|${probability}`;
      if (!seen.has(key)) {
        seen.add(key);
        outcomes.push({ label, probability });
      }
    }
  }

  tile.querySelectorAll('[data-iq-parsed]').forEach(e => e.removeAttribute('data-iq-parsed'));
  return outcomes.slice(0, 10);
}

function extractDetailOutcomes(container: HTMLElement): DetectedOutcome[] {
  const outcomes: DetectedOutcome[] = [];
  const seen = new Set<string>();

  for (const row of container.querySelectorAll('div[class*="box-border"][class*="overflow-hidden"]')) {
    const el = row as HTMLElement;
    const pctHeader = el.querySelector('h2.typ-headline-x10');
    if (!pctHeader) continue;

    const pctText = pctHeader.textContent?.trim() ?? '';
    const probability = parseProbability(pctText);
    if (!probability) continue;

    const label = extractLabel(el, pctText);
    if (!label || !isValidLabel(label)) continue;

    const key = `${label}|${probability}`;
    if (!seen.has(key)) {
      seen.add(key);
      outcomes.push({ label, probability });
    }
  }

  return outcomes.slice(0, 10);
}

function extractPageTitle(): string | null {
  const h1 = document.querySelector('h1');
  const text = h1?.textContent?.trim();
  return text && text.length >= 5 ? text : null;
}

function extractPageOutcomes(): DetectedOutcome[] {
  const outcomes: DetectedOutcome[] = [];
  const seen = new Set<string>();

  for (const row of document.querySelectorAll('div[class*="box-border"][class*="overflow-hidden"]')) {
    const el = row as HTMLElement;
    const pctHeader = el.querySelector('h2.typ-headline-x10');
    if (!pctHeader) continue;

    const pctText = pctHeader.textContent?.trim() ?? '';
    const probability = parseProbability(pctText);
    if (!probability) continue;

    const label = extractLabel(el, pctText);
    if (!label || !isValidLabel(label)) continue;

    const key = `${label}|${probability}`;
    if (!seen.has(key)) {
      seen.add(key);
      outcomes.push({ label, probability });
    }
  }

  return outcomes.slice(0, 10);
}

function findOutcomesContainer(el: HTMLElement): HTMLElement | null {
  for (const box of document.querySelectorAll('div[class*="box-border"][class*="overflow-hidden"]')) {
    if (countOutcomeHeaders(box as HTMLElement) >= 2) return box as HTMLElement;
  }

  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body) {
    if (countOutcomeHeaders(cur) >= 2) return cur;
    cur = cur.parentElement;
  }

  return null;
}

function findOutcomeRow(el: Element): Element | null {
  let cur: Element | null = el;
  for (let i = 0; i < 8 && cur; i++) {
    if (cur.classList?.contains('col-span-full')) return cur;
    const text = cur.textContent ?? '';
    if (/\d{1,3}%/.test(text) && text.length > 3 && text.length < 100 && cur.children.length >= 2) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function findLabel(row: Element): string | null {
  for (const span of row.querySelectorAll('span')) {
    const text = span.textContent?.trim();
    if (!text || span.closest('button')) continue;
    if (PCT_REGEX.test(text) || /^\d+$/.test(text)) continue;
    if (text.length < 2 || text.length > 100) continue;
    if (/\bvol\b|\bLIVE\b|\bspread\b|\btotal\b/i.test(text)) continue;
    return text;
  }
  return null;
}

function findProbability(row: Element): string | null {
  const bar = row.querySelector('[aria-valuenow]');
  const val = bar?.getAttribute('aria-valuenow');
  if (val) return `${val}%`;

  for (const btn of row.querySelectorAll('button')) {
    const match = btn.textContent?.trim().match(/(\d{1,3}(?:\.\d+)?)%/);
    if (match) return `${match[1]}%`;
  }

  for (const span of row.querySelectorAll('span')) {
    const match = span.textContent?.trim().match(/^(\d{1,3}(?:\.\d+)?)%$/);
    if (match) return `${match[1]}%`;
  }

  return null;
}

function extractLabel(row: HTMLElement, pctText: string): string | null {
  const labelSpan = row.querySelector('span.typ-body-x30');
  const text = labelSpan?.textContent?.trim();
  if (text && text.length >= 2 && text !== pctText) return text;

  for (const span of row.querySelectorAll('span')) {
    const t = span.textContent?.trim();
    if (!t || t === pctText) continue;
    if (PCT_REGEX.test(t) || /^\d+$/.test(t)) continue;
    if (t.length < 2 || t.length > 100) continue;
    if (/buy yes|sell no|amount|sign up|vol\b|loading/i.test(t)) continue;
    return t;
  }

  return null;
}

function parseProbability(text: string): string | null {
  const match = text.match(/(\d+)%/);
  if (match) return `${match[1]}%`;
  if (text.includes('<1%')) return '0%';
  return null;
}

function extractVolume(text: string): string | null {
  const match = text.match(VOLUME_REGEX);
  return match?.[0] ?? null;
}

function buildId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

function isValidLabel(label: string): boolean {
  if (label.length < 2 || label.length > 80) return false;
  if (/^\d+$/.test(label)) return false;
  if (PCT_REGEX.test(label)) return false;
  if (/\$[\d,]+/.test(label)) return false;
  if (/\bvol\b|\bvolume\b/i.test(label)) return false;
  return true;
}
