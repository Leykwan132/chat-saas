import type { Id } from "../_generated/dataModel";
import type { GoogleCalendarWriteInput } from "./writeTypes";

const BASE32HEX_ALPHABET = "0123456789abcdefghijklmnopqrstuv";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

function normalizedEvent(event: GoogleCalendarWriteInput) {
  const attendees = [...(event.attendees ?? [])]
    .map((attendee) => ({
      displayName: attendee.displayName ?? null,
      email: attendee.email.trim().toLowerCase(),
    }))
    .sort((left, right) =>
      left.email.localeCompare(right.email) ||
      String(left.displayName).localeCompare(String(right.displayName)),
    );
  return {
    allDay: event.start.date !== undefined,
    attendees,
    description: event.description ?? null,
    end: {
      date: event.end.date ?? null,
      dateTime: event.end.dateTime ?? null,
      timeZone: event.end.timeZone ?? null,
    },
    location: event.location ?? null,
    start: {
      date: event.start.date ?? null,
      dateTime: event.start.dateTime ?? null,
      timeZone: event.start.timeZone ?? null,
    },
    timeZone: event.start.timeZone ?? event.end.timeZone ?? null,
    title: event.summary,
    transparency: event.transparency ?? "opaque",
  };
}

async function sha256Hex(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  ));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function fingerprintGoogleCalendarWritePayload(args: {
  action: "create" | "update" | "delete";
  connectionId: Id<"googleCalendarConnections">;
  calendarEventId: Id<"calendarEvents">;
  externalEventId: string;
  payloadPreconditionEtag: string | null;
  event?: GoogleCalendarWriteInput;
}) {
  const payload = stableValue({
    action: args.action,
    event: args.event === undefined ? null : normalizedEvent(args.event),
    precondition: { etag: args.payloadPreconditionEtag },
    target: {
      calendarEventId: args.calendarEventId,
      calendarId: "primary",
      connectionId: args.connectionId,
      externalEventId: args.externalEventId,
    },
  });
  return await sha256Hex(JSON.stringify(payload));
}

export async function deriveGoogleCalendarEventId(operationKey: string) {
  if (operationKey.trim().length === 0) {
    throw new Error("Google Calendar operation key is required");
  }
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(operationKey),
  ));
  let bits = 0;
  let buffer = 0;
  let encoded = "";
  for (const byte of digest) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += BASE32HEX_ALPHABET[(buffer >> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) encoded += BASE32HEX_ALPHABET[(buffer << (5 - bits)) & 31];
  return encoded;
}
