export function inventedBookingConfirmation(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("confirmation link") ||
    normalized.includes("check your inbox") ||
    normalized.includes("spam folder") ||
    normalized.includes("sent the confirmation") ||
    normalized.includes("is now booked")
  );
}

export const BOOKING_NOT_COMPLETED_MESSAGE =
  "I couldn’t complete the booking yet. Please confirm your preferred slot so I can try again.";

export function resolveBookingReply(args: {
  generatedMessages: string[];
  confirmationMessage?: string;
  bookingExists: boolean;
  hadBookingBefore: boolean;
}): string[] {
  const invented = args.generatedMessages.some(inventedBookingConfirmation);
  if (invented && !(args.bookingExists && args.confirmationMessage)) {
    return [BOOKING_NOT_COMPLETED_MESSAGE];
  }
  if (args.bookingExists && args.confirmationMessage && (!args.hadBookingBefore || invented)) {
    return [args.confirmationMessage];
  }
  return args.generatedMessages;
}
