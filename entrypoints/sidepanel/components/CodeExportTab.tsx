import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Monitor,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import type { CodeExportFormat, CodeExportResult } from '../../../src/shared/types';

interface CodeExportTabProps {
  selector: string;
  hasSelectedElement: boolean;
  onChangeTarget: (target: 'selected' | 'body') => void;
  targetMode: 'selected' | 'body';
  onExportCode: (selector: string, format: CodeExportFormat) => Promise<CodeExportResult | null>;
}

const FORMATS: Array<{ id: CodeExportFormat; label: string }> = [
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'react-tailwind', label: 'React JSX' },
  { id: 'html-css', label: 'HTML + CSS' },
];

type ViewportPreset = 'desktop' | 'fit' | 'mobile';

export function CodeExportTab({
  selector,
  hasSelectedElement,
  onChangeTarget,
  targetMode,
  onExportCode,
}: CodeExportTabProps) {
  const [format, setFormat] = useState<CodeExportFormat>('tailwind');
  const [viewMode, setViewMode] = useState<'code' | 'real' | 'split'>('real');
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset>(
    targetMode === 'body' ? 'desktop' : 'fit',
  );
  const [result, setResult] = useState<CodeExportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'code' | 'css' | null>(null);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(340);

  const effectiveSelector = targetMode === 'body' ? 'body' : selector;

  useEffect(() => {
    if (targetMode === 'body') {
      setViewportPreset('desktop');
    }
  }, [targetMode]);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode]);

  const runExport = async (targetSel: string, targetFormat: CodeExportFormat) => {
    if (!targetSel) return;
    setLoading(true);
    try {
      const res = await onExportCode(targetSel, targetFormat);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runExport(effectiveSelector, format);
  }, [effectiveSelector, format]);

  const copyText = async (which: 'code' | 'css', text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const openRealViewTab = () => {
    if (!result?.previewHtml) return;
    const blob = new Blob([result.previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadHtmlClone = () => {
    if (!result?.previewHtml) return;
    const blob = new Blob([result.previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetMode === 'body' ? 'webscope-page-clone.html' : 'webscope-component.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const showRealView = viewMode === 'real' || viewMode === 'split';
  const showCodeView = viewMode === 'code' || viewMode === 'split';

  // Scale source desktop viewport proportionally to fit the Side Panel container cleanly
  const desktopWidth = result?.viewportWidth && result.viewportWidth >= 640 ? result.viewportWidth : 1280;
  const desktopHeight = 960;
  const desktopScale = Math.min(1, Math.max(0.2, (containerWidth - 16) / desktopWidth));

  return (
    <div className="flex flex-col gap-3">
      {/* Scope: Selected Element vs Full Page */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[11px]">
          <button
            type="button"
            disabled={!hasSelectedElement}
            onClick={() => onChangeTarget('selected')}
            className={`cursor-pointer rounded-md px-2 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              targetMode === 'selected'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Selected Element
          </button>
          <button
            type="button"
            onClick={() => onChangeTarget('body')}
            className={`cursor-pointer rounded-md px-2 py-1 font-medium transition ${
              targetMode === 'body'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Full Page
          </button>
        </div>

        <button
          type="button"
          onClick={() => runExport(effectiveSelector, format)}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Format & View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition ${
                format === f.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode('real')}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition ${
              viewMode === 'real' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="h-3 w-3" />
            Real View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium transition ${
              viewMode === 'code' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="h-3 w-3" />
            Code
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`cursor-pointer rounded-md px-2 py-1 font-medium transition ${
              viewMode === 'split' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Real View Live Rendered Preview */}
      {result && showRealView && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <Eye className="h-3 w-3" />
              Real View
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewportPreset('desktop')}
                title={`${desktopWidth}px Desktop scaled to fit`}
                className={`inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                  viewportPreset === 'desktop' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-3 w-3" />
                {desktopWidth}px
              </button>
              <button
                type="button"
                onClick={() => setViewportPreset('fit')}
                title="Panel width"
                className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] ${
                  viewportPreset === 'fit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setViewportPreset('mobile')}
                title="375px Mobile width"
                className={`inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                  viewportPreset === 'mobile' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                375px
              </button>
              <button
                type="button"
                onClick={openRealViewTab}
                title="Open 1:1 full-screen Real View in new tab"
                className="inline-flex cursor-pointer items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
              >
                <ExternalLink className="h-3 w-3" />
                Tab
              </button>
              <button
                type="button"
                onClick={downloadHtmlClone}
                title="Download standalone HTML file"
                className="inline-flex cursor-pointer items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
              >
                <Download className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div ref={previewContainerRef} className="flex justify-center overflow-x-auto bg-slate-950 p-2">
            {viewportPreset === 'desktop' ? (
              <div
                style={{
                  width: `${Math.round(desktopWidth * desktopScale)}px`,
                  height: `${Math.round(desktopHeight * desktopScale)}px`,
                }}
                className="overflow-hidden rounded border border-slate-800 bg-white"
              >
                <iframe
                  title="WebScope Real View Desktop Preview"
                  sandbox=""
                  srcDoc={result.previewHtml}
                  style={{
                    width: `${desktopWidth}px`,
                    height: `${desktopHeight}px`,
                    transform: `scale(${desktopScale})`,
                    transformOrigin: 'top left',
                  }}
                  className="border-0 bg-white"
                />
              </div>
            ) : (
              <iframe
                title="WebScope Real View Preview"
                sandbox=""
                srcDoc={result.previewHtml}
                style={{
                  width: viewportPreset === 'mobile' ? '375px' : '100%',
                  minWidth: viewportPreset === 'mobile' ? '375px' : undefined,
                }}
                className="h-80 rounded border border-slate-800 bg-white"
              />
            )}
          </div>
        </div>
      )}

      {/* Exported Code */}
      {result && showCodeView && (
        <>
          <div className="rounded-lg border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-800 px-2.5 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {format === 'html-css' ? 'HTML' : format === 'react-tailwind' ? 'Component.tsx' : 'HTML + Tailwind'}
              </span>
              <button
                type="button"
                onClick={() => copyText('code', result.code)}
                className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
              >
                {copied === 'code' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied === 'code' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto p-2.5 font-mono text-[11px] leading-relaxed text-slate-200">
              <code>{result.code}</code>
            </pre>
          </div>

          {result.css && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-800 px-2.5 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Extracted CSS
                </span>
                <button
                  type="button"
                  onClick={() => copyText('css', result.css!)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                >
                  {copied === 'css' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied === 'css' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="max-h-56 overflow-auto p-2.5 font-mono text-[11px] leading-relaxed text-sky-200">
                <code>{result.css}</code>
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
