import { describe, expect, it } from 'vitest';
import { StyleMutator } from '../src/core/style-mutator';

describe('StyleMutator', () => {
  it('applies live styles, tracks overrides, undoes, and resets cleanly', () => {
    document.body.innerHTML = '<div id="box" style="color: red;">Hello</div>';
    const box = document.getElementById('box') as HTMLElement;
    const mutator = new StyleMutator();

    mutator.apply(box, 'color', 'blue');
    mutator.apply(box, 'padding', '16px');

    expect(box.style.getPropertyValue('color')).toBe('blue');
    expect(box.style.getPropertyValue('padding')).toBe('16px');
    expect(mutator.canUndo).toBe(true);
    expect(mutator.overrideCount).toBe(2);
    expect(mutator.getOverrides(box)).toEqual({ color: 'blue', padding: '16px' });

    mutator.undo();
    expect(box.style.getPropertyValue('padding')).toBe('');
    expect(box.style.getPropertyValue('color')).toBe('blue');
    expect(mutator.overrideCount).toBe(1);

    mutator.resetAll();
    expect(box.style.getPropertyValue('color')).toBe('red');
    expect(mutator.canUndo).toBe(false);
    expect(mutator.overrideCount).toBe(0);
  });
});
