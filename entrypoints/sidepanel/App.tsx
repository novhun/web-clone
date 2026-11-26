import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  Code2,
  Crosshair,
  Images,
  Layers,
  Palette,
  RotateCcw,
  Sliders,
  Undo2,
} from 'lucide-react';
import type {
  CodeExportFormat,
  CodeExportResult,
  ElementSnapshot,
  ExtensionMessage,
  ExtractedAsset,
  FullPageScanResult,
  InspectorStateResponse,
  PageTokens,
} from '../../src/shared/types';
import { AssetsTab } from './components/AssetsTab';
import { CodeExportTab } from './components/CodeExportTab';
import { PageScanTab } from './components/PageScanTab';
import { StyleEditorTab } from './components/StyleEditorTab';
import { TokensTab } from './components/TokensTab';

type TabId = 'inspect' | 'page' | 'code' | 'tokens' | 'assets';

async function sendToBackground<T = unknown>(message: ExtensionMessage): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('inspect');
  const [activeTabId, setActiveTabId] = useState<number | undefined>(undefined);
  const [inspecting, setInspecting] = useState(false);
  const [snapshot, setSnapshot] = useState<ElementSnapshot | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [overrideCount, setOverrideCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [codeTargetMode, setCodeTargetMode] = useState<'selected' | 'body'>('selected');

  const [fullScan, setFullScan] = useState<FullPageScanResult | null>(null);
  const [fullScanLoading, setFullScanLoading] = useState(false);

  const [tokens, setTokens] = useState<PageTokens | null>(null);
  const [tokensLoading, setTokensLoading] = useState(false);

  const [assets, setAssets] = useState<ExtractedAsset[] | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const syncActiveTab = useCallback(async () => {
    setError(null);
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    setActiveTabId(tab.id);

    const state = await sendToBackground<InspectorStateResponse & { error?: string }>({
      type: 'GET_STATE',
      tabId: tab.id,
    });
    if (state?.error) {
      setError(state.error);
      return;
    }
    setInspecting(Boolean(state?.inspecting));
    setSnapshot(state?.snapshot ?? null);
    setCanUndo(Boolean(state?.canUndo));
    setOverrideCount(state?.overrideCount ?? 0);
  }, []);

  useEffect(() => {
    syncActiveTab();

    const onRuntimeMessage = (rawMsg: unknown) => {
      const msg = rawMsg as ExtensionMessage;
      if (msg.type === 'ELEMENT_SELECTED') {
        if (activeTabId && msg.tabId && msg.tabId !== activeTabId) return;
        setSnapshot(msg.snapshot);
        setCanUndo(msg.canUndo);
        setOverrideCount(msg.overrideCount);
        if (msg.snapshot) setCodeTargetMode('selected');
      } else if (msg.type === 'INSPECTOR_STATUS_CHANGED') {
        if (activeTabId && msg.tabId && msg.tabId !== activeTabId) return;
        setInspecting(msg.inspecting);
        setCanUndo(msg.canUndo);
        setOverrideCount(msg.overrideCount);
      }
    };

    const onTabActivated = () => {
      setFullScan(null);
      setTokens(null);
      setAssets(null);
      syncActiveTab();
    };

    const onTabUpdated = (_tabId: number, info: { status?: string }) => {
      if (info.status === 'complete') {
        setFullScan(null);
        setTokens(null);
        setAssets(null);
        syncActiveTab();
      }
    };

    browser.runtime.onMessage.addListener(onRuntimeMessage);
    browser.tabs.onActivated.addListener(onTabActivated);
    browser.tabs.onUpdated.addListener(onTabUpdated);

    return () => {
      browser.runtime.onMessage.removeListener(onRuntimeMessage);
      browser.tabs.onActivated.removeListener(onTabActivated);
      browser.tabs.onUpdated.removeListener(onTabUpdated);
    };
  }, [activeTabId, syncActiveTab]);

  const toggleInspect = async () => {
    setError(null);
    const next = !inspecting;
    const res = await sendToBackground<{ ok?: boolean; inspecting?: boolean; error?: string }>({
      type: 'SET_INSPECTING',
      tabId: activeTabId,
      enabled: next,
    });
    if (res?.error) {
      setError(res.error);
      return;
    }
    setInspecting(Boolean(res?.inspecting ?? next));
  };

  const highlightSelector = async (selector: string | null) => {
    await sendToBackground({
      type: 'HIGHLIGHT_SELECTOR',
      tabId: activeTabId,
      selector,
    }).catch(() => {});
  };

  const selectBySelector = async (selector: string) => {
    const res = await sendToBackground<{
      ok?: boolean;
      snapshot?: ElementSnapshot | null;
      canUndo?: boolean;
      overrideCount?: number;
    }>({
      type: 'SELECT_BY_SELECTOR',
      tabId: activeTabId,
      selector,
    });
    if (res?.snapshot !== undefined) setSnapshot(res.snapshot);
    if (res?.canUndo !== undefined) setCanUndo(res.canUndo);
    if (res?.overrideCount !== undefined) setOverrideCount(res.overrideCount);
  };

  const applyStyle = async (property: string, value: string) => {
    if (!snapshot) return;
    const res = await sendToBackground<{
      snapshot?: ElementSnapshot | null;
      canUndo?: boolean;
      overrideCount?: number;
    }>({
      type: 'APPLY_STYLE',
      tabId: activeTabId,
      selector: snapshot.selector,
      property,
      value,
    });
    if (res?.snapshot !== undefined) setSnapshot(res.snapshot);
    if (res?.canUndo !== undefined) setCanUndo(res.canUndo);
    if (res?.overrideCount !== undefined) setOverrideCount(res.overrideCount);
  };

  const undoStyle = async () => {
    const res = await sendToBackground<{
      snapshot?: ElementSnapshot | null;
      canUndo?: boolean;
      overrideCount?: number;
    }>({
      type: 'UNDO_STYLE',
      tabId: activeTabId,
    });
    if (res?.snapshot !== undefined) setSnapshot(res.snapshot);
    if (res?.canUndo !== undefined) setCanUndo(res.canUndo);
    if (res?.overrideCount !== undefined) setOverrideCount(res.overrideCount);
  };

  const resetStyles = async () => {
    const res = await sendToBackground<{
      snapshot?: ElementSnapshot | null;
      canUndo?: boolean;
      overrideCount?: number;
    }>({
      type: 'RESET_STYLES',
      tabId: activeTabId,
    });
    if (res?.snapshot !== undefined) setSnapshot(res.snapshot);
    if (res?.canUndo !== undefined) setCanUndo(res.canUndo);
    if (res?.overrideCount !== undefined) setOverrideCount(res.overrideCount);
  };

  const scanFullPage = async () => {
    setError(null);
    setFullScanLoading(true);
    try {
      const res = await sendToBackground<{ ok?: boolean; scan?: FullPageScanResult; error?: string }>({
        type: 'SCAN_FULL_PAGE',
        tabId: activeTabId,
      });
      if (res?.error) {
        setError(res.error);
      } else if (res?.scan) {
        setFullScan(res.scan);
        setTokens(res.scan.tokens);
        setAssets(res.scan.assets);
      }
    } finally {
      setFullScanLoading(false);
    }
  };

  const scanTokens = async () => {
    setError(null);
    setTokensLoading(true);
    try {
      const res = await sendToBackground<{ ok?: boolean; tokens?: PageTokens; error?: string }>({
        type: 'EXTRACT_TOKENS',
        tabId: activeTabId,
      });
      if (res?.error) setError(res.error);
      else if (res?.tokens) setTokens(res.tokens);
    } finally {
      setTokensLoading(false);
    }
  };

  const scanAssets = async () => {
    setError(null);
    setAssetsLoading(true);
    try {
      const res = await sendToBackground<{ ok?: boolean; assets?: ExtractedAsset[]; error?: string }>({
        type: 'EXTRACT_ASSETS',
        tabId: activeTabId,
      });
      if (res?.error) setError(res.error);
      else if (res?.assets) setAssets(res.assets);
    } finally {
      setAssetsLoading(false);
    }
  };

  const exportCode = async (
    selector: string,
    format: CodeExportFormat,
  ): Promise<CodeExportResult | null> => {
    const res = await sendToBackground<{ ok?: boolean; result?: CodeExportResult; error?: string }>({
      type: 'EXPORT_CODE',
      tabId: activeTabId,
      selector,
      format,
    });
    if (res?.error) {
      setError(res.error);
      return null;
    }
    return res?.result ?? null;
  };

  const downloadAsset = async (asset: ExtractedAsset) => {
    const safeName = asset.label.replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset';
    await sendToBackground({
      type: 'DOWNLOAD_ASSET',
      url: asset.url,
      filename: `webscope/${safeName}`,
    });
  };

  const handleInspectFromPageScan = async (selector: string) => {
    await highlightSelector(null);
    await selectBySelector(selector);
    setCodeTargetMode('selected');
    setActiveTab('inspect');
  };

  const handleExportFromPageScan = async (selector: string) => {
    await highlightSelector(null);
    if (selector === 'body') {
      setCodeTargetMode('body');
    } else {
      await selectBySelector(selector);
      setCodeTargetMode('selected');
    }
    setActiveTab('code');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header Toolbar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleInspect}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              inspecting
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            {inspecting ? 'Picking… (Esc)' : 'Pick Element'}
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undoStyle}
              disabled={!canUndo}
              title="Undo last style edit"
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </button>
            <button
              type="button"
              onClick={resetStyles}
              disabled={overrideCount === 0}
              title="Reset all live edits on this page"
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" />
              Reset{overrideCount > 0 ? ` (${overrideCount})` : ''}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-2 grid grid-cols-5 gap-1 rounded-lg bg-slate-900 p-0.5">
          {[
            { id: 'inspect' as const, label: 'Inspect', Icon: Sliders },
            { id: 'page' as const, label: 'Page', Icon: Layers },
            { id: 'code' as const, label: 'Code', Icon: Code2 },
            { id: 'tokens' as const, label: 'Tokens', Icon: Palette },
            { id: 'assets' as const, label: 'Assets', Icon: Images },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition ${
                activeTab === id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3">
        {error && (
          <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-[11px] text-rose-200">
            {error}
          </div>
        )}

        {/* Selected Element Breadcrumbs */}
        {snapshot && (activeTab === 'inspect' || (activeTab === 'code' && codeTargetMode === 'selected')) && (
          <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
            <div className="flex flex-wrap items-center gap-0.5 font-mono text-[10px]">
              {snapshot.breadcrumbs.map((node, i) => (
                <React.Fragment key={node.selector}>
                  {i > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                  <button
                    type="button"
                    onClick={() => selectBySelector(node.selector)}
                    className={`cursor-pointer rounded px-1 py-0.5 ${
                      node.isCurrent
                        ? 'bg-violet-500/25 font-semibold text-violet-200'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {node.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
            {snapshot.children.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1 border-t border-slate-800/80 pt-1.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Children:</span>
                {snapshot.children.slice(0, 6).map((child) => (
                  <button
                    key={child.selector}
                    type="button"
                    onClick={() => selectBySelector(child.selector)}
                    className="cursor-pointer rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:bg-slate-700"
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inspect' && !snapshot && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-4 py-12 text-center">
            <Crosshair className="mb-2 h-7 w-7 text-slate-500" />
            <p className="mb-1 text-xs font-medium text-slate-200">No element selected</p>
            <p className="mb-4 text-[11px] text-slate-400">
              Click <strong>Pick Element</strong> to inspect on the page, or run a <strong>Full-Page Scan</strong> in the Page tab.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleInspect}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                <Crosshair className="h-3.5 w-3.5" />
                Pick Element
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('page');
                  scanFullPage();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                <Layers className="h-3.5 w-3.5" />
                Scan Full Page
              </button>
            </div>
          </div>
        )}

        {activeTab === 'inspect' && snapshot && (
          <StyleEditorTab snapshot={snapshot} onApplyStyle={applyStyle} />
        )}

        {activeTab === 'page' && (
          <PageScanTab
            scan={fullScan}
            loading={fullScanLoading}
            onScanFullPage={scanFullPage}
            onHighlightSelector={highlightSelector}
            onInspectSelector={handleInspectFromPageScan}
            onExportSelectorCode={handleExportFromPageScan}
          />
        )}

        {activeTab === 'code' && (
          <CodeExportTab
            selector={snapshot?.selector ?? 'body'}
            hasSelectedElement={Boolean(snapshot)}
            targetMode={snapshot ? codeTargetMode : 'body'}
            onChangeTarget={setCodeTargetMode}
            onExportCode={exportCode}
          />
        )}

        {activeTab === 'tokens' && (
          <TokensTab tokens={tokens} loading={tokensLoading} onScanTokens={scanTokens} />
        )}

        {activeTab === 'assets' && (
          <AssetsTab
            assets={assets}
            loading={assetsLoading}
            onScanAssets={scanAssets}
            onDownloadAsset={downloadAsset}
          />
        )}
      </main>
    </div>
  );
}
