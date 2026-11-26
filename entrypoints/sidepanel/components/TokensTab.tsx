import React, { useState } from 'react';
import { Check, Copy, ScanSearch } from 'lucide-react';
import { formatTokensAs } from '../../../src/core/token-and-asset-extractor';
import type { PageTokens } from '../../../src/shared/types';

interface TokensTabProps {
  tokens: PageTokens | null;
  loading: boolean;
  onScanTokens: () => void;
}

export function TokensTab({ tokens, loading, onScanTokens }: TokensTabProps) {
  const [exportFmt, setExportFmt] = useState<'css' | 'tailwind' | 'json' | 'design-md'>('css');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1400);
  };

  if (!tokens) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-4 py-10 text-center">
        <p className="mb-3 text-xs text-slate-400">
          Scan the current webpage to extract colors, typography, spacing, shadows, and CSS variables.
        </p>
        <button
          type="button"
          onClick={onScanTokens}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          {loading ? 'Scanning...' : 'Scan Page Tokens'}
        </button>
      </div>
    );
  }

  const formattedExport = formatTokensAs(tokens, exportFmt);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {tokens.colors.length} colors • {tokens.fonts.length} fonts • {tokens.cssVariables.length} CSS vars
        </span>
        <button
          type="button"
          onClick={onScanTokens}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
        >
          <ScanSearch className="h-3 w-3" />
          {loading ? 'Scanning...' : 'Re-scan'}
        </button>
      </div>

      {/* Colors */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Colors
        </h3>
        <div className="grid grid-cols-4 gap-1.5">
          {tokens.colors.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => copyValue(color.hex, color.hex)}
              title={`${color.hex} (${color.usages.join(', ')}, ${color.count}x)`}
              className="group flex cursor-pointer flex-col items-start rounded border border-slate-800 bg-slate-950/70 p-1 text-left hover:border-slate-600"
            >
              <span
                className="mb-1 h-6 w-full rounded border border-white/10"
                style={{ backgroundColor: color.hex }}
              />
              <span className="w-full truncate font-mono text-[10px] text-slate-200">
                {copiedKey === color.hex ? 'Copied!' : color.hex}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Font Families
        </h3>
        <div className="flex flex-col gap-1.5">
          {tokens.fonts.map((font) => (
            <div
              key={font.family}
              className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/60 px-2 py-1.5"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-100">{font.family}</div>
                <div className="truncate font-mono text-[10px] text-slate-400">
                  weights: {font.weights.join(', ')}
                </div>
              </div>
              <span className="ml-2 shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                {font.count}×
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Export Tokens */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <select
            value={exportFmt}
            onChange={(e) => setExportFmt(e.target.value as typeof exportFmt)}
            className="h-7 rounded border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-200 focus:outline-none"
          >
            <option value="css">CSS Variables</option>
            <option value="tailwind">Tailwind Config</option>
            <option value="design-md">DESIGN.md</option>
            <option value="json">Raw JSON</option>
          </select>
          <button
            type="button"
            onClick={() => copyValue('export', formattedExport)}
            className="inline-flex cursor-pointer items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            {copiedKey === 'export' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedKey === 'export' ? 'Copied' : 'Copy Export'}
          </button>
        </div>
        <pre className="max-h-48 overflow-auto rounded bg-slate-950 p-2 font-mono text-[10px] text-slate-300">
          <code>{formattedExport}</code>
        </pre>
      </section>
    </div>
  );
}
