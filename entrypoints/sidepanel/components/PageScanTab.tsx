import React from 'react';
import { AlertTriangle, Code2, Crosshair, Layers, ScanSearch } from 'lucide-react';
import type { FullPageScanResult } from '../../../src/shared/types';

interface PageScanTabProps {
  scan: FullPageScanResult | null;
  loading: boolean;
  onScanFullPage: () => void;
  onHighlightSelector: (selector: string | null) => void;
  onInspectSelector: (selector: string) => void;
  onExportSelectorCode: (selector: string) => void;
}

export function PageScanTab({
  scan,
  loading,
  onScanFullPage,
  onHighlightSelector,
  onInspectSelector,
  onExportSelectorCode,
}: PageScanTabProps) {
  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-4 py-10 text-center">
        <Layers className="mb-2 h-7 w-7 text-blue-400" />
        <p className="mb-1 text-xs font-medium text-slate-200">Full-Page Scan</p>
        <p className="mb-4 text-[11px] text-slate-400">
          Scan the entire DOM to discover all sections, design tokens, assets, and WCAG contrast issues—or export the whole page at once.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onScanFullPage}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <ScanSearch className="h-3.5 w-3.5" />
            {loading ? 'Scanning Full Page…' : 'Scan Full Page'}
          </button>
          <button
            type="button"
            onClick={() => onExportSelectorCode('body')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            <Code2 className="h-3.5 w-3.5" />
            Export Full Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Top Action & Stats */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-100">
              {scan.title || 'Current Page'}
            </div>
            <div className="truncate font-mono text-[10px] text-slate-400">{scan.url}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onScanFullPage}
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
            >
              <ScanSearch className="h-3 w-3" />
              {loading ? 'Scanning…' : 'Re-scan'}
            </button>
            <button
              type="button"
              onClick={() => onExportSelectorCode('body')}
              className="inline-flex cursor-pointer items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-500"
            >
              <Code2 className="h-3 w-3" />
              Full Page Code
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            { label: 'Elements', value: scan.totalElements },
            { label: 'Sections', value: scan.sections.length },
            { label: 'Colors', value: scan.tokens.colors.length },
            { label: 'Assets', value: scan.assets.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded bg-slate-950/70 px-1.5 py-1.5">
              <div className="font-mono text-xs font-semibold text-slate-100">{stat.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detected Sections */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Page Sections ({scan.sections.length})
        </h3>
        {scan.sections.length === 0 ? (
          <p className="text-[11px] text-slate-500">No semantic sections detected.</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
            {scan.sections.map((sec) => (
              <div
                key={sec.selector}
                onMouseEnter={() => onHighlightSelector(sec.selector)}
                onMouseLeave={() => onHighlightSelector(null)}
                className="flex items-center justify-between gap-2 rounded border border-slate-800/80 bg-slate-950/70 px-2 py-1.5 hover:border-blue-500/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-[11px] font-medium text-sky-300">
                      {sec.label}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {sec.width}×{sec.height}
                    </span>
                  </div>
                  {sec.textPreview && (
                    <div className="truncate text-[10px] text-slate-400">{sec.textPreview}</div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onInspectSelector(sec.selector)}
                    title="Inspect & edit section"
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-slate-800 px-1.5 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                  >
                    <Crosshair className="h-3 w-3" />
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportSelectorCode(sec.selector)}
                    title="Export code & Real View"
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-slate-800 px-1.5 py-1 text-[10px] text-slate-200 hover:bg-blue-600 hover:text-white"
                  >
                    <Code2 className="h-3 w-3" />
                    Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contrast Audit */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            WCAG AA Contrast Issues ({scan.contrastIssues.length})
          </h3>
        </div>
        {scan.contrastIssues.length === 0 ? (
          <p className="text-[11px] text-emerald-400">All scanned text elements pass WCAG AA (4.5:1).</p>
        ) : (
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
            {scan.contrastIssues.slice(0, 40).map((issue) => (
              <button
                key={issue.selector}
                type="button"
                onMouseEnter={() => onHighlightSelector(issue.selector)}
                onMouseLeave={() => onHighlightSelector(null)}
                onClick={() => onInspectSelector(issue.selector)}
                className="flex cursor-pointer items-center justify-between gap-2 rounded border border-slate-800/70 bg-slate-950/60 px-2 py-1 text-left hover:border-amber-500/50"
              >
                <span className="truncate font-mono text-[10px] text-slate-200">{issue.label}</span>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
                  <span
                    className="inline-block h-3 w-3 rounded border border-white/20"
                    style={{ backgroundColor: issue.foreground }}
                  />
                  <span className="text-amber-300">{issue.ratio}:1</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
