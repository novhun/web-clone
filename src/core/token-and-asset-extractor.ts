import type { ColorToken, ExtractedAsset, FontToken, PageTokens } from '../shared/types';
import { parseCssColor, rgbaToHex } from './wcag';

export function extractPageTokens(doc: Document = document): PageTokens {
  const colorMap = new Map<
    string,
    { value: string; hex: string; count: number; usages: Set<'text' | 'background' | 'border'> }
  >();
  const fontMap = new Map<
    string,
    { family: string; weights: Set<string>; sizes: Set<string>; count: number }
  >();
  const spacingSet = new Set<string>();
  const radiiSet = new Set<string>();
  const shadowSet = new Set<string>();

  const elements = Array.from(doc.querySelectorAll('*'));

  const recordColor = (raw: string, usage: 'text' | 'background' | 'border') => {
    const parsed = parseCssColor(raw);
    if (!parsed || parsed.a === 0) return;
    const hex = rgbaToHex(parsed);
    const existing = colorMap.get(hex);
    if (existing) {
      existing.count += 1;
      existing.usages.add(usage);
    } else {
      colorMap.set(hex, { value: raw, hex, count: 1, usages: new Set([usage]) });
    }
  };

  for (const el of elements) {
    if (el.closest('#webscope-shadow-host')) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'meta' || tag === 'link') {
      continue;
    }

    const style = window.getComputedStyle(el);
    recordColor(style.color, 'text');
    recordColor(style.backgroundColor, 'background');
    if (style.borderTopWidth !== '0px' && style.borderTopStyle !== 'none') {
      recordColor(style.borderTopColor, 'border');
    }

    const primaryFont = style.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim();
    if (primaryFont) {
      const f = fontMap.get(primaryFont);
      if (f) {
        f.count += 1;
        f.weights.add(style.fontWeight);
        f.sizes.add(style.fontSize);
      } else {
        fontMap.set(primaryFont, {
          family: primaryFont,
          weights: new Set([style.fontWeight]),
          sizes: new Set([style.fontSize]),
          count: 1,
        });
      }
    }

    for (const sp of [style.paddingTop, style.paddingLeft, style.marginTop, style.gap]) {
      if (sp && sp !== '0px' && sp !== 'normal' && sp !== 'auto' && /^\d+(\.\d+)?px$/.test(sp)) {
        spacingSet.add(sp);
      }
    }

    if (style.borderRadius && style.borderRadius !== '0px') {
      radiiSet.add(style.borderRadius);
    }

    if (style.boxShadow && style.boxShadow !== 'none') {
      shadowSet.add(style.boxShadow);
    }
  }

  const cssVariables: Array<{ name: string; value: string }> = [];
  const seenVars = new Set<string>();
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSStyleRule && (rule.selectorText === ':root' || rule.selectorText === 'html')) {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith('--') && !seenVars.has(prop)) {
              seenVars.add(prop);
              cssVariables.push({ name: prop, value: rule.style.getPropertyValue(prop).trim() });
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheet cannot be read via cssRules; skip safely.
    }
  }

  const colors: ColorToken[] = Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count)
    .map((c) => ({
      value: c.value,
      hex: c.hex,
      count: c.count,
      usages: Array.from(c.usages),
    }));

  const fonts: FontToken[] = Array.from(fontMap.values())
    .sort((a, b) => b.count - a.count)
    .map((f) => ({
      family: f.family,
      weights: Array.from(f.weights).sort(),
      sizes: Array.from(f.sizes).sort((a, b) => parseFloat(a) - parseFloat(b)),
      count: f.count,
    }));

  return {
    url: doc.location?.href ?? '',
    title: doc.title ?? '',
    colors,
    fonts,
    spacing: Array.from(spacingSet).sort((a, b) => parseFloat(a) - parseFloat(b)),
    radii: Array.from(radiiSet),
    shadows: Array.from(shadowSet),
    cssVariables,
  };
}

