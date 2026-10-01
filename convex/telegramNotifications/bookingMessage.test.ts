import { expect, test } from "vitest";
import { formatBookingNotificationMessage } from "../../shared/telegramNotificationMessages";
import { bookingCalendarUrl } from "./bookingMessage";

test("booking notification names the customer, service, and date on the workspace hostname", () => {
  const openUrl = bookingCalendarUrl(
    "https://chat.gosolutions.sg",
    "agent-1",
    "event-1",
  );
  const message = formatBookingNotificationMessage({
    label: "New booking",
    agentName: "Support Agent",
    customerName: "Alicia Tan",
    serviceName: "Consultation",
    date: "October 2 (Friday)",
    time: "4:00 PM - 4:30 PM",
    openUrl,
  });

  expect(openUrl).toBe(
    "https://chat.gosolutions.sg/dashboard/agent-1/calendar?eventId=event-1",
  );
  expect(message).toContain("Customer: Alicia Tan");
  expect(message).toContain("Service: Consultation");
  expect(message).toContain("Date: October 2 (Friday)");
  expect(message).toContain("Time: 4:00 PM - 4:30 PM");
  expect(message).toContain(`Open: ${openUrl}`);
});
