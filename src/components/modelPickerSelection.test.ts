import { describe, expect, test } from 'vitest';
import {
  getModelPickerFocusTargetIndex,
  resolveModelPickerAction,
  resolveModelPickerKeyboardAction,
} from './modelPickerSelection';

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

describe('resolveModelPickerKeyboardAction', () => {
  test.each(['Enter', ' '])('activates a focused model with %s', (key) => {
    expect(resolveModelPickerKeyboardAction(key)).toBe('activate');
  });

  test.each([
    ['ArrowDown', 'next'],
    ['ArrowUp', 'previous'],
    ['Home', 'first'],
    ['End', 'last'],
  ] as const)('maps %s to focused-row navigation', (key, action) => {
    expect(resolveModelPickerKeyboardAction(key)).toBe(action);
  });

  test('leaves unrelated keys alone', () => {
    expect(resolveModelPickerKeyboardAction('Tab')).toBe('ignore');
  });
});

describe('getModelPickerFocusTargetIndex', () => {
  test('moves and clamps focus within the visible model rows', () => {
    expect(getModelPickerFocusTargetIndex(1, 4, 'next')).toBe(2);
    expect(getModelPickerFocusTargetIndex(3, 4, 'next')).toBe(3);
    expect(getModelPickerFocusTargetIndex(1, 4, 'previous')).toBe(0);
    expect(getModelPickerFocusTargetIndex(0, 4, 'previous')).toBe(0);
  });

  test('moves directly to the first or last visible model row', () => {
    expect(getModelPickerFocusTargetIndex(2, 4, 'first')).toBe(0);
    expect(getModelPickerFocusTargetIndex(1, 4, 'last')).toBe(3);
  });
});
