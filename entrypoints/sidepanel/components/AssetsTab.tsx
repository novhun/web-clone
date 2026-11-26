import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, ScanSearch } from 'lucide-react';
import type { AssetKind, ExtractedAsset } from '../../../src/shared/types';

interface AssetsTabProps {
  assets: ExtractedAsset[] | null;
  loading: boolean;
  onScanAssets: () => void;
  onDownloadAsset: (asset: ExtractedAsset) => void;
}

export function AssetsTab({ assets, loading, onScanAssets, onDownloadAsset }: AssetsTabProps) {
  const [kindFilter, setKindFilter] = useState<'all' | AssetKind>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!assets) return [];
    if (kindFilter === 'all') return assets;
    return assets.filter((a) => a.kind === kindFilter);
  }, [assets, kindFilter]);

  const copySvg = async (asset: ExtractedAsset) => {
    if (!asset.svgMarkup) return;
    await navigator.clipboard.writeText(asset.svgMarkup);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  if (!assets) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-4 py-10 text-center">
        <p className="mb-3 text-xs text-slate-400">
          Extract images, inline SVGs, videos, audio, and CSS background images from the current page.
        </p>
        <button
          type="button"
          onClick={onScanAssets}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          {loading ? 'Scanning...' : 'Extract Page Assets'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
          className="h-7 rounded border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-200 focus:outline-none"
        >
          <option value="all">All ({assets.length})</option>
          <option value="image">Images</option>
          <option value="svg">SVGs</option>
          <option value="background">Backgrounds</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </select>

        <button
          type="button"
          onClick={onScanAssets}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
        >
          <ScanSearch className="h-3 w-3" />
          Re-scan
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
          No assets found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2"
            >
              <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded bg-slate-950 p-1">
                {asset.kind === 'image' || asset.kind === 'svg' || asset.kind === 'background' ? (
                  <img
                    src={asset.url}
                    alt={asset.label}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-600" />
                )}
              </div>
              <div>
                <div className="truncate text-[11px] font-medium text-slate-200" title={asset.label}>
                  {asset.label}
                </div>
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="uppercase">{asset.kind}</span>
                  {asset.width && asset.height ? (
                    <span>
                      {asset.width}×{asset.height}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onDownloadAsset(asset)}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded bg-slate-800 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                  >
                    <Download className="h-3 w-3" />
                    Save
                  </button>
                  {asset.svgMarkup && (
                    <button
                      type="button"
                      onClick={() => copySvg(asset)}
                      className="inline-flex cursor-pointer items-center justify-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                      title="Copy SVG markup"
                    >
                      {copiedId === asset.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
