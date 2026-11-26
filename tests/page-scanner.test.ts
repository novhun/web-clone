import { describe, expect, it } from 'vitest';
import { discoverPageSections, scanFullPage } from '../src/core/page-scanner';

describe('full-page scanner', () => {
  it('discovers semantic sections and skips extension overlay host', () => {
    document.body.innerHTML = `
      <header id="top-nav"><nav><a href="/">Home</a></nav></header>
      <main id="content">
        <section id="hero" style="color: rgb(200, 200, 200); background-color: rgb(255, 255, 255);">
          Low contrast hero text
        </section>
      </main>
      <footer id="bottom">Copyright</footer>
      <div id="webscope-shadow-host"><section id="fake">Overlay</section></div>
    `;

    const sections = discoverPageSections(document);
    const selectors = sections.map((s) => s.selector);
    expect(selectors).toContain('#top-nav');
    expect(selectors).toContain('#content');
    expect(selectors).toContain('#hero');
    expect(selectors).toContain('#bottom');
    expect(selectors).not.toContain('#fake');

    const scan = scanFullPage(document);
    expect(scan.totalElements).toBeGreaterThan(4);
    expect(scan.sections.length).toBeGreaterThanOrEqual(4);
    expect(scan.contrastIssues.some((issue) => issue.selector === '#hero')).toBe(true);
  });

  it('scans more than 600 elements without truncation', () => {
    const items = Array.from({ length: 700 }, (_, i) => `<div data-idx="${i}">Item ${i}</div>`).join('');
    document.body.innerHTML = `<main>${items}</main>`;

    const scan = scanFullPage(document);
    expect(scan.totalElements).toBeGreaterThan(700);
  });
});
