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

export function resolveBookingReply(args: {
  generatedMessages: string[];
  confirmationMessage?: string;
  bookingExists: boolean;
  hadBookingBefore: boolean;
  shouldSuppressUnverified: boolean;
}): string[] {
  const invented = args.generatedMessages.some(inventedBookingConfirmation);
  if (invented && !(args.bookingExists && args.confirmationMessage)) {
    return [];
  }
  if (args.bookingExists && args.confirmationMessage && (!args.hadBookingBefore || invented)) {
    return [args.confirmationMessage];
  }
  if (!args.bookingExists && args.shouldSuppressUnverified) {
    return [];
  }
  return args.generatedMessages;
}
