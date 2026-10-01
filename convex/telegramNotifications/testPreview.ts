import type { TelegramNotificationKind } from "../../shared/telegramNotificationKinds";
import {
  bookingSampleMessage,
  humanEscalationSampleMessage,
  markNotificationTest,
  type BookingNotificationLabel,
} from "../../shared/telegramNotificationMessages";

const bookingLabels: Record<Exclude<TelegramNotificationKind, "humanEscalation">, BookingNotificationLabel> = {
  bookingCreated: "New booking",
  bookingUpdated: "Booking updated",
  bookingCancelled: "Booking cancelled",
};

export function formatEventTestPreview(kind: TelegramNotificationKind, agentName: string): string {
  const message = kind === "humanEscalation"
    ? humanEscalationSampleMessage(agentName)
    : bookingSampleMessage(bookingLabels[kind], agentName);
  return markNotificationTest(message);
}
