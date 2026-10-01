import { notificationButtons, sampleBookingCalendarUrl, sampleWhatsAppChatUrl } from '../../shared/telegramNotificationActions';
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

export function eventTestNotification(
  kind: TelegramNotificationKind,
  agentName: string,
  _origin: string,
  _agentId: string,
) {
  const openUrl = sampleWhatsAppChatUrl;
  const message = kind === "humanEscalation"
    ? humanEscalationSampleMessage(agentName, openUrl)
    : bookingSampleMessage(bookingLabels[kind], agentName, openUrl);
  return {
    text: markNotificationTest(message),
    buttons: notificationButtons(openUrl, kind === "bookingCreated" ? sampleBookingCalendarUrl(openUrl) : undefined),
  };
}

export function formatEventTestPreview(
  kind: TelegramNotificationKind, agentName: string, origin: string, agentId: string,
): string {
  return eventTestNotification(kind, agentName, origin, agentId).text;
}
