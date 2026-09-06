export function bookingReplyMessages(
  generatedMessages: string[],
  booking: {
    confirmationMessage?: string;
    shouldSuppress: boolean;
  },
): string[] {
  if (booking.confirmationMessage) return [booking.confirmationMessage];
  if (booking.shouldSuppress) return [];
  return generatedMessages;
}
