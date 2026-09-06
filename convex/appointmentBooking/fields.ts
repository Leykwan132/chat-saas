import type { Doc, Id } from "../_generated/dataModel";
import { formatCalendarDateTime } from "../calendarFormatUtils";
import { DEFAULT_TEAM_TIME_ZONE, normalizeTimeZone } from "../teamHelpers";
import type { CollectedFields, ServiceFieldType } from "./types";

export const DEFAULT_SERVICE_FIELDS = [
  { key: "date", label: "Booking Date", type: "date" as const, options: undefined },
  { key: "time", label: "Booking Time", type: "time" as const, options: undefined },
  { key: "name", label: "Customer Name", type: "text" as const, options: undefined },
  { key: "phone", label: "Phone Number", type: "phone" as const, options: undefined },
];

export function displayNameForUser(user: Doc<"users">) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

function slugifyKey(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `field_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeServiceFields(fields: Array<{
  key?: string;
  label: string;
  type: ServiceFieldType;
  options?: string[];
}>) {
  const seen = new Set<string>();
  return fields
    .map((field) => {
      const label = field.label.trim();
      const baseKey = slugifyKey(field.key?.trim() || label);
      let key = baseKey;
      let suffix = 2;
      while (seen.has(key)) {
        key = `${baseKey}_${suffix}`;
        suffix += 1;
      }
      seen.add(key);
      return {
        key,
        label,
        type: field.type,
        options: field.type === "select"
          ? (field.options ?? []).map((option) => option.trim()).filter(Boolean)
          : undefined,
      };
    })
    .filter((field) => field.label.length > 0);
}

function isCollectedFieldValuePresent(value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function mergeCollectedFields(
  sessionFields: CollectedFields,
  incomingFields?: CollectedFields,
): CollectedFields {
  return {
    ...sessionFields,
    ...(incomingFields ?? {}),
  };
}

export function bookingDisplayName(fields: CollectedFields) {
  if (typeof fields.name === "string" && fields.name.trim()) {
    return fields.name.trim();
  }
  return "Customer";
}

export function missingServiceFields(service: Doc<"appointmentServices">, fields: CollectedFields) {
  const missing: string[] = [];
  for (const field of service.fields) {
    if (!isCollectedFieldValuePresent(fields[field.key])) {
      missing.push(field.label);
    }
  }
  return missing;
}

function formatCollectedFieldValue(value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

export function formatBookingDateTime(startAt: number, endAt: number, timeZone: string) {
  return formatCalendarDateTime(startAt, endAt, timeZone);
}

const CUSTOMER_DETAIL_FIELD_KEYS = new Set(["name", "phone", "email", "date", "time"]);

function formatFieldLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatChannelName(service: string) {
  const labels: Record<string, string> = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    messenger: "Messenger",
    playground: "Playground",
    manual: "Manual",
  };
  return labels[service] ?? formatFieldLabel(service);
}

function appendDetailLine(lines: string[], label: string, value: string | undefined | null) {
  const trimmed = value?.trim();
  if (trimmed) {
    lines.push(`- ${label}: ${trimmed}`);
  }
}

function collectedFieldText(fields: CollectedFields, key: string) {
  return formatCollectedFieldValue(fields[key]);
}

function buildCollectedInterestLines(
  service: Doc<"appointmentServices">,
  fields: CollectedFields,
) {
  const lines: string[] = [];
  const seenKeys = new Set<string>();
  for (const field of service.fields) {
    seenKeys.add(field.key);
    if (CUSTOMER_DETAIL_FIELD_KEYS.has(field.key.toLowerCase())) continue;
    appendDetailLine(lines, field.label, formatCollectedFieldValue(fields[field.key]));
  }
  for (const [key, value] of Object.entries(fields)) {
    if (seenKeys.has(key) || CUSTOMER_DETAIL_FIELD_KEYS.has(key.toLowerCase())) continue;
    appendDetailLine(lines, formatFieldLabel(key), formatCollectedFieldValue(value));
  }
  return lines;
}

function section(title: string, lines: string[]) {
  if (lines.length === 0) return undefined;
  return [title, ...lines].join("\n");
}

export function buildCalendarEventDescription(args: {
  service: Doc<"appointmentServices">;
  customer: Doc<"customers">;
  conversation?: Doc<"conversations">;
  collectedFields: CollectedFields;
}) {
  const interestLines: string[] = [];
  appendDetailLine(interestLines, "Booked interest", args.service.name);
  appendDetailLine(interestLines, "Service description", args.service.description);
  interestLines.push(...buildCollectedInterestLines(args.service, args.collectedFields));

  const customerLines: string[] = [];
  const collectedName = collectedFieldText(args.collectedFields, "name");
  const collectedPhone = collectedFieldText(args.collectedFields, "phone");
  const collectedEmail = collectedFieldText(args.collectedFields, "email");
  appendDetailLine(
    customerLines,
    "Name",
    collectedName || args.customer.name || args.conversation?.contactName,
  );
  appendDetailLine(customerLines, "Phone", collectedPhone || args.customer.phone);
  appendDetailLine(customerLines, "Email", collectedEmail || args.customer.email);
  const shownContacts = new Set(
    [collectedPhone, args.customer.phone, collectedEmail, args.customer.email]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
  const contactAddress = args.customer.contactAddress.trim();
  if (contactAddress && !shownContacts.has(contactAddress.toLowerCase())) {
    appendDetailLine(customerLines, "Contact address", contactAddress);
  }
  if (args.conversation) {
    appendDetailLine(customerLines, "Channel", formatChannelName(args.conversation.service));
  }
  appendDetailLine(customerLines, "Lead temperature", args.customer.leadTemperature);
  appendDetailLine(customerLines, "Tags", args.customer.tags.join(", "));
  appendDetailLine(customerLines, "Customer notes", args.customer.notes);
  for (const [key, value] of Object.entries(args.customer.customFields ?? {})) {
    appendDetailLine(customerLines, formatFieldLabel(key), value);
  }

  return [
    section("Customer interest / details shared", interestLines),
    section("Customer details", customerLines),
  ]
    .filter((value): value is string => value !== undefined)
    .join("\n\n");
}

export function serviceSnapshot(service: Doc<"appointmentServices">) {
  return {
    serviceId: service._id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    fields: service.fields,
    preferredTimeMinutes: service.preferredTimeMinutes,
    salesStyle: service.salesStyle,
    timeZone: service.timeZone?.trim() || DEFAULT_TEAM_TIME_ZONE,
  };
}

export function serviceTimeZone(
  service: Pick<Doc<"appointmentServices">, "timeZone">,
  team?: Pick<Doc<"teams">, "timeZone">,
) {
  return service.timeZone?.trim() || normalizeTimeZone(team?.timeZone);
}

export function serviceBookingLocation(
  service: Pick<Doc<"appointmentServices">, "locationMode" | "location">,
) {
  return service.locationMode === "in_person"
    ? service.location?.trim() || undefined
    : undefined;
}

export function buildBookingConfirmationMessage(args: {
  service: Pick<Doc<"appointmentServices">, "name" | "fields" | "locationMode" | "timeZone">;
  collectedFields: CollectedFields;
  startAt: number;
  endAt: number;
  timeZone?: string;
  assignedTo?: string;
  bookingId: Id<"calendarEvents">;
  meetingLink?: string;
  updated?: boolean;
}) {
  const { date, timeRange } = formatBookingDateTime(
    args.startAt,
    args.endAt,
    args.timeZone ?? args.service.timeZone ?? DEFAULT_TEAM_TIME_ZONE,
  );
  const customerDetailLines = args.service.fields
    .filter((field) => field.key !== "date" && field.key !== "time")
    .map((field) => {
      const value = formatCollectedFieldValue(args.collectedFields[field.key]);
      if (!value) return undefined;
      return `${field.label}: ${value}`;
    })
    .filter((line): line is string => line !== undefined);
  const scheduleLines = [
    `Service: ${args.service.name}`,
    `Date: ${date}`,
    `Time: ${timeRange}`,
  ];
  const assignmentLines = [
    args.assignedTo ? `Team Member: ${args.assignedTo}` : undefined,
    args.service.locationMode === "remote" && args.meetingLink?.trim()
      ? `Meeting link: ${args.meetingLink.trim()}`
      : undefined,
  ].filter((line): line is string => line !== undefined);
  const sections = [
    args.updated ? "Your booking has been updated!" : "Your booking is confirmed!",
    scheduleLines.join("\n"),
    customerDetailLines.length > 0 ? customerDetailLines.join("\n") : undefined,
    assignmentLines.length > 0 ? assignmentLines.join("\n") : undefined,
    `Booking reference: ${args.bookingId}`,
    "Thank you — we look forward to seeing you!",
  ].filter((section): section is string => section !== undefined);

  return sections.join("\n\n");
}
