import { describe, expect, test } from 'vitest';
import { resolveModelPickerAction } from './modelPickerSelection';

describe('resolveModelPickerAction', () => {
  test('selects an accessible model', () => {
    expect(resolveModelPickerAction(true)).toBe('select');
  });

  test('selects a model whose access is unspecified', () => {
    expect(resolveModelPickerAction(undefined)).toBe('select');
  });

  test('opens upgrade for a locked model', () => {
    expect(resolveModelPickerAction(false)).toBe('upgrade');
  });
});
