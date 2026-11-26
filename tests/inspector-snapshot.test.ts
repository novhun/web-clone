import { describe, expect, it } from 'vitest';
import { captureElementSnapshot } from '../src/core/inspector-snapshot';

describe('captureElementSnapshot', () => {
  it('captures computed styles, box model, breadcrumbs, and children', () => {
    document.body.innerHTML = `
      <main id="wrapper">
        <div id="card" class="panel" style="padding: 12px 16px; margin: 8px; color: rgb(0, 0, 0); background-color: rgb(255, 255, 255); font-size: 16px;">
          <h2>Heading</h2>
          <p>Description text</p>
        </div>
      </main>
    `;

    const card = document.getElementById('card')!;
    const snap = captureElementSnapshot(card, { 'font-size': '16px' });

    expect(snap.selector).toBe('#card');
    expect(snap.tagName).toBe('div');
    expect(snap.boxModel.padding).toEqual({ top: 12, right: 16, bottom: 12, left: 16 });
    expect(snap.boxModel.margin).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
    expect(snap.computed['font-size']).toBe('16px');
    expect(snap.inlineOverrides).toEqual({ 'font-size': '16px' });
    expect(snap.breadcrumbs.map((b) => b.label)).toEqual(['body', 'main#wrapper', 'div#card.panel']);
    expect(snap.children.map((c) => c.label)).toEqual(['h2', 'p']);
    expect(snap.contrast?.ratio).toBe(21);
  });
});
