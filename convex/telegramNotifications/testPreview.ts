import type { TelegramNotificationKind } from "../../shared/telegramNotificationKinds";

export function formatEventTestPreview(kind: TelegramNotificationKind, agentName: string): string {
  if (kind === "humanEscalation") {
    return `🧪 TEST — Human escalation\n\nAgent: ${agentName}\nCustomer: Sample Customer\nContact: sample@example.com\nLatest message: I need help with my booking.\nNeeds help: Please review the customer request.\nContext: This is a sample escalation notification.`;
  }

  const label = kind === "bookingCreated"
    ? "New booking"
    : kind === "bookingUpdated"
      ? "Booking updated"
      : "Booking cancelled";
  return `🧪 TEST — ${label}\n\nAgent: ${agentName}\nBooking: Consultation - Sample Customer\nDate: August 6 (Thursday)\nTime: 10:00 AM - 10:30 AM (Asia/Kuala_Lumpur)\nCustomer: Sample Customer <sample@example.com>\nService: Consultation\nStatus: Confirmed\n\nThis is a sample notification.`;
}
