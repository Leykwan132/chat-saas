const MESSAGE_LIMIT = 280;

function clip(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= MESSAGE_LIMIT) return trimmed;
  return `${trimmed.slice(0, MESSAGE_LIMIT - 1)}…`;
}

function line(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `${label}: ${clip(trimmed)}`;
}

export function formatHumanEscalationMessage(input: {
  agentName: string;
  customerName: string;
  contact: string;
  channel: string;
  latestMessage: string;
  question: string;
  context: string;
  openUrl: string;
}): string {
  const lines = [
    "🚨 Human escalation",
    "",
    line("Agent", input.agentName),
    line("Customer", input.customerName),
    line("Contact", input.contact),
    line("Channel", input.channel),
    line("Latest message", input.latestMessage),
    line("Needs help", input.question),
    line("Context", input.context),
    "",
    `Open: ${input.openUrl}`,
  ].filter((entry): entry is string => entry !== null);
  return lines.join("\n");
}

export function formatBookingNotificationMessage(input: {
  label: string;
  agentName: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  openUrl: string;
}): string {
  const lines = [
    `📅 ${input.label}`,
    "",
    line("Agent", input.agentName),
    line("Customer", input.customerName),
    line("Service", input.serviceName),
    line("Date", input.date),
    line("Time", input.time),
    "",
    `Open: ${input.openUrl}`,
  ].filter((entry): entry is string => entry !== null);
  return lines.join("\n");
}

const sampleInboxUrl = "https://your-domain/dashboard/…/inbox?conversation=…";
const sampleCalendarUrl = "https://your-domain/dashboard/…/calendar?eventId=…";

export function humanEscalationSampleMessage(agentName = "Support Agent"): string {
  return formatHumanEscalationMessage({
    agentName,
    customerName: "Sample Customer",
    contact: "sample@example.com",
    channel: "WhatsApp",
    latestMessage: "I need help with my booking.",
    question: "Please review the customer request.",
    context: "The customer asked for a person after the booking could not be changed.",
    openUrl: sampleInboxUrl,
  });
}

export type BookingNotificationLabel = "New booking" | "Booking updated" | "Booking cancelled";

export function bookingSampleMessage(
  label: BookingNotificationLabel,
  agentName = "Support Agent",
): string {
  return formatBookingNotificationMessage({
    label,
    agentName,
    customerName: "Sample Customer",
    serviceName: "Consultation",
    date: "August 6 (Thursday)",
    time: "10:00 AM - 10:30 AM",
    openUrl: sampleCalendarUrl,
  });
}

export function markNotificationTest(message: string): string {
  const [title, ...rest] = message.split("\n");
  const label = title.replace(/^(🚨|📅)\s/, "");
  return [`🧪 TEST — ${label}`, ...rest].join("\n");
}
