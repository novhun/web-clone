import { describe, expect, it } from 'vitest';
import { exportElementCode } from '../src/core/style-to-tailwind';

describe('deterministic web-to-code exporter', () => {
  it('exports Tailwind HTML and React JSX with converted attributes', () => {
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px; background-color: rgb(15, 23, 42); border-radius: 8px;">
        <label for="email">Email</label>
        <input id="email" type="email" />
      </div>
    `;
    const root = document.body.firstElementChild!;

    const tw = exportElementCode(root, 'tailwind');
    expect(tw.code).toContain('flex');
    expect(tw.code).toContain('flex-col');
    expect(tw.code).toContain('gap-4');
    expect(tw.code).toContain('p-4');
    expect(tw.code).toContain('rounded-lg');
    expect(tw.previewHtml).toContain('<!doctype html>');
    expect(tw.previewHtml).toContain('<style>');

    const jsx = exportElementCode(root, 'react-tailwind');
    expect(jsx.code).toContain('export function ExtractedComponent()');
    expect(jsx.code).toContain('className=');
    expect(jsx.code).toContain('htmlFor="email"');
    expect(jsx.previewHtml).toContain('<!doctype html>');

    const htmlCss = exportElementCode(root, 'html-css');
    expect(htmlCss.code).toContain('class="ws-div-1"');
    expect(htmlCss.css).toContain('.ws-div-1');
    expect(htmlCss.previewHtml).toContain('.ws-div-1');
  });

  it('skips extension shadow host when exporting full body', () => {
    document.body.innerHTML = `
      <main>Real Content</main>
      <div id="webscope-shadow-host">Inspector Overlay</div>
    `;

    const full = exportElementCode(document.body, 'tailwind');
    expect(full.code).toContain('Real Content');
    expect(full.code).not.toContain('webscope-shadow-host');
    expect(full.previewHtml).not.toContain('Inspector Overlay');
    expect(full.previewHtml).toContain('padding: 0;');
  });

  it('maps grid, positioning, text-transform, overflow, and cursor to Tailwind classes', () => {
    document.body.innerHTML = `
      <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; position: relative; top: 16px; overflow: hidden; text-transform: uppercase; white-space: nowrap; cursor: pointer;">
        <span>Cell</span>
      </div>
    `;
    const grid = document.getElementById('grid')!;
    const res = exportElementCode(grid, 'tailwind');
    expect(res.code).toContain('grid');
    expect(res.code).toContain('grid-cols-3');
    expect(res.code).toContain('relative');
    expect(res.code).toContain('top-4');
    expect(res.code).toContain('overflow-hidden');
    expect(res.code).toContain('uppercase');
    expect(res.code).toContain('whitespace-nowrap');
    expect(res.code).toContain('cursor-pointer');
  });

  it('skips hidden menus, strips extension attributes, preserves SVG casing, and deduplicates CSS', () => {
    document.body.innerHTML = `
      <div id="page" data-new-gr-c-s-check-loaded="14.1350.0" data-gr-ext-installed="">
        <nav id="hidden-mega-menu" style="display: none;">Hidden Mega Menu</nav>
        <a href="/a" style="color: rgb(4, 170, 109); padding: 8px;">Link A</a>
        <a href="/b" style="color: rgb(4, 170, 109); padding: 8px;">Link B</a>
        <svg viewBox="0 0 24 24"><defs><linearGradient id="g1"></linearGradient></defs><path d="M0 0h24v24H0z"></path></svg>
      </div>
    `;

    const page = document.getElementById('page')!;
    const res = exportElementCode(page, 'html-css');

    expect(res.code).not.toContain('data-new-gr-c-s-check-loaded');
    expect(res.code).not.toContain('Hidden Mega Menu');
    expect(res.code).toContain('<linearGradient');
    expect(res.code).not.toContain('ws-path-');

    // Both identical <a> links should share the exact same deduplicated CSS class
    const linkClasses = Array.from(res.code.matchAll(/<a class="(ws-a-\d+)"/g)).map((m) => m[1]);
    expect(linkClasses.length).toBe(2);
    expect(linkClasses[0]).toBe(linkClasses[1]);
  });
});
