import { describe, expect, it } from 'vitest';
import {
  extractPageAssets,
  extractPageTokens,
  formatTokensAs,
} from '../src/core/token-and-asset-extractor';

describe('token and asset extraction', () => {
  it('extracts page colors, fonts, and formats DESIGN.md & CSS variables', () => {
    document.body.innerHTML = `
      <section style="color: rgb(17, 24, 39); background-color: rgb(255, 255, 255); font-family: Inter, sans-serif; padding: 16px; border-radius: 8px;">
        <h1 style="font-size: 24px; font-weight: 700;">Title</h1>
      </section>
    `;

    const tokens = extractPageTokens(document);
    expect(tokens.colors.some((c) => c.hex === '#111827')).toBe(true);
    expect(tokens.fonts.some((f) => f.family === 'Inter')).toBe(true);

    const css = formatTokensAs(tokens, 'css');
    expect(css).toContain(':root {');
    expect(css).toContain('--color-1:');

    const md = formatTokensAs(tokens, 'design-md');
    expect(md).toContain('# Design System:');
    expect(md).toContain('## Color Palette');
  });

  it('extracts images and inline SVGs while skipping extension overlay host', () => {
    document.body.innerHTML = `
      <img src="https://example.com/hero.png" alt="Hero" />
      <svg id="logo-icon" width="24" height="24"><circle cx="12" cy="12" r="10" /></svg>
      <div id="webscope-shadow-host"><svg><rect width="10" height="10" /></svg></div>
    `;

    const assets = extractPageAssets(document);
    expect(assets.some((a) => a.kind === 'image' && a.url === 'https://example.com/hero.png')).toBe(true);
    expect(assets.some((a) => a.kind === 'svg' && a.label === 'logo-icon')).toBe(true);
  });
});
