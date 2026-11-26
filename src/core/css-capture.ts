/**
 * Comprehensive CSS properties needed for high-fidelity visual cloning.
 */
export const FULL_CLONE_CSS_PROPERTIES = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'box-sizing',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'aspect-ratio',
  'overflow',
  'overflow-x',
  'overflow-y',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'order',
  'grid-template-columns',
  'grid-template-rows',
  'grid-auto-flow',
  'grid-column-start',
  'grid-column-end',
  'grid-row-start',
  'grid-row-end',
  'row-gap',
  'column-gap',
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
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-decoration-line',
  'text-decoration-color',
  'white-space',
  'word-break',
  'vertical-align',
  'list-style-type',
  'color',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-clip',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'outline-width',
  'outline-style',
  'outline-color',
  'box-shadow',
  'opacity',
  'visibility',
  'transform',
  'transform-origin',
  'filter',
  'backdrop-filter',
  'clip-path',
  'object-fit',
  'object-position',
  'fill',
  'stroke',
  'stroke-width',
  'cursor',
] as const;

const PSEUDO_CSS_PROPERTIES = [
  'content',
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'width',
  'height',
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
  'font-style',
  'line-height',
  'text-align',
  'color',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'box-shadow',
  'opacity',
  'transform',
  'filter',
] as const;

const FLOW_TEXT_TAGS = new Set([
  'div',
  'section',
  'main',
  'article',
  'aside',
  'header',
  'footer',
  'nav',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'form',
  'fieldset',
  'blockquote',
  'pre',
  'figure',
  'figcaption',
]);

export interface DefaultStyleOracle {
  getDefaults(tagName: string): Record<string, string>;
  dispose(): void;
}

/**
 * Provides clean browser UA default computed styles per tag via a temporary isolated iframe
 * (falling back safely in jsdom/non-browser environments).
 */
export function createDefaultStyleOracle(doc: Document): DefaultStyleOracle {
  const cache = new Map<string, Record<string, string>>();
  let sandboxFrame: HTMLIFrameElement | null = null;
  let oracleDoc: Document | null = null;

  try {
    if (doc.body) {
      sandboxFrame = doc.createElement('iframe');
      sandboxFrame.setAttribute('aria-hidden', 'true');
      sandboxFrame.style.cssText =
        'position:fixed;left:-99999px;top:-99999px;width:1280px;height:800px;visibility:hidden;pointer-events:none;border:0;';
      doc.body.appendChild(sandboxFrame);
      oracleDoc = sandboxFrame.contentDocument;
    }
  } catch {
    oracleDoc = null;
  }

  const getDefaults = (tagName: string): Record<string, string> => {
    const tag = tagName.toLowerCase();
    const cached = cache.get(tag);
    if (cached) return cached;

    const result: Record<string, string> = {};
    try {
      const targetDoc = oracleDoc ?? doc;
      const probe = targetDoc.createElement(tag);
      const container = oracleDoc?.body;
      if (container) container.appendChild(probe);
      const view = oracleDoc?.defaultView ?? window;
      const cs = view.getComputedStyle(probe);
      for (const prop of FULL_CLONE_CSS_PROPERTIES) {
        result[prop] = cs.getPropertyValue(prop);
      }
      if (container) probe.remove();
    } catch {
      // Fallback: empty defaults
    }

    cache.set(tag, result);
    return result;
  };

  const dispose = () => {
    if (sandboxFrame && sandboxFrame.isConnected) {
      sandboxFrame.remove();
    }
    sandboxFrame = null;
    oracleDoc = null;
  };

  return { getDefaults, dispose };
}

function shouldOmitHeight(el: Element, computed: CSSStyleDeclaration): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'img' || tag === 'svg' || tag === 'canvas' || tag === 'video' || tag === 'iframe') {
    return false;
  }
  if (computed.position === 'absolute' || computed.position === 'fixed') return false;
  if (computed.overflow !== 'visible' || computed.overflowY !== 'visible') return false;
  // Keep explicit height for empty decorative boxes/icons/spacers
  if (el.children.length === 0 && !(el.textContent ?? '').trim()) return false;
  return FLOW_TEXT_TAGS.has(tag);
}

function shouldConvertWidthToAuto(el: Element, computed: CSSStyleDeclaration): boolean {
  if (computed.display !== 'block' && computed.display !== 'flex' && computed.display !== 'grid') {
    return false;
  }
  if (computed.position === 'absolute' || computed.position === 'fixed') return false;
  const parent = el.parentElement;
  if (!parent) return false;
  const elRect = el.getBoundingClientRect();
  const parentStyle = window.getComputedStyle(parent);
  const parentRect = parent.getBoundingClientRect();
  const parentInnerW =
    parentRect.width -
    (parseFloat(parentStyle.paddingLeft) || 0) -
    (parseFloat(parentStyle.paddingRight) || 0) -
    (parseFloat(parentStyle.borderLeftWidth) || 0) -
    (parseFloat(parentStyle.borderRightWidth) || 0);
  return elRect.width > 0 && parentInnerW > 0 && Math.abs(elRect.width - parentInnerW) <= 2;
}

/**
 * Extract computed declarations that differ from UA defaults (plus layout-critical resets).
 */
