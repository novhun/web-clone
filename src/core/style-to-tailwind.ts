import type { CodeExportFormat, CodeExportResult } from '../shared/types';
import {
  collectPageFontAssets,
  collectReferencedSvgSprites,
  createDefaultStyleOracle,
  extractElementDeclarations,
  extractPseudoDeclarations,
  type DefaultStyleOracle,
} from './css-capture';
import { parseCssColor, rgbaToHex } from './wcag';

const SPACING_SCALE: Record<string, string> = {
  '0px': '0',
  '1px': 'px',
  '2px': '0.5',
  '4px': '1',
  '6px': '1.5',
  '8px': '2',
  '10px': '2.5',
  '12px': '3',
  '14px': '3.5',
  '16px': '4',
  '20px': '5',
  '24px': '6',
  '28px': '7',
  '32px': '8',
  '36px': '9',
  '40px': '10',
  '44px': '11',
  '48px': '12',
  '56px': '14',
  '64px': '16',
  '80px': '20',
  '96px': '24',
};

const FONT_SIZE_SCALE: Record<string, string> = {
  '12px': 'text-xs',
  '14px': 'text-sm',
  '16px': 'text-base',
  '18px': 'text-lg',
  '20px': 'text-xl',
  '24px': 'text-2xl',
  '30px': 'text-3xl',
  '36px': 'text-4xl',
  '48px': 'text-5xl',
  '60px': 'text-6xl',
  '72px': 'text-7xl',
};

const FONT_WEIGHT_SCALE: Record<string, string> = {
  '100': 'font-thin',
  '200': 'font-extralight',
  '300': 'font-light',
  '400': 'font-normal',
  '500': 'font-medium',
  '600': 'font-semibold',
  '700': 'font-bold',
  '800': 'font-extrabold',
  '900': 'font-black',
};

const RADIUS_SCALE: Record<string, string> = {
  '0px': '',
  '2px': 'rounded-xs',
  '4px': 'rounded-sm',
  '6px': 'rounded-md',
  '8px': 'rounded-lg',
  '12px': 'rounded-xl',
  '16px': 'rounded-2xl',
  '24px': 'rounded-3xl',
  '9999px': 'rounded-full',
};

const DISPLAY_MAP: Record<string, string> = {
  block: 'block',
  'inline-block': 'inline-block',
  inline: 'inline',
  flex: 'flex',
  'inline-flex': 'inline-flex',
  grid: 'grid',
  'inline-grid': 'inline-grid',
  none: 'hidden',
};

const JUSTIFY_MAP: Record<string, string> = {
  'flex-start': 'justify-start',
  'flex-end': 'justify-end',
  center: 'justify-center',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
  'space-evenly': 'justify-evenly',
};

