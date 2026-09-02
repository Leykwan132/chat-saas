export type MessengerConnectionDialogState =
  | { kind: 'closed' }
  | { kind: 'connecting' }
  | { kind: 'error' };

export function isMessengerConnectionDialogOpen(
  state: MessengerConnectionDialogState,
) {
  return state.kind !== 'closed';
}

export function isMessengerConnectionDialogDismissible(
  state: MessengerConnectionDialogState,
) {
  return state.kind === 'error';
}
