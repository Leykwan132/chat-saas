import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { googleCalendarOperationError, type GoogleCalendarOperationResult } from "./contracts";
import { runBatchBookingUpdate, type BatchBookingUpdateSyncDependencies } from "./batchBookingUpdateSync";
import type { PreparedBatchUpdateWrite } from "./batchBookingUpdateTypes";

const batchId = "batch" as Id<"appointmentBookingUpdateBatches">;
const eventIds = ["event-a", "event-b"] as Id<"calendarEvents">[];
const writes: PreparedBatchUpdateWrite[] = eventIds.map((calendarEventId, index) => ({
  calendarEventId,
  connectionId: "connection" as Id<"googleCalendarConnections">,
  event: { summary: `new ${index}`, start: { dateTime: "2028-01-04T10:00:00Z" }, end: { dateTime: "2028-01-04T10:30:00Z" } },
  original: { summary: `old ${index}`, start: { dateTime: "2028-01-03T10:00:00Z" }, end: { dateTime: "2028-01-03T10:30:00Z" } },
  now: 1,
}));
const success: GoogleCalendarOperationResult = { kind: "success", externalEventId: "google" };

function harness(options: {
  updateResults: GoogleCalendarOperationResult[];
  restoreResult?: GoogleCalendarOperationResult;
}) {
  const calls: string[] = [];
  let refreshed = false;
  const dependencies: BatchBookingUpdateSyncDependencies = {
    prepare: async (args) => {
      calls.push(`prepare:${args.refreshed}`);
      return args.refreshed
        ? { kind: "prepared", batchId, writes }
        : { kind: "needs_refresh", connectionIds: [writes[0]!.connectionId] };
    },
    refresh: async () => {
      refreshed = true;
      calls.push("refresh");
      return null;
    },
    update: async (_batch, write) => {
      calls.push(`update:${write.calendarEventId}`);
      return options.updateResults.shift()!;
    },
    restore: async (_batch, write) => {
      calls.push(`restore:${write.calendarEventId}:${write.original.summary}`);
      return options.restoreResult ?? success;
    },
    finalize: async () => {
      calls.push("finalize");
      return { success: true, message: "updated" };
    },
    markRestored: async () => {
      calls.push("markRestored");
      return null;
    },
    markFailed: async (args) => {
      calls.push(`markFailed:${args.failedCalendarEventIds.join(",")}`);
      return null;
    },
  };
  const run = () => runBatchBookingUpdate({
    conversationId: "conversation" as Id<"conversations">,
    updates: eventIds.map((bookingId) => ({ bookingId, startAt: 1 })),
  }, dependencies);
  return { calls, run, refreshed: () => refreshed };
}

test("writes every Google update in request order, then finalizes", async () => {
  const { calls, run, refreshed } = harness({ updateResults: [success, success] });
  expect(await run()).toEqual({ success: true, message: "updated" });
  expect(refreshed()).toBe(true);
  expect(calls).toEqual([
    "prepare:false", "refresh", "prepare:true", "update:event-a", "update:event-b", "finalize",
  ]);
});

test("a failed second write restores the first and never finalizes", async () => {
  const { calls, run } = harness({ updateResults: [success, googleCalendarOperationError("conflict")] });
  expect(await run()).toMatchObject({ success: false });
  expect(calls.slice(3)).toEqual(["update:event-a", "update:event-b", "restore:event-a:old 0", "markRestored"]);
});

test("a failed restore is recorded for manual recovery", async () => {
  const { calls, run } = harness({
    updateResults: [success, googleCalendarOperationError("retryable")],
    restoreResult: googleCalendarOperationError("retryable"),
  });
  expect(await run()).toMatchObject({ success: false, message: expect.stringContaining("Manual recovery") });
  expect(calls.at(-1)).toBe("markFailed:event-a");
  expect(calls).not.toContain("finalize");
});
