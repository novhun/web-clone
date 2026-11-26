import { describe, expect, it } from 'vitest';
import { buildUniqueSelector, formatElementLabel, resolveSelector } from '../src/core/selector';

describe('selector utilities', () => {
  it('prefers unique id selectors', () => {
    document.body.innerHTML = '<main><button id="cta-btn" class="btn primary">Click</button></main>';
    const btn = document.getElementById('cta-btn')!;
    expect(buildUniqueSelector(btn)).toBe('#cta-btn');
    expect(resolveSelector(document, '#cta-btn')).toBe(btn);
  });

  it('disambiguates sibling elements with nth-of-type', () => {
    document.body.innerHTML = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';
    const items = document.querySelectorAll('li');
    const sel = buildUniqueSelector(items[1]);
    expect(sel).toContain('li:nth-of-type(2)');
    expect(resolveSelector(document, sel)).toBe(items[1]);
  });

  it('formats concise element labels', () => {
    document.body.innerHTML = '<div id="hero" class="card shadow-lg extra"></div>';
    const div = document.getElementById('hero')!;
    expect(formatElementLabel(div)).toBe('div#hero.card.shadow-lg');
  });
});
