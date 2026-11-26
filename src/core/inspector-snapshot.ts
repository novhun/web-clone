import type { BoxModel, DomBreadcrumbNode, ElementSnapshot } from '../shared/types';
import { buildUniqueSelector, formatElementLabel } from './selector';
import { computeElementContrast } from './wcag';

export const INSPECTED_STYLE_PROPERTIES = [
  'display',
  'position',
  'flex-direction',
  'justify-content',
  'align-items',
  'gap',
  'width',
  'height',
  'min-width',
  'max-width',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'color',
  'background-color',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'box-shadow',
  'opacity',
  'z-index',
] as const;

export function parseBoxModel(el: Element, computed?: CSSStyleDeclaration): BoxModel {
  const style = computed ?? window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const px = (prop: string) => {
    const val = parseFloat(style.getPropertyValue(prop));
    return Number.isFinite(val) ? Math.round(val * 100) / 100 : 0;
  };

  return {
    width: Math.round(rect.width * 100) / 100,
    height: Math.round(rect.height * 100) / 100,
    margin: {
      top: px('margin-top'),
      right: px('margin-right'),
      bottom: px('margin-bottom'),
      left: px('margin-left'),
    },
    padding: {
      top: px('padding-top'),
      right: px('padding-right'),
      bottom: px('padding-bottom'),
      left: px('padding-left'),
    },
    border: {
      top: px('border-top-width'),
      right: px('border-right-width'),
      bottom: px('border-bottom-width'),
      left: px('border-left-width'),
    },
  };
}

export function captureElementSnapshot(
  el: Element,
  inlineOverrides: Record<string, string> = {},
): ElementSnapshot {
  const style = window.getComputedStyle(el);
  const computed: Record<string, string> = {};
  for (const prop of INSPECTED_STYLE_PROPERTIES) {
    computed[prop] = style.getPropertyValue(prop).trim();
  }

  const breadcrumbs: DomBreadcrumbNode[] = [];
  let cursor: Element | null = el;
  let depth = 0;
  while (cursor && depth < 6) {
    breadcrumbs.unshift({
      selector: buildUniqueSelector(cursor),
      label: formatElementLabel(cursor),
      isCurrent: cursor === el,
    });
    if (cursor === el.ownerDocument.body) break;
    cursor = cursor.parentElement;
    depth++;
  }

  const children: DomBreadcrumbNode[] = Array.from(el.children)
    .slice(0, 12)
    .map((child) => ({
      selector: buildUniqueSelector(child),
      label: formatElementLabel(child),
    }));

  const rawText = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const textPreview = rawText.length > 80 ? `${rawText.slice(0, 80)}…` : rawText;

  return {
    selector: buildUniqueSelector(el),
    tagName: el.tagName.toLowerCase(),
    id: el.id ?? '',
    classes: Array.from(el.classList),
    textPreview,
    boxModel: parseBoxModel(el, style),
    computed,
    inlineOverrides: { ...inlineOverrides },
    breadcrumbs,
    children,
    contrast: computeElementContrast(el),
  };
}
