import { describe, expect, it } from 'vitest';
import { contrastRatio, parseCssColor, rgbaToHex } from '../src/core/wcag';

describe('WCAG color & contrast', () => {
  it('parses rgb/rgba and hex colors accurately', () => {
    expect(parseCssColor('rgb(15, 23, 42)')).toEqual({ r: 15, g: 23, b: 42, a: 1 });
    expect(parseCssColor('#3b82f6')).toEqual({ r: 59, g: 130, b: 246, a: 1 });
    expect(rgbaToHex({ r: 59, g: 130, b: 246, a: 1 })).toBe('#3b82f6');
  });

  it('computes 21:1 contrast for black on white', () => {
    const black = parseCssColor('#000000')!;
    const white = parseCssColor('#ffffff')!;
    expect(contrastRatio(black, white)).toBe(21);
  });
});
