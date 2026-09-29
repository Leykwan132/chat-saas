import { expect, test, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import {
  runBookAppointments,
  type BatchBookingSyncDependencies,
} from "./googleCalendar/batchBookingSync";
import type { PrepareBatchBookResult } from "./googleCalendar/batchBookingTypes";

const conversationId = "conversation" as Id<"conversations">;
const serviceId = "service" as Id<"appointmentServices">;
const batchId = "batch" as Id<"appointmentBookingBatches">;
const connectionId = "connection" as Id<"googleCalendarConnections">;
const startAts = [1, 2, 3, 4, 5].map((day) => Date.UTC(2028, 0, day, 14));

function prepared(): PrepareBatchBookResult {
  return {
    kind: "prepared",
    batchId,
    writes: startAts.map((startAt, index) => ({
      kind: "google" as const,
      connectionId,
      calendarEventId: `event-${index}` as Id<"calendarEvents">,
      sessionId: `session-${index}` as Id<"appointmentBookingSessions">,
      operationKey: `batch:${index}:create`,
      event: {
        summary: "Consultation",
        start: { dateTime: new Date(startAt).toISOString(), timeZone: "UTC" },
        end: { dateTime: new Date(startAt + 1_800_000).toISOString(), timeZone: "UTC" },
      },
      now: startAt,
    })),
  };
}

function dependencies(options?: {
  prepare?: PrepareBatchBookResult;
  failCreateAt?: number;
  failDelete?: boolean;
}) {
  const calls: string[] = [];
  const deps: BatchBookingSyncDependencies = {
    prepare: vi.fn(async () => options?.prepare ?? prepared()),
    refresh: vi.fn(async () => undefined),
    create: vi.fn(async (write) => {
      const index = Number(write.calendarEventId.split("-")[1]);
      calls.push(`create:${index}`);
      return index === options?.failCreateAt
        ? { kind: "retryable" as const, message: "Google Calendar is temporarily unavailable." }
        : { kind: "success" as const, externalEventId: `google-${index}` };
    }),
    remove: vi.fn(async (write) => {
      const index = Number(write.calendarEventId.split("-")[1]);
      calls.push(`delete:${index}`);
      return options?.failDelete
        ? { kind: "retryable" as const, message: "Google Calendar is temporarily unavailable." }
        : { kind: "success" as const, externalEventId: `google-${index}` };
    }),
    finalize: vi.fn(async () => ({
      success: true,
      batchId,
      bookings: startAts.map((startAt, index) => ({
        bookingId: `event-${index}` as Id<"calendarEvents">,
        sessionId: `session-${index}` as Id<"appointmentBookingSessions">,
        startAt,
        endAt: startAt + 1_800_000,
        assignedTo: "Owner",
      })),
      message: "Bookings created.",
    })),
    rollback: vi.fn(async () => null),
    markCompensationFailed: vi.fn(async () => null),
  };
  return { deps, calls };
}

test("creates all five Google events before finalizing the batch", async () => {
  const { deps, calls } = dependencies();
  const result = await runBookAppointments({ conversationId, serviceId, startAts }, deps);
  expect(result).toMatchObject({ success: true });
  expect(calls).toEqual(["create:0", "create:1", "create:2", "create:3", "create:4"]);
  expect(deps.finalize).toHaveBeenCalledWith({ batchId });
  expect(deps.rollback).not.toHaveBeenCalled();
});

test("deletes successful remote creates and rolls back locally after a later create fails", async () => {
  const { deps, calls } = dependencies({ failCreateAt: 2 });
  const result = await runBookAppointments({ conversationId, serviceId, startAts }, deps);
  expect(result).toMatchObject({ success: false, kind: "retryable" });
  expect(calls).toEqual(["create:0", "create:1", "create:2", "delete:1", "delete:0"]);
  expect(deps.rollback).toHaveBeenCalledWith({ batchId });
  expect(deps.finalize).not.toHaveBeenCalled();
});

test("returns authorization failure before any local or remote preparation", async () => {
  const failure: PrepareBatchBookResult = {
    kind: "failed",
    result: {
      success: false,
      kind: "needs_reauthorization",
      message: "Google Calendar needs to be reconnected.",
    },
  };
  const { deps } = dependencies({ prepare: failure });
  const result = await runBookAppointments({ conversationId, serviceId, startAts }, deps);
  expect(result).toEqual(failure.result);
  expect(deps.create).not.toHaveBeenCalled();
  expect(deps.finalize).not.toHaveBeenCalled();
});

test("marks the batch failed when remote compensation cannot be completed", async () => {
  const { deps } = dependencies({ failCreateAt: 2, failDelete: true });
  const result = await runBookAppointments({ conversationId, serviceId, startAts }, deps);
  expect(result).toMatchObject({ success: false, kind: "failed" });
  expect(deps.markCompensationFailed).toHaveBeenCalledWith({
    batchId,
    failedCalendarEventIds: ["event-1", "event-0"],
    failureMessage: "Google Calendar compensation failed.",
  });
  expect(deps.rollback).not.toHaveBeenCalled();
});
