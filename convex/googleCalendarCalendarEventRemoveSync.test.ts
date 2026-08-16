import { expect, test, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import { runPreparedCalendarEventRemove } from "./googleCalendar/calendarEventSync";

const connectionId = "connection_1" as Id<"googleCalendarConnections">;
const eventId = "event_1" as Id<"calendarEvents">;

test("deleting a Google-synced event removes the local event after Google succeeds", async () => {
  const order: string[] = [];
  const prepare = vi.fn().mockResolvedValue({
    kind: "google" as const,
    connectionId,
    calendarEventId: eventId,
    operationKey: `calendar:${eventId}:delete`,
    action: "delete" as const,
    event: {
      summary: "Customer appointment",
      start: { dateTime: "2026-08-15T09:00:00.000Z", timeZone: "UTC" },
      end: { dateTime: "2026-08-15T10:00:00.000Z", timeZone: "UTC" },
    },
    now: Date.UTC(2026, 7, 15, 8),
  });
  const write = vi.fn().mockImplementation(async () => {
    order.push("google");
    return { kind: "success" as const, externalEventId: "google_event_1" };
  });
  const applyGoogleCancellation = vi.fn().mockImplementation(async () => {
    order.push("booking");
  });
  const applyRemove = vi.fn().mockImplementation(async () => {
    order.push("database");
  });

  await runPreparedCalendarEventRemove({ eventId }, {
    prepare,
    refresh: vi.fn(),
    write,
    applyGoogleCancellation,
    applyRemove,
  });

  expect(applyRemove).toHaveBeenCalledWith({ eventId });
  expect(order).toEqual(["google", "booking", "database"]);
});