export function extractElementDeclarations(
  el: Element,
  computed: CSSStyleDeclaration,
  defaults: Record<string, string>,
  isRootBody: boolean,
): string[] {
  const decls: string[] = [];
  const tag = el.tagName.toLowerCase();
  const isSvgChild = el instanceof SVGElement && tag !== 'svg';
  const omitHeight = shouldOmitHeight(el, computed);
  const autoWidth = shouldConvertWidthToAuto(el, computed);

  for (const prop of FULL_CLONE_CSS_PROPERTIES) {
    if (isRootBody && (prop === 'width' || prop === 'height')) continue;
    if ((prop === 'width' || prop === 'height') && computed.display === 'inline') continue;
    if (prop === 'height' && omitHeight) continue;
    if (prop === 'width' && autoWidth) continue;

    if (!isSvgChild && tag !== 'svg' && (prop === 'fill' || prop === 'stroke' || prop === 'stroke-width')) {
      continue;
    }

    const val = computed.getPropertyValue(prop).trim();
    if (!val) continue;

    const defVal = defaults[prop];
    if (defVal !== undefined && val === defVal) continue;

    if (defVal === undefined) {
      if (
        val === 'none' ||
        val === 'normal' ||
        val === 'auto' ||
        val === '0px' ||
        val === 'rgba(0, 0, 0, 0)'
      ) {
        continue;
      }
    }

    decls.push(`  ${prop}: ${val};`);
  }

  return decls;
}

/**
 * Capture `::before` or `::after` pseudo-element declarations if active (`content` != none/normal).
 */
export function extractPseudoDeclarations(
  el: Element,
  pseudo: '::before' | '::after',
): string[] {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return [];
  }
  try {
    const cs = window.getComputedStyle(el, pseudo);
    const content = cs.getPropertyValue('content').trim();
    if (!content || content === 'none' || content === 'normal') return [];

    const decls: string[] = [`  content: ${content};`];
    for (const prop of PSEUDO_CSS_PROPERTIES) {
      if (prop === 'content') continue;
      const val = cs.getPropertyValue(prop).trim();
      if (
        !val ||
        val === 'none' ||
        val === 'normal' ||
        val === 'auto' ||
        val === '0px' ||
        val === 'rgba(0, 0, 0, 0)' ||
        val === 'static' ||
        val === '1'
      ) {
        continue;
      }
      decls.push(`  ${prop}: ${val};`);
    }
    return decls;
  } catch {
    return [];
  }
}

function resolveCssUrls(cssText: string, baseHref: string | null): string {
  if (!baseHref) return cssText;
  return cssText.replace(/url\((["']?)([^"')]+)\1\)/g, (_match, quote, rawUrl) => {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('#')) {
      return `url(${quote}${trimmed}${quote})`;
    }
    try {
      const abs = new URL(trimmed, baseHref).href;
      return `url("${abs}")`;
    } catch {
      return `url(${quote}${trimmed}${quote})`;
    }
  });
}

function walkStyleSheetForFonts(
  sheet: CSSStyleSheet,
  fontFaceCss: string[],
  fallbackBase: string,
  visited = new Set<CSSStyleSheet>(),
): void {
  if (visited.has(sheet)) return;
  visited.add(sheet);

  const baseHref = sheet.href || fallbackBase;
  try {
    for (const rule of Array.from(sheet.cssRules)) {
      if (typeof CSSFontFaceRule !== 'undefined' && rule instanceof CSSFontFaceRule) {
        fontFaceCss.push(resolveCssUrls(rule.cssText, baseHref));
      } else if (typeof CSSImportRule !== 'undefined' && rule instanceof CSSImportRule && rule.styleSheet) {
        walkStyleSheetForFonts(rule.styleSheet, fontFaceCss, baseHref, visited);
      }
    }
  } catch {
    // Cross-origin stylesheet; skip safely
  }
}

/**
 * Collect `@font-face` rules (with resolved `url(...)` paths) and external font `<link>` tags.
 */
export function collectPageFontAssets(doc: Document): {
  fontLinks: string[];
  fontFaceCss: string[];
} {
  const fontLinks: string[] = [];
  const fontFaceCss: string[] = [];
  const seenLinks = new Set<string>();
  const fallbackBase = doc.baseURI || '';

  for (const link of Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))) {
    const href = (link as HTMLLinkElement).href || link.getAttribute('href') || '';
    if (!href || seenLinks.has(href)) continue;
    const lower = href.toLowerCase();
    if (
      lower.includes('fonts.googleapis.com') ||
      lower.includes('fonts.bunny.net') ||
      lower.includes('use.typekit.net') ||
      lower.includes('font-awesome') ||
      lower.includes('fontawesome') ||
      lower.includes('font')
    ) {
      seenLinks.add(href);
      fontLinks.push(href);
    }
  }

  for (const sheet of Array.from(doc.styleSheets)) {
    walkStyleSheetForFonts(sheet, fontFaceCss, fallbackBase);
  }

  return { fontLinks, fontFaceCss };
}

/**
 * Collect referenced `<symbol>` / `<defs>` SVG elements for `<use href="#id">` icons inside `root`.
 */
export function collectReferencedSvgSprites(doc: Document, root: Element): string {
  const useEls = Array.from(root.querySelectorAll('use'));
  if (useEls.length === 0) return '';

  const referencedIds = new Set<string>();
  for (const useEl of useEls) {
    const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '';
    if (href.startsWith('#') && href.length > 1) {
      referencedIds.add(href.slice(1));
    }
  }
  if (referencedIds.size === 0) return '';

  const symbols: string[] = [];
  const serializer = new XMLSerializer();
  for (const id of referencedIds) {
    const target = doc.getElementById(id);
    if (target && !root.contains(target)) {
      symbols.push(serializer.serializeToString(target));
    }
  }

  if (symbols.length === 0) return '';
  return `<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">\n  <defs>\n    ${symbols.join('\n    ')}\n  </defs>\n</svg>`;
}
