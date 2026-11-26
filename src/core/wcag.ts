import type { ContrastInfo } from '../shared/types';

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parse a CSS color string (`rgb(...)`, `rgba(...)`, or `#hex`) into RGBA components.
 */
export function parseCssColor(input: string): RgbaColor | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  );
  if (rgbMatch) {
    const r = clampByte(Number(rgbMatch[1]));
    const g = clampByte(Number(rgbMatch[2]));
    const b = clampByte(Number(rgbMatch[3]));
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%')
        ? clampUnit(parseFloat(rgbMatch[4]) / 100)
        : clampUnit(parseFloat(rgbMatch[4]));
    }
    return { r, g, b, a };
  }

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a };
    }
  }

  return null;
}

export function rgbaToHex(color: RgbaColor): string {
  const toHex = (n: number) => Math.round(clampByte(n)).toString(16).padStart(2, '0');
  const base = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  if (color.a < 0.999) {
    return `${base}${toHex(color.a * 255)}`;
  }
  return base;
}

/**
 * Alpha-composite `fg` over `bg` using standard Porter-Duff source-over blending.
 */
export function compositeOver(fg: RgbaColor, bg: RgbaColor): RgbaColor {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 255, g: 255, b: 255, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

export function relativeLuminance(color: RgbaColor): number {
  const linearize = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

export function contrastRatio(fg: RgbaColor, bg: RgbaColor): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Resolve the effective background color of an element by walking up its ancestors
 * and compositing semi-transparent backgrounds over a white page canvas.
 */
export function resolveEffectiveBackground(element: Element): RgbaColor {
  const layers: RgbaColor[] = [];
  let current: Element | null = element;
  while (current) {
    const bgStr = window.getComputedStyle(current).backgroundColor;
    const parsed = parseCssColor(bgStr);
    if (parsed && parsed.a > 0) {
      layers.push(parsed);
      if (parsed.a >= 0.999) break;
    }
    current = current.parentElement;
  }

  let effective: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) {
    effective = compositeOver(layers[i], effective);
  }
  return effective;
}

export function computeElementContrast(element: Element): ContrastInfo | null {
  const computed = window.getComputedStyle(element);
  const fgParsed = parseCssColor(computed.color);
  if (!fgParsed) return null;

  const bgEffective = resolveEffectiveBackground(element);
  const fgEffective = fgParsed.a < 1 ? compositeOver(fgParsed, bgEffective) : fgParsed;
  const ratio = contrastRatio(fgEffective, bgEffective);

  return {
    foreground: rgbaToHex(fgEffective),
    background: rgbaToHex(bgEffective),
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Number.isFinite(n) ? n : 0));
}

function clampUnit(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1));
}
