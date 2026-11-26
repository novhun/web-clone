import type { ExtensionMessage } from '../src/shared/types';

const injectedTabs = new Set<number>();

async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'GET_STATE' });
    injectedTabs.add(tabId);
    return true;
  } catch {
    // Not yet injected into this tab; inject on demand using activeTab + scripting.
  }

  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/inspector.js'],
    });
    injectedTabs.add(tabId);
    return true;
  } catch {
    return false;
  }
}

async function resolveTargetTabId(msgTabId?: number): Promise<number | null> {
  if (typeof msgTabId === 'number') return msgTabId;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

export default defineBackground(() => {
  browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});

  browser.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      injectedTabs.delete(tabId);
    }
  });

  browser.runtime.onMessage.addListener((rawMessage, sender, sendResponse) => {
    const message = rawMessage as ExtensionMessage;

    // Handle download requests directly from background worker
    if (message.type === 'DOWNLOAD_ASSET') {
      browser.downloads
        .download({
          url: message.url,
          filename: message.filename,
          saveAs: false,
        })
        .then((downloadId) => sendResponse({ ok: true, downloadId }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }

    // Events emitted from a content script: stamp tabId so Side Panel can filter by active tab.
    if (sender.tab?.id && (message.type === 'ELEMENT_SELECTED' || message.type === 'INSPECTOR_STATUS_CHANGED')) {
      browser.runtime.sendMessage({ ...message, tabId: sender.tab.id }).catch(() => {});
      return false;
    }

    // Requests coming from the Side Panel targeting a specific tab.
    const tabTargetedTypes = new Set<ExtensionMessage['type']>([
      'SET_INSPECTING',
      'GET_STATE',
      'SELECT_BY_SELECTOR',
      'HIGHLIGHT_SELECTOR',
      'APPLY_STYLE',
      'UNDO_STYLE',
      'RESET_STYLES',
      'EXTRACT_TOKENS',
      'EXTRACT_ASSETS',
      'SCAN_FULL_PAGE',
      'EXPORT_CODE',
    ]);

    if (tabTargetedTypes.has(message.type)) {
      (async () => {
        const tabId = await resolveTargetTabId('tabId' in message ? message.tabId : undefined);
        if (!tabId) {
          sendResponse({ ok: false, error: 'No active browser tab found.' });
          return;
        }

        // For GET_STATE on a fresh page, check if already injected without forcing injection
        // unless the user clicks Pick Element or requests extraction.
        if (message.type === 'GET_STATE' && !injectedTabs.has(tabId)) {
          try {
            const resp = await browser.tabs.sendMessage(tabId, message);
            injectedTabs.add(tabId);
            sendResponse(resp);
          } catch {
            sendResponse({
              inspecting: false,
              snapshot: null,
              canUndo: false,
              overrideCount: 0,
            });
          }
          return;
        }

        const ready = await ensureContentScript(tabId);
        if (!ready) {
          sendResponse({
            ok: false,
            error: 'Cannot inspect this page (restricted browser URL such as chrome:// or Web Store).',
          });
          return;
        }

        try {
          const resp = await browser.tabs.sendMessage(tabId, message);
          sendResponse(resp);
        } catch (err) {
          sendResponse({ ok: false, error: String(err) });
        }
      })();
      return true;
    }

    return false;
  });
});
