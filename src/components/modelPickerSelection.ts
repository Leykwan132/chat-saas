export type ModelPickerAction = 'select' | 'upgrade';
export type ModelPickerKeyboardAction =
  | 'activate'
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'ignore';
export type ModelPickerFocusAction = Exclude<
  ModelPickerKeyboardAction,
  'activate' | 'ignore'
>;

export function resolveModelPickerAction(
  accessible: boolean | undefined,
): ModelPickerAction {
  return accessible === false ? 'upgrade' : 'select';
}

export function resolveModelPickerKeyboardAction(key: string): ModelPickerKeyboardAction {
  if (key === 'Enter' || key === ' ') return 'activate';
  if (key === 'ArrowDown') return 'next';
  if (key === 'ArrowUp') return 'previous';
  if (key === 'Home') return 'first';
  if (key === 'End') return 'last';
  return 'ignore';
}

export function getModelPickerFocusTargetIndex(
  currentIndex: number,
  itemCount: number,
  action: ModelPickerFocusAction,
): number | null {
  if (currentIndex < 0 || itemCount <= 0) return null;
  if (action === 'first') return 0;
  if (action === 'last') return itemCount - 1;
  if (action === 'next') return Math.min(currentIndex + 1, itemCount - 1);
  return Math.max(currentIndex - 1, 0);
}