const ALIGN_MAP: Record<string, string> = {
  'flex-start': 'items-start',
  'flex-end': 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

function toSpacingClass(prefix: string, pxVal: string): string | null {
  if (!pxVal || pxVal === '0px' || pxVal === 'auto' || pxVal === 'normal') {
    if (pxVal === 'auto' && prefix.startsWith('m')) return `${prefix}-auto`;
    return null;
  }
  const token = SPACING_SCALE[pxVal];
  if (token) return `${prefix}-${token}`;
  return `${prefix}-[${pxVal.replace(/\s+/g, '_')}]`;
}

function normalizeColorHex(val: string): string | null {
  const parsed = parseCssColor(val);
  if (!parsed || parsed.a === 0) return null;
  return rgbaToHex(parsed);
}

/**
 * Deterministically convert an element's computed styles into Tailwind utility classes.
 */
export function computedStyleToTailwind(style: CSSStyleDeclaration): string[] {
  const classes: string[] = [];

  const display = style.display;
  if (DISPLAY_MAP[display] && display !== 'block') {
    classes.push(DISPLAY_MAP[display]);
  }

  if (display.includes('flex')) {
    if (style.flexDirection === 'column') classes.push('flex-col');
    if (style.flexWrap === 'wrap') classes.push('flex-wrap');
    if (JUSTIFY_MAP[style.justifyContent]) classes.push(JUSTIFY_MAP[style.justifyContent]);
    if (ALIGN_MAP[style.alignItems]) classes.push(ALIGN_MAP[style.alignItems]);
  }

  if (display.includes('grid')) {
    if (JUSTIFY_MAP[style.justifyContent]) classes.push(JUSTIFY_MAP[style.justifyContent]);
    if (ALIGN_MAP[style.alignItems]) classes.push(ALIGN_MAP[style.alignItems]);
    const cols = style.gridTemplateColumns?.trim();
    if (cols && cols !== 'none') {
      const tracks = cols.split(/\s+/).filter(Boolean);
      const allEqual = tracks.length > 1 && tracks.every((t) => t === tracks[0]);
      classes.push(allEqual ? `grid-cols-${tracks.length}` : `grid-cols-[${cols.replace(/\s+/g, '_')}]`);
    }
  }

  if (display.includes('flex') || display.includes('grid')) {
    const gapClass = toSpacingClass('gap', style.gap || style.rowGap);
    if (gapClass) classes.push(gapClass);
  }

  if (style.flexGrow === '1') classes.push('grow');
  if (style.flexShrink === '0') classes.push('shrink-0');

  if (
    style.position === 'relative' ||
    style.position === 'absolute' ||
    style.position === 'fixed' ||
    style.position === 'sticky'
  ) {
    classes.push(style.position);
    for (const [edge, prefix] of [
      ['top', 'top'],
      ['right', 'right'],
      ['bottom', 'bottom'],
      ['left', 'left'],
    ] as const) {
      const val = style.getPropertyValue(edge);
      if (val && val !== 'auto') {
        classes.push(toSpacingClass(prefix, val) ?? `${prefix}-[${val}]`);
      }
    }
  }

  if (style.zIndex && style.zIndex !== 'auto' && style.zIndex !== '0') {
    classes.push(`z-[${style.zIndex}]`);
  }

  if (style.maxWidth && style.maxWidth !== 'none') {
    classes.push(`max-w-[${style.maxWidth}]`);
  }
  if (style.minHeight && style.minHeight !== '0px' && style.minHeight !== 'auto') {
    classes.push(`min-h-[${style.minHeight}]`);
  }

  if (style.overflow && style.overflow !== 'visible') {
    if (style.overflow === 'hidden' || style.overflow === 'auto' || style.overflow === 'scroll') {
      classes.push(`overflow-${style.overflow}`);
    }
  }

  // Padding shorthand collapsing
  const pt = style.paddingTop;
  const pr = style.paddingRight;
  const pb = style.paddingBottom;
  const pl = style.paddingLeft;
  if (pt === pr && pr === pb && pb === pl) {
    const c = toSpacingClass('p', pt);
    if (c) classes.push(c);
  } else {
    if (pt === pb) {
      const cy = toSpacingClass('py', pt);
      if (cy) classes.push(cy);
    } else {
      const ct = toSpacingClass('pt', pt);
      const cb = toSpacingClass('pb', pb);
      if (ct) classes.push(ct);
      if (cb) classes.push(cb);
    }
    if (pl === pr) {
      const cx = toSpacingClass('px', pl);
      if (cx) classes.push(cx);
    } else {
      const cl = toSpacingClass('pl', pl);
      const cr = toSpacingClass('pr', pr);
      if (cl) classes.push(cl);
      if (cr) classes.push(cr);
    }
  }

  // Margin shorthand collapsing
  const mt = style.marginTop;
  const mr = style.marginRight;
  const mb = style.marginBottom;
  const ml = style.marginLeft;
  if (mt === mr && mr === mb && mb === ml) {
    const c = toSpacingClass('m', mt);
    if (c) classes.push(c);
  } else {
    if (mt === mb) {
      const cy = toSpacingClass('my', mt);
      if (cy) classes.push(cy);
    } else {
      const ct = toSpacingClass('mt', mt);
      const cb = toSpacingClass('mb', mb);
      if (ct) classes.push(ct);
      if (cb) classes.push(cb);
    }
    if (ml === mr) {
      const cx = toSpacingClass('mx', ml);
      if (cx) classes.push(cx);
    } else {
      const cl = toSpacingClass('ml', ml);
      const cr = toSpacingClass('mr', mr);
      if (cl) classes.push(cl);
      if (cr) classes.push(cr);
    }
  }

  // Typography
  const fontSize = style.fontSize;
  if (fontSize && fontSize !== '16px') {
    classes.push(FONT_SIZE_SCALE[fontSize] ?? `text-[${fontSize}]`);
  }
  const weight = style.fontWeight;
  if (weight && weight !== '400' && weight !== 'normal') {
    classes.push(FONT_WEIGHT_SCALE[weight] ?? `font-[${weight}]`);
  }
  if (style.textAlign && style.textAlign !== 'start' && style.textAlign !== 'left') {
    classes.push(`text-${style.textAlign}`);
  }
  if (style.textTransform === 'uppercase' || style.textTransform === 'lowercase' || style.textTransform === 'capitalize') {
    classes.push(style.textTransform);
  }
  if (style.textDecorationLine === 'underline') classes.push('underline');
  if (style.textDecorationLine === 'line-through') classes.push('line-through');
  if (style.whiteSpace === 'nowrap') classes.push('whitespace-nowrap');

  const fgHex = normalizeColorHex(style.color);
  if (fgHex && fgHex !== '#000000') {
    classes.push(`text-[${fgHex}]`);
  }

  const bgHex = normalizeColorHex(style.backgroundColor);
  if (bgHex) {
    classes.push(`bg-[${bgHex}]`);
  }

  if (style.backgroundImage && style.backgroundImage !== 'none') {
    classes.push(`bg-[${style.backgroundImage.replace(/\s+/g, '_')}]`);
  }

  // Border & Radius
  const borderWidth = style.borderTopWidth;
  if (borderWidth && borderWidth !== '0px' && style.borderTopStyle !== 'none') {
    classes.push(borderWidth === '1px' ? 'border' : `border-[${borderWidth}]`);
    const borderHex = normalizeColorHex(style.borderTopColor);
    if (borderHex) classes.push(`border-[${borderHex}]`);
  }

  const radius = style.borderRadius || style.borderTopLeftRadius;
  if (radius && radius !== '0px') {
    classes.push(RADIUS_SCALE[radius] ?? `rounded-[${radius.replace(/\s+/g, '_')}]`);
  }

  if (style.objectFit && style.objectFit !== 'fill') {
    classes.push(`object-${style.objectFit}`);
  }

  if (style.opacity && style.opacity !== '1') {
    const pct = Math.round(parseFloat(style.opacity) * 100);
    if (Number.isFinite(pct)) classes.push(`opacity-${pct}`);
  }

  if (style.boxShadow && style.boxShadow !== 'none') {
    classes.push('shadow-sm');
  }

  if (style.cursor === 'pointer') {
    classes.push('cursor-pointer');
  }

  return Array.from(new Set(classes));
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function isThirdPartyExtensionElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return (
    el.id === 'webscope-shadow-host' ||
    tag.startsWith('grammarly-') ||
    tag === 'loom-container' ||
    tag === 'lastpass-icon'
  );
}

function isExtensionAttr(name: string): boolean {
  return (
    name === 'class' ||
    name === 'style' ||
    name.startsWith('on') ||
    name.startsWith('data-new-gr-') ||
    name.startsWith('data-gr-') ||
    name.startsWith('data-lt-')
  );
}

function escapeAttr(val: string): string {
  return val.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(val: string): string {
  return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function resolveUrlAttr(el: Element, attrName: string, attrValue: string): string {
  if (attrName !== 'src' && attrName !== 'href' && attrName !== 'poster') return attrValue;
  try {
    const base = el.ownerDocument?.baseURI;
    if (base && (base.startsWith('http://') || base.startsWith('https://'))) {
      return new URL(attrValue, base).href;
    }
  } catch {
    // Keep original attribute value if URL resolution fails
  }
  return attrValue;
}

interface CssCollector {
  counter: number;
  dedupMap: Map<string, string>;
  rules: string[];
  register(
    tag: string,
    decls: string[],
    beforeDecls: string[],
    afterDecls: string[],
  ): string | null;
}

function createCssCollector(): CssCollector {
  return {
    counter: 0,
    dedupMap: new Map(),
    rules: [],
    register(tag, decls, beforeDecls, afterDecls) {
      if (decls.length === 0 && beforeDecls.length === 0 && afterDecls.length === 0) {
        return null;
      }
      const key = `${decls.join('\n')}|B:${beforeDecls.join('\n')}|A:${afterDecls.join('\n')}`;
      const existing = this.dedupMap.get(key);
      if (existing) return existing;

      this.counter += 1;
      const className = `ws-${tag}-${this.counter}`;
      this.dedupMap.set(key, className);

      if (decls.length > 0) {
        this.rules.push(`.${className} {\n${decls.join('\n')}\n}`);
      }
      if (beforeDecls.length > 0) {
        this.rules.push(`.${className}::before {\n${beforeDecls.join('\n')}\n}`);
      }
      if (afterDecls.length > 0) {
        this.rules.push(`.${className}::after {\n${afterDecls.join('\n')}\n}`);
      }
      return className;
    },
  };
}

function serializeSvgElement(
  svgEl: SVGSVGElement,
  format: CodeExportFormat,
  style: CSSStyleDeclaration,
  cssCollector: CssCollector,
  oracle: DefaultStyleOracle,
  pad: string,
): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute('class');

  if (format === 'html-css') {
    const decls = extractElementDeclarations(svgEl, style, oracle.getDefaults('svg'), false);
    const className = cssCollector.register('svg', decls, [], []);
    if (className) clone.setAttribute('class', className);
  } else {
    const tw = computedStyleToTailwind(style);
    if (tw.length > 0) {
      clone.setAttribute(format === 'react-tailwind' ? 'className' : 'class', tw.join(' '));
    }
  }

  // Ensure XMLSerializer output preserves exact SVG tag casing (e.g. linearGradient, feGaussianBlur)
  const raw = new XMLSerializer().serializeToString(clone).replace(/\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, (m, offset) => (offset > 20 ? '' : m));
  return `${pad}${raw}`;
}

function serializeElementTree(
  el: Element,
  format: CodeExportFormat,
  cssCollector: CssCollector,
  oracle: DefaultStyleOracle,
  indent = 0,
  isRoot = true,
): string {
  if (isThirdPartyExtensionElement(el)) return '';
  const rawTag = el.tagName.toLowerCase();
  if (rawTag === 'script' || rawTag === 'style' || rawTag === 'noscript' || rawTag === 'template') {
    return '';
  }

  const style = window.getComputedStyle(el);
  // Skip hidden subtrees (collapsed mega-menus, mobile drawers, hidden modals) unless explicitly selected as root
  if (!isRoot && (style.display === 'none' || el.hasAttribute('hidden'))) {
    return '';
  }

  const isRootBody = rawTag === 'body';
  const tag = isRootBody ? 'div' : rawTag;
  const pad = '  '.repeat(indent);

  // Preserve SVG graphics cleanly via XMLSerializer (no ws-path-* bloat, preserves camelCase SVG tags)
  if (rawTag === 'svg' && typeof SVGSVGElement !== 'undefined' && el instanceof SVGSVGElement) {
    return serializeSvgElement(el, format, style, cssCollector, oracle, pad);
  }

  // Snapshot <canvas> into an <img> if readable
  if (rawTag === 'canvas') {
    try {
      const dataUrl = (el as HTMLCanvasElement).toDataURL();
      if (dataUrl && dataUrl !== 'data:,') {
        const attrs = [`src="${dataUrl}"`, `alt="canvas snapshot"`];
        if (format === 'html-css') {
          const decls = extractElementDeclarations(el, style, oracle.getDefaults('canvas'), false);
          const className = cssCollector.register('canvas', decls, [], []);
          if (className) attrs.unshift(`class="${className}"`);
        }
        return `${pad}<img ${attrs.join(' ')}${format === 'react-tailwind' ? ' /' : ''}>`;
      }
    } catch {
      // Tainted cross-origin canvas; fall through
    }
  }

  const attrs: string[] = [];

  for (const attr of Array.from(el.attributes)) {
    if (isExtensionAttr(attr.name)) continue;
    let name = attr.name;
    if (format === 'react-tailwind') {
      if (name === 'for') name = 'htmlFor';
      else if (name === 'tabindex') name = 'tabIndex';
      else if (name === 'readonly') name = 'readOnly';
    }
    const resolvedVal = resolveUrlAttr(el, attr.name, attr.value);
    attrs.push(`${name}="${escapeAttr(resolvedVal)}"`);
  }

  if (rawTag === 'img') {
    const imgEl = el as HTMLImageElement;
    if (imgEl.currentSrc && !attrs.some((a) => a.startsWith('src='))) {
      attrs.push(`src="${escapeAttr(imgEl.currentSrc)}"`);
    }
  }

  if (rawTag === 'input') {
    const inputEl = el as HTMLInputElement;
    if (inputEl.value && !attrs.some((a) => a.startsWith('value='))) {
      attrs.push(`value="${escapeAttr(inputEl.value)}"`);
    }
    if (inputEl.checked && !attrs.some((a) => a === 'checked')) {
      attrs.push('checked');
    }
  }

  if (format === 'html-css') {
    const decls = extractElementDeclarations(el, style, oracle.getDefaults(rawTag), isRootBody);
    const beforeDecls = extractPseudoDeclarations(el, '::before');
    const afterDecls = extractPseudoDeclarations(el, '::after');
    const className = cssCollector.register(tag, decls, beforeDecls, afterDecls);
    if (className) {
      attrs.unshift(`class="${className}"`);
    }
  } else {
    const tw = computedStyleToTailwind(style);
    if (tw.length > 0) {
      const attrName = format === 'react-tailwind' ? 'className' : 'class';
      attrs.unshift(`${attrName}="${tw.join(' ')}"`);
    }
  }

  const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  if (VOID_TAGS.has(tag)) {
    return `${pad}<${tag}${attrStr}${format === 'react-tailwind' ? ' /' : ''}>`;
  }

  const childrenOut: string[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (txt) childrenOut.push(`${'  '.repeat(indent + 1)}${escapeText(txt)}`);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childSerialized = serializeElementTree(
        node as Element,
        format,
        cssCollector,
        oracle,
        indent + 1,
        false,
      );
      if (childSerialized) childrenOut.push(childSerialized);
    }
  }

  if (childrenOut.length === 0) {
    return `${pad}<${tag}${attrStr}></${tag}>`;
  }

  if (childrenOut.length === 1 && !childrenOut[0].trimStart().startsWith('<')) {
    return `${pad}<${tag}${attrStr}>${childrenOut[0].trim()}</${tag}>`;
  }

  return `${pad}<${tag}${attrStr}>\n${childrenOut.join('\n')}\n${pad}</${tag}>`;
}

function buildPreviewHtml(
  el: Element,
  htmlMarkup: string,
  cssText: string,
  svgSprites: string,
): string {
  const doc = el.ownerDocument;
  const isFullBody = el.tagName.toLowerCase() === 'body';
  const bodyStyle = window.getComputedStyle(doc.body || el);
  const bg =
    bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ? bodyStyle.backgroundColor
      : '#ffffff';
  const font = bodyStyle.fontFamily || 'system-ui, -apple-system, sans-serif';
  const baseUri = doc?.baseURI ?? '';
  const baseTag =
    baseUri.startsWith('http://') || baseUri.startsWith('https://')
      ? `<base href="${escapeAttr(baseUri)}" />`
      : '';

  const { fontLinks, fontFaceCss } = collectPageFontAssets(doc);
  const fontLinkTags = fontLinks
    .map((href) => `<link rel="stylesheet" href="${escapeAttr(href)}" />`)
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
${baseTag}
${fontLinkTags}
<style>
  ${fontFaceCss.join('\n')}
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: ${isFullBody ? '0' : '12px'};
    background: ${bg};
    font-family: ${font};
    min-height: 100%;
  }
  img, video { max-width: 100%; }
  ${cssText}
</style>
</head>
<body>
${svgSprites}
${htmlMarkup}
</body>
</html>`;
}

export function exportElementCode(el: Element, format: CodeExportFormat): CodeExportResult {
  const doc = el.ownerDocument;
  const oracle = createDefaultStyleOracle(doc);
  const viewportWidth = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1280;

  try {
    const cssCollector = createCssCollector();
    const svgSprites = collectReferencedSvgSprites(doc, el);
    const markup = serializeElementTree(
      el,
      format,
      cssCollector,
      oracle,
      format === 'react-tailwind' ? 2 : 0,
      true,
    );

    let previewHtml: string;
    if (format === 'html-css') {
      previewHtml = buildPreviewHtml(el, markup, cssCollector.rules.join('\n\n'), svgSprites);
    } else {
      const previewCssCollector = createCssCollector();
      const previewMarkup = serializeElementTree(
        el,
        'html-css',
        previewCssCollector,
        oracle,
        0,
        true,
      );
      previewHtml = buildPreviewHtml(
        el,
        previewMarkup,
        previewCssCollector.rules.join('\n\n'),
        svgSprites,
      );
    }

    if (format === 'react-tailwind') {
      const code = `export function ExtractedComponent() {\n  return (\n${markup}\n  );\n}`;
      return { format, code, previewHtml, viewportWidth };
    }

    if (format === 'html-css') {
      const finalHtml = svgSprites ? `${svgSprites}\n${markup}` : markup;
      return {
        format,
        code: finalHtml,
        css: cssCollector.rules.join('\n\n'),
        previewHtml,
        viewportWidth,
      };
    }

    return { format, code: markup, previewHtml, viewportWidth };
  } finally {
    oracle.dispose();
  }
}
