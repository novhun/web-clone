import { describe, expect, it } from 'vitest';
import {
  collectPageFontAssets,
  collectReferencedSvgSprites,
  extractElementDeclarations,
} from '../src/core/css-capture';

describe('css-capture fidelity helpers', () => {
  it('captures positioning, grid, background-image, and explicit resets differing from defaults', () => {
    document.body.innerHTML = `
      <h1 id="title" style="position: relative; top: 8px; z-index: 10; margin-top: 0px; letter-spacing: 0.05em; background-image: linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255));">
        Hello
      </h1>
    `;
    const h1 = document.getElementById('title')!;
    const cs = window.getComputedStyle(h1);
    const decls = extractElementDeclarations(
      h1,
      cs,
      { 'margin-top': '21.44px', position: 'static', 'z-index': 'auto' },
      false,
    );

    const joined = decls.join('\n');
    expect(joined).toContain('position: relative;');
    expect(joined).toContain('top: 8px;');
    expect(joined).toContain('z-index: 10;');
    expect(joined).toContain('margin-top: 0px;');
    expect(joined).toContain('letter-spacing: 0.05em;');
    expect(joined).toContain('background-image: linear-gradient');
  });

  it('collects referenced SVG symbols and Google Font stylesheet links', () => {
    document.head.innerHTML = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" />`;
    document.body.innerHTML = `
      <svg style="display:none"><defs><symbol id="icon-star" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></symbol></defs></svg>
      <div id="card"><svg><use href="#icon-star"></use></svg></div>
    `;

    const card = document.getElementById('card')!;
    const sprites = collectReferencedSvgSprites(document, card);
    expect(sprites).toContain('id="icon-star"');

    const fonts = collectPageFontAssets(document);
    expect(fonts.fontLinks.some((h) => h.includes('fonts.googleapis.com'))).toBe(true);
  });
});
