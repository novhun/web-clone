import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Search } from 'lucide-react';
import { parseCssColor, rgbaToHex } from '../../../src/core/wcag';
import type { ElementSnapshot } from '../../../src/shared/types';
import { BoxModelEditor } from './BoxModelEditor';

interface StyleEditorTabProps {
  snapshot: ElementSnapshot;
  onApplyStyle: (property: string, value: string) => void;
}

interface StyleFieldProps {
  label: string;
  property: string;
  value: string;
  overridden?: boolean;
  type?: 'text' | 'select' | 'color';
  options?: string[];
  onApply: (property: string, value: string) => void;
}

function StyleField({
  label,
  property,
  value,
  overridden,
  type = 'text',
  options,
  onApply,
}: StyleFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const hexColor = useMemo(() => {
    if (type !== 'color') return '#000000';
    const parsed = parseCssColor(value);
    return parsed ? rgbaToHex(parsed).slice(0, 7) : '#000000';
  }, [type, value]);

  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{label}</span>
        {overridden && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" title="Modified live" />}
      </span>
      {type === 'select' && options ? (
        <select
          className="h-7 rounded border border-slate-700/80 bg-slate-900 px-1.5 text-[11px] text-slate-100 focus:border-blue-500 focus:outline-none"
          value={options.includes(value) ? value : ''}
          onChange={(e) => onApply(property, e.target.value)}
        >
          {!options.includes(value) && <option value="">{value || 'custom'}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === 'color' ? (
        <div className="flex h-7 items-center gap-1 rounded border border-slate-700/80 bg-slate-900 px-1.5">
          <input
            type="color"
            value={hexColor}
            onChange={(e) => onApply(property, e.target.value)}
            className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
          />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => draft.trim() !== value && onApply(property, draft.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApply(property, draft.trim());
            }}
            className="w-full bg-transparent font-mono text-[11px] text-slate-100 focus:outline-none"
          />
        </div>
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== value && onApply(property, draft.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onApply(property, draft.trim());
          }}
          className="h-7 rounded border border-slate-700/80 bg-slate-900 px-2 font-mono text-[11px] text-slate-100 focus:border-blue-500 focus:outline-none"
        />
      )}
    </label>
  );
}

