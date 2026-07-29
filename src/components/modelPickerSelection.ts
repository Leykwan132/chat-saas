export type ModelPickerAction = 'select' | 'upgrade';

export function resolveModelPickerAction(
  accessible: boolean | undefined,
): ModelPickerAction {
  return accessible === false ? 'upgrade' : 'select';
}
