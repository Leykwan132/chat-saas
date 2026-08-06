export function recipientAddErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes('This Telegram recipient is already added to the agent')) {
    return 'This number is already in your recipient list.';
  }

  return 'Could not add recipient. Please try again.';
}
