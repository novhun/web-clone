import React, { useState } from 'react';
import type { BoxModel } from '../../../src/shared/types';

interface BoxModelEditorProps {
  boxModel: BoxModel;
  computed: Record<string, string>;
  onApplyStyle: (property: string, value: string) => void;
}

interface EditableCellProps {
  label: string;
  property: string;
  value: number;
  onApplyStyle: (property: string, value: string) => void;
}

function EditableCell({ label, property, value, onApplyStyle }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed) return;
    const normalized = /^-?\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
    onApplyStyle(property, normalized);
  };

  if (editing) {
    return (
      <input
        autoFocus
        aria-label={label}
        className="w-11 rounded bg-slate-950 px-1 text-center text-[10px] font-mono text-white outline-1 outline-blue-400"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      title={`Edit ${property}`}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="cursor-pointer rounded px-1 font-mono text-[10px] hover:bg-white/15"
    >
      {value}
    </button>
  );
}

export function BoxModelEditor({ boxModel, onApplyStyle }: BoxModelEditorProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Box Model</span>
        <span className="font-mono text-slate-300">
          {Math.round(boxModel.width)} × {Math.round(boxModel.height)}
        </span>
      </div>

      {/* Margin */}
      <div className="rounded border border-dashed border-orange-500/50 bg-orange-500/10 p-1.5 text-orange-200">
        <div className="flex items-center justify-between text-[9px] uppercase text-orange-300/80">
          <span>margin</span>
          <EditableCell label="margin-top" property="margin-top" value={boxModel.margin.top} onApplyStyle={onApplyStyle} />
          <span className="w-6" />
        </div>
        <div className="my-1 flex items-center gap-1">
          <EditableCell label="margin-left" property="margin-left" value={boxModel.margin.left} onApplyStyle={onApplyStyle} />

          {/* Padding */}
          <div className="flex-1 rounded border border-emerald-500/40 bg-emerald-500/10 p-1.5 text-emerald-200">
            <div className="flex items-center justify-between text-[9px] uppercase text-emerald-300/80">
              <span>padding</span>
              <EditableCell label="padding-top" property="padding-top" value={boxModel.padding.top} onApplyStyle={onApplyStyle} />
              <span className="w-6" />
            </div>
            <div className="my-1 flex items-center gap-1">
              <EditableCell label="padding-left" property="padding-left" value={boxModel.padding.left} onApplyStyle={onApplyStyle} />
              <div className="flex-1 rounded border border-blue-500/50 bg-blue-500/15 py-2 text-center font-mono text-[10px] text-blue-100">
                {Math.round(boxModel.width)} × {Math.round(boxModel.height)}
              </div>
              <EditableCell label="padding-right" property="padding-right" value={boxModel.padding.right} onApplyStyle={onApplyStyle} />
            </div>
            <div className="flex justify-center">
              <EditableCell label="padding-bottom" property="padding-bottom" value={boxModel.padding.bottom} onApplyStyle={onApplyStyle} />
            </div>
          </div>

          <EditableCell label="margin-right" property="margin-right" value={boxModel.margin.right} onApplyStyle={onApplyStyle} />
        </div>
        <div className="flex justify-center">
          <EditableCell label="margin-bottom" property="margin-bottom" value={boxModel.margin.bottom} onApplyStyle={onApplyStyle} />
        </div>
      </div>
    </div>
  );
}
