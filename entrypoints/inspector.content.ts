import { captureElementSnapshot } from '../src/core/inspector-snapshot';
import { scanFullPage } from '../src/core/page-scanner';
import { formatElementLabel, resolveSelector } from '../src/core/selector';
import { StyleMutator } from '../src/core/style-mutator';
import { exportElementCode } from '../src/core/style-to-tailwind';
import { extractPageAssets, extractPageTokens } from '../src/core/token-and-asset-extractor';
import type { ExtensionMessage, InspectorStateResponse } from '../src/shared/types';

declare global {
  interface Window {
    __WEBSCOPE_INITIALIZED__?: boolean;
  }
}

const HOST_ID = 'webscope-shadow-host';

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  main(ctx) {
    if (window.__WEBSCOPE_INITIALIZED__) return;
    window.__WEBSCOPE_INITIALIZED__ = true;

    const mutator = new StyleMutator();
    let inspecting = false;
    let hoveredEl: Element | null = null;
    let selectedEl: HTMLElement | null = null;

    // Create isolated Shadow DOM overlay host for box-model guides + floating badge.
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText =
      'position:fixed;inset:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .ws-layer { position: fixed; pointer-events: none; box-sizing: border-box; display: none; }
      .ws-margin { background: rgba(249, 115, 22, 0.18); border: 1px dashed rgba(249, 115, 22, 0.85); }
      .ws-padding { background: rgba(34, 197, 94, 0.18); }
      .ws-content { background: rgba(59, 130, 246, 0.22); border: 1.5px solid #3b82f6; }
      .ws-selected { border: 2px solid #8b5cf6; background: rgba(139, 92, 246, 0.08); }
      .ws-badge {
        position: fixed;
        display: none;
        pointer-events: none;
        background: #0f172a;
        color: #f8fafc;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        line-height: 1.3;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        white-space: nowrap;
        max-width: 340px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ws-badge .ws-tag { color: #60a5fa; font-weight: 600; }
      .ws-badge .ws-dim { color: #cbd5e1; margin-left: 6px; }
    `;

    const marginBox = document.createElement('div');
    marginBox.className = 'ws-layer ws-margin';
    const paddingBox = document.createElement('div');
    paddingBox.className = 'ws-layer ws-padding';
    const contentBox = document.createElement('div');
    contentBox.className = 'ws-layer ws-content';
    const selectedBox = document.createElement('div');
    selectedBox.className = 'ws-layer ws-selected';

    const badge = document.createElement('div');
    badge.className = 'ws-badge';
    const badgeTag = document.createElement('span');
    badgeTag.className = 'ws-tag';
    const badgeDim = document.createElement('span');
    badgeDim.className = 'ws-dim';
    badge.append(badgeTag, badgeDim);

    shadow.append(styleEl, marginBox, paddingBox, contentBox, selectedBox, badge);
    (document.documentElement || document.body).appendChild(host);

    function setBoxRect(el: HTMLElement, left: number, top: number, width: number, height: number) {
      el.style.display = 'block';
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${Math.max(0, width)}px`;
      el.style.height = `${Math.max(0, height)}px`;
    }

    function hideHoverBoxes() {
      marginBox.style.display = 'none';
      paddingBox.style.display = 'none';
      contentBox.style.display = 'none';
      badge.style.display = 'none';
    }

    function drawHoverOverlay(target: Element | null) {
      if (!target || !target.isConnected) {
        hideHoverBoxes();
        return;
      }

      const rect = target.getBoundingClientRect();
      const cs = window.getComputedStyle(target);
      const px = (prop: string) => parseFloat(cs.getPropertyValue(prop)) || 0;

      const mt = px('margin-top');
      const mr = px('margin-right');
      const mb = px('margin-bottom');
      const ml = px('margin-left');

      const pt = px('padding-top');
      const pr = px('padding-right');
      const pb = px('padding-bottom');
      const pl = px('padding-left');

      const bt = px('border-top-width');
      const br = px('border-right-width');
      const bb = px('border-bottom-width');
      const bl = px('border-left-width');

      setBoxRect(marginBox, rect.left - ml, rect.top - mt, rect.width + ml + mr, rect.height + mt + mb);
      setBoxRect(paddingBox, rect.left + bl, rect.top + bt, rect.width - bl - br, rect.height - bt - bb);
      setBoxRect(
        contentBox,
        rect.left + bl + pl,
        rect.top + bt + pt,
        rect.width - bl - br - pl - pr,
        rect.height - bt - bb - pt - pb,
      );

      badgeTag.textContent = formatElementLabel(target);
      const primaryFont = cs.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() ?? '';
      badgeDim.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)} • ${primaryFont} ${cs.fontSize}`;
      badge.style.display = 'block';

      const badgeTop = rect.top > 30 ? rect.top - 28 : rect.bottom + 6;
      const badgeLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 350));
      badge.style.top = `${Math.min(Math.max(6, badgeTop), window.innerHeight - 30)}px`;
      badge.style.left = `${badgeLeft}px`;
    }

    function drawSelectedOverlay() {
      if (!selectedEl || !selectedEl.isConnected) {
        selectedBox.style.display = 'none';
        return;
      }
      const rect = selectedEl.getBoundingClientRect();
      setBoxRect(selectedBox, rect.left, rect.top, rect.width, rect.height);
    }

    function getSnapshotPayload() {
      if (!selectedEl || !selectedEl.isConnected) return null;
      return captureElementSnapshot(selectedEl, mutator.getOverrides(selectedEl));
    }

    function notifySelection() {
      const snapshot = getSnapshotPayload();
      browser.runtime
        .sendMessage({
          type: 'ELEMENT_SELECTED',
          snapshot,
          canUndo: mutator.canUndo,
          overrideCount: mutator.overrideCount,
        } satisfies ExtensionMessage)
        .catch(() => {});
    }

    function notifyStatus() {
      browser.runtime
        .sendMessage({
          type: 'INSPECTOR_STATUS_CHANGED',
          inspecting,
          canUndo: mutator.canUndo,
          overrideCount: mutator.overrideCount,
        } satisfies ExtensionMessage)
        .catch(() => {});
    }

    function setInspecting(enabled: boolean) {
      inspecting = enabled;
      if (!enabled) {
        hoveredEl = null;
        hideHoverBoxes();
        document.documentElement.style.removeProperty('cursor');
      } else {
        document.documentElement.style.cursor = 'crosshair';
      }
      notifyStatus();
    }

    function selectElement(el: Element | null) {
      if (!(el instanceof HTMLElement || el instanceof SVGElement)) return;
      selectedEl = el as unknown as HTMLElement;
      drawSelectedOverlay();
      notifySelection();
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!inspecting) return;
      const path = e.composedPath();
      if (path.includes(host)) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === host || host.contains(el)) return;
      if (el !== hoveredEl) {
        hoveredEl = el;
        drawHoverOverlay(el);
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!inspecting) return;
      const path = e.composedPath();
      if (path.includes(host)) return;
      e.preventDefault();
      e.stopPropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== host) {
        selectElement(el);
        setInspecting(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspecting) {
        e.preventDefault();
        setInspecting(false);
        return;
      }
      if (!selectedEl) return;
      if (e.altKey && e.key === 'ArrowUp' && selectedEl.parentElement) {
        e.preventDefault();
        selectElement(selectedEl.parentElement);
      } else if (e.altKey && e.key === 'ArrowDown' && selectedEl.firstElementChild) {
        e.preventDefault();
        selectElement(selectedEl.firstElementChild);
      }
    };

    const onScrollOrResize = () => {
      if (inspecting && hoveredEl) drawHoverOverlay(hoveredEl);
      if (selectedEl) drawSelectedOverlay();
    };

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize, true);

    ctx.onInvalidated(() => {
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize, true);
      host.remove();
    });

    browser.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
      const message = rawMessage as ExtensionMessage;
      switch (message.type) {
        case 'GET_STATE': {
          const state: InspectorStateResponse = {
            inspecting,
            snapshot: getSnapshotPayload(),
            canUndo: mutator.canUndo,
            overrideCount: mutator.overrideCount,
          };
          sendResponse(state);
          return false;
        }
        case 'SET_INSPECTING': {
          setInspecting(message.enabled);
          sendResponse({ ok: true, inspecting });
          return false;
        }
        case 'SELECT_BY_SELECTOR': {
          const target = resolveSelector(document, message.selector);
          if (target) {
            selectElement(target);
            target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          sendResponse({
            ok: Boolean(target),
            snapshot: getSnapshotPayload(),
            canUndo: mutator.canUndo,
            overrideCount: mutator.overrideCount,
          });
          return false;
        }
        case 'HIGHLIGHT_SELECTOR': {
          if (!message.selector) {
            hideHoverBoxes();
          } else {
            const target = resolveSelector(document, message.selector);
            drawHoverOverlay(target);
          }
          sendResponse({ ok: true });
          return false;
        }
        case 'APPLY_STYLE': {
          const target = resolveSelector(document, message.selector) ?? selectedEl;
          if (target instanceof HTMLElement) {
            mutator.apply(target, message.property, message.value);
            selectedEl = target;
            drawSelectedOverlay();
          }
          sendResponse({
            ok: Boolean(target),
            snapshot: getSnapshotPayload(),
            canUndo: mutator.canUndo,
            overrideCount: mutator.overrideCount,
          });
          return false;
        }
        case 'UNDO_STYLE': {
          const revertedEl = mutator.undo();
          if (revertedEl) selectedEl = revertedEl;
          drawSelectedOverlay();
          sendResponse({
            ok: Boolean(revertedEl),
            snapshot: getSnapshotPayload(),
            canUndo: mutator.canUndo,
            overrideCount: mutator.overrideCount,
          });
          return false;
        }
        case 'RESET_STYLES': {
          if (message.selector) {
            const target = resolveSelector(document, message.selector);
            if (target instanceof HTMLElement) mutator.resetElement(target);
          } else {
            mutator.resetAll();
          }
          drawSelectedOverlay();
          sendResponse({
            ok: true,
            snapshot: getSnapshotPayload(),
            canUndo: mutator.canUndo,
            overrideCount: mutator.overrideCount,
          });
          return false;
        }
        case 'EXTRACT_TOKENS': {
          sendResponse({ ok: true, tokens: extractPageTokens(document) });
          return false;
        }
        case 'EXTRACT_ASSETS': {
          sendResponse({ ok: true, assets: extractPageAssets(document) });
          return false;
        }
        case 'SCAN_FULL_PAGE': {
          sendResponse({ ok: true, scan: scanFullPage(document) });
          return false;
        }
        case 'EXPORT_CODE': {
          const target = message.selector
            ? (resolveSelector(document, message.selector) ?? selectedEl)
            : document.body;
          if (!target) {
            sendResponse({ ok: false, error: 'No element selected.' });
            return false;
          }
          sendResponse({ ok: true, result: exportElementCode(target, message.format) });
          return false;
        }
        default:
          return false;
      }
    });
  },
});