export function StyleEditorTab({ snapshot, onApplyStyle }: StyleEditorTabProps) {
  const [filter, setFilter] = useState('');
  const [copiedCss, setCopiedCss] = useState(false);

  const c = snapshot.computed;
  const ov = snapshot.inlineOverrides;

  const filteredEntries = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return Object.entries(c).filter(
      ([prop, val]) => !q || prop.toLowerCase().includes(q) || val.toLowerCase().includes(q),
    );
  }, [c, filter]);

  const copyAllComputed = async () => {
    const text = Object.entries(c)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <BoxModelEditor
        boxModel={snapshot.boxModel}
        computed={c}
        onApplyStyle={onApplyStyle}
      />

      {/* WCAG Contrast Badge */}
      {snapshot.contrast && (
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-700 text-[10px] font-bold"
              style={{
                color: snapshot.contrast.foreground,
                backgroundColor: snapshot.contrast.background,
              }}
            >
              Aa
            </span>
            <div>
              <div className="text-[11px] font-medium text-slate-200">
                Contrast {snapshot.contrast.ratio}:1
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                {snapshot.contrast.foreground} on {snapshot.contrast.background}
              </div>
            </div>
          </div>
          <div className="flex gap-1 text-[10px] font-semibold">
            <span
              className={`rounded px-1.5 py-0.5 ${
                snapshot.contrast.aaNormal
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              AA {snapshot.contrast.aaNormal ? 'Pass' : 'Fail'}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 ${
                snapshot.contrast.aaaNormal
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              AAA {snapshot.contrast.aaaNormal ? 'Pass' : 'Fail'}
            </span>
          </div>
        </div>
      )}

      {/* Layout */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Layout & Sizing
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <StyleField
            label="Display"
            property="display"
            value={c['display'] ?? ''}
            overridden={'display' in ov}
            type="select"
            options={['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'none']}
            onApply={onApplyStyle}
          />
          <StyleField
            label="Position"
            property="position"
            value={c['position'] ?? ''}
            overridden={'position' in ov}
            type="select"
            options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
            onApply={onApplyStyle}
          />
          <StyleField label="Width" property="width" value={c['width'] ?? ''} overridden={'width' in ov} onApply={onApplyStyle} />
          <StyleField label="Height" property="height" value={c['height'] ?? ''} overridden={'height' in ov} onApply={onApplyStyle} />
          {(c['display']?.includes('flex') || c['display']?.includes('grid')) && (
            <>
              <StyleField
                label="Flex Dir"
                property="flex-direction"
                value={c['flex-direction'] ?? ''}
                overridden={'flex-direction' in ov}
                type="select"
                options={['row', 'column', 'row-reverse', 'column-reverse']}
                onApply={onApplyStyle}
              />
              <StyleField label="Gap" property="gap" value={c['gap'] ?? ''} overridden={'gap' in ov} onApply={onApplyStyle} />
              <StyleField
                label="Justify"
                property="justify-content"
                value={c['justify-content'] ?? ''}
                overridden={'justify-content' in ov}
                type="select"
                options={['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']}
                onApply={onApplyStyle}
              />
              <StyleField
                label="Align"
                property="align-items"
                value={c['align-items'] ?? ''}
                overridden={'align-items' in ov}
                type="select"
                options={['stretch', 'flex-start', 'center', 'flex-end', 'baseline']}
                onApply={onApplyStyle}
              />
            </>
          )}
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Typography
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <StyleField label="Font Family" property="font-family" value={c['font-family'] ?? ''} overridden={'font-family' in ov} onApply={onApplyStyle} />
          </div>
          <StyleField label="Size" property="font-size" value={c['font-size'] ?? ''} overridden={'font-size' in ov} onApply={onApplyStyle} />
          <StyleField
            label="Weight"
            property="font-weight"
            value={c['font-weight'] ?? ''}
            overridden={'font-weight' in ov}
            type="select"
            options={['100', '200', '300', '400', '500', '600', '700', '800', '900']}
            onApply={onApplyStyle}
          />
          <StyleField label="Line Height" property="line-height" value={c['line-height'] ?? ''} overridden={'line-height' in ov} onApply={onApplyStyle} />
          <StyleField
            label="Align"
            property="text-align"
            value={c['text-align'] ?? ''}
            overridden={'text-align' in ov}
            type="select"
            options={['left', 'center', 'right', 'justify', 'start']}
            onApply={onApplyStyle}
          />
          <div className="col-span-2">
            <StyleField label="Text Color" property="color" value={c['color'] ?? ''} overridden={'color' in ov} type="color" onApply={onApplyStyle} />
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Appearance
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <StyleField
              label="Background"
              property="background-color"
              value={c['background-color'] ?? ''}
              overridden={'background-color' in ov}
              type="color"
              onApply={onApplyStyle}
            />
          </div>
          <StyleField label="Radius" property="border-radius" value={c['border-radius'] ?? ''} overridden={'border-radius' in ov} onApply={onApplyStyle} />
          <StyleField label="Opacity" property="opacity" value={c['opacity'] ?? ''} overridden={'opacity' in ov} onApply={onApplyStyle} />
          <StyleField label="Border Width" property="border-width" value={c['border-width'] ?? ''} overridden={'border-width' in ov} onApply={onApplyStyle} />
          <StyleField label="Border Color" property="border-color" value={c['border-color'] ?? ''} overridden={'border-color' in ov} type="color" onApply={onApplyStyle} />
          <div className="col-span-2">
            <StyleField label="Box Shadow" property="box-shadow" value={c['box-shadow'] ?? ''} overridden={'box-shadow' in ov} onApply={onApplyStyle} />
          </div>
        </div>
      </section>

      {/* Computed Properties Search */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Computed CSS
          </h3>
          <button
            type="button"
            onClick={copyAllComputed}
            className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            {copiedCss ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedCss ? 'Copied' : 'Copy CSS'}
          </button>
        </div>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1.5 left-2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter computed properties..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 w-full rounded border border-slate-700/80 bg-slate-950 pr-2 pl-7 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/70 font-mono text-[11px]">
          {filteredEntries.map(([prop, val]) => (
            <div key={prop} className="flex items-start justify-between gap-2 py-1">
              <span className="shrink-0 text-sky-300">{prop}</span>
              <span className="truncate text-right text-slate-300" title={val}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