export function formatTokensAs(tokens: PageTokens, format: 'css' | 'tailwind' | 'json' | 'design-md'): string {
  if (format === 'json') {
    return JSON.stringify(tokens, null, 2);
  }

  if (format === 'css') {
    const lines = [':root {'];
    tokens.colors.slice(0, 20).forEach((c, idx) => {
      lines.push(`  --color-${idx + 1}: ${c.hex};`);
    });
    tokens.fonts.slice(0, 6).forEach((f, idx) => {
      lines.push(`  --font-${idx + 1}: "${f.family}", sans-serif;`);
    });
    tokens.radii.slice(0, 6).forEach((r, idx) => {
      lines.push(`  --radius-${idx + 1}: ${r};`);
    });
    lines.push('}');
    return lines.join('\n');
  }

  if (format === 'tailwind') {
    const colorsObj: Record<string, string> = {};
    tokens.colors.slice(0, 20).forEach((c, idx) => {
      colorsObj[`brand-${idx + 1}`] = c.hex;
    });
    const fontsObj: Record<string, string[]> = {};
    tokens.fonts.slice(0, 6).forEach((f, idx) => {
      fontsObj[`family-${idx + 1}`] = [f.family, 'sans-serif'];
    });
    return `export default {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colorsObj, null, 8).replace(/\n/g, '\n      ')},\n      fontFamily: ${JSON.stringify(fontsObj, null, 8).replace(/\n/g, '\n      ')},\n    },\n  },\n};`;
  }

  // DESIGN.md
  const md: string[] = [
    `# Design System: ${tokens.title || tokens.url}`,
    '',
    `Source: ${tokens.url}`,
    '',
    '## Color Palette',
    ...tokens.colors.slice(0, 16).map((c) => `- \`${c.hex}\` (${c.usages.join(', ')}, used ${c.count}x)`),
    '',
    '## Typography',
    ...tokens.fonts.map((f) => `- **${f.family}** — weights: ${f.weights.join(', ')} | sizes: ${f.sizes.join(', ')}`),
    '',
    '## Spacing Scale',
    tokens.spacing.length > 0 ? tokens.spacing.map((s) => `\`${s}\``).join(', ') : '_None detected_',
    '',
    '## Border Radii',
    tokens.radii.length > 0 ? tokens.radii.map((r) => `\`${r}\``).join(', ') : '_None detected_',
  ];
  return md.join('\n');
}

export function extractPageAssets(doc: Document = document): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const seen = new Set<string>();
  let idx = 0;

  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.currentSrc || img.src;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    idx += 1;
    assets.push({
      id: `img-${idx}`,
      kind: 'image',
      url: src,
      width: img.naturalWidth || Math.round(img.getBoundingClientRect().width),
      height: img.naturalHeight || Math.round(img.getBoundingClientRect().height),
      label: img.alt || src.split('/').pop()?.split('?')[0] || `image-${idx}`,
    });
  }

  const serializer = new XMLSerializer();
  for (const svg of Array.from(doc.querySelectorAll('svg'))) {
    if (svg.closest('#webscope-shadow-host')) continue;
    const markup = serializer.serializeToString(svg);
    if (!markup || seen.has(markup)) continue;
    seen.add(markup);
    idx += 1;
    const rect = svg.getBoundingClientRect();
    assets.push({
      id: `svg-${idx}`,
      kind: 'svg',
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`,
      svgMarkup: markup,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      label: svg.getAttribute('aria-label') || svg.id || `icon-${idx}.svg`,
    });
  }

  for (const video of Array.from(doc.querySelectorAll('video'))) {
    const src = video.currentSrc || video.src || video.querySelector('source')?.src;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    idx += 1;
    assets.push({
      id: `video-${idx}`,
      kind: 'video',
      url: src,
      label: src.split('/').pop()?.split('?')[0] || `video-${idx}`,
    });
  }

  for (const audio of Array.from(doc.querySelectorAll('audio'))) {
    const src = audio.currentSrc || audio.src || audio.querySelector('source')?.src;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    idx += 1;
    assets.push({
      id: `audio-${idx}`,
      kind: 'audio',
      url: src,
      label: src.split('/').pop()?.split('?')[0] || `audio-${idx}`,
    });
  }

  for (const el of Array.from(doc.querySelectorAll('*'))) {
    if (el.closest('#webscope-shadow-host')) continue;
    const bg = window.getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') continue;
    const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (match?.[1] && !seen.has(match[1])) {
      seen.add(match[1]);
      idx += 1;
      assets.push({
        id: `bg-${idx}`,
        kind: 'background',
        url: match[1],
        label: match[1].split('/').pop()?.split('?')[0] || `background-${idx}`,
      });
    }
  }

  return assets;
}
