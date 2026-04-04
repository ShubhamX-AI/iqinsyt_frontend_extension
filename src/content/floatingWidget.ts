const WIDGET_ID = 'iq-floating-widget';
const STYLE_ID = 'iq-widget-style';

let isOpen = false;
let panelEl: HTMLElement | null = null;
let tabEl: HTMLElement | null = null;

export function injectFloatingWidget(): void {
  if (document.getElementById(WIDGET_ID)) return;
  injectStyles();
  createWidgetDOM();
}

export function togglePanel(): void {
  isOpen = !isOpen;
  applyState();
}

export function collapseFloatingPanel(): void {
  if (!isOpen) return;
  isOpen = false;
  applyState();
}

export function expandFloatingPanel(): void {
  if (isOpen) return;
  isOpen = true;
  applyState();
}

function applyState(): void {
  if (!panelEl || !tabEl) return;
  if (isOpen) {
    panelEl.classList.add('iq-open');
    tabEl.classList.add('iq-hidden');
  } else {
    panelEl.classList.remove('iq-open');
    tabEl.classList.remove('iq-hidden');
  }
}

function createWidgetDOM(): void {
  const wrapper = document.createElement('div');
  wrapper.id = WIDGET_ID;

  tabEl = document.createElement('div');
  tabEl.id = 'iq-floating-tab';
  tabEl.textContent = 'IQinsyt';
  tabEl.addEventListener('click', togglePanel);

  panelEl = document.createElement('div');
  panelEl.id = 'iq-floating-panel';

  const iframe = document.createElement('iframe');
  iframe.id = 'iq-widget-iframe';
  iframe.src = chrome.runtime.getURL('src/sidepanel/index.html');
  iframe.allow = '';

  panelEl.appendChild(iframe);
  wrapper.appendChild(tabEl);
  wrapper.appendChild(panelEl);
  document.body.appendChild(wrapper);
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${WIDGET_ID},
    #${WIDGET_ID} * { box-sizing: border-box; margin: 0; padding: 0; }

    #iq-floating-tab {
      position: fixed;
      right: 0;
      top: 20%;
      width: 36px;
      height: 110px;
      background: #aa3bff;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      writing-mode: vertical-rl;
      text-orientation: mixed;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      user-select: none;
    }

    #iq-floating-tab:hover { background: #9525ef; }

    #iq-floating-tab.iq-hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateX(36px);
    }

    #iq-floating-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      z-index: 2147483646;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
      box-shadow: none;
      background: #fff;
    }

    #iq-floating-panel.iq-open {
      transform: translateX(0);
      box-shadow: -4px 0 24px rgba(0,0,0,0.18);
    }

    #iq-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    @media (max-width: 600px) {
      #iq-floating-panel { width: 100vw; }
    }

    @media (prefers-color-scheme: dark) {
      #iq-floating-panel { background: #16171d; }
    }
  `;
  document.head.appendChild(style);
}
