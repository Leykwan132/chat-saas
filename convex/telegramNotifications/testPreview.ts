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

export function formatEventTestPreview(
  kind: TelegramNotificationKind,
  agentName: string,
  origin: string,
  agentId: string,
): string {
  const base = origin.replace(/\/$/, "");
  const openUrl = kind === "humanEscalation"
    ? `${base}/dashboard/${agentId}/inbox`
    : `${base}/dashboard/${agentId}/calendar`;
  const message = kind === "humanEscalation"
    ? humanEscalationSampleMessage(agentName, openUrl)
    : bookingSampleMessage(bookingLabels[kind], agentName, openUrl);
  return markNotificationTest(message);
}
