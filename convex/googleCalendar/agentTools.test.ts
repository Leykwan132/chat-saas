import type { ToolSet } from "ai";
import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  executeUpdateBookings,
  registerGoogleCalendarTools,
  UPDATE_BOOKINGS_MULTIPLE_EXAMPLE,
  UPDATE_BOOKINGS_SINGLE_EXAMPLE,
} from "./agentTools";
import type { BatchBookingUpdate } from "./batchBookingUpdateTypes";

const conversationId = "conversation" as Id<"conversations">;
const bookingIds = ["october-1", "october-5"] as Id<"calendarEvents">[];

function recordingRunner() {
  const calls: BatchBookingUpdate[][] = [];
  return {
    calls,
    updateBookings: async (args: { updates: BatchBookingUpdate[] }) => {
      calls.push(args.updates);
      return { success: true, message: "Bookings updated.", bookings: [] };
    },
  };
}

test.each([1, 2])("a %i-item confirmed request reaches the runner in order", async (count) => {
  const runner = recordingRunner();
  const updates = bookingIds.slice(0, count).map((bookingId, index) => ({ bookingId, startAt: index + 1 }));
  const result = await executeUpdateBookings({ conversationId, updates, confirmed: true }, runner);
  expect(result).toMatchObject({ success: true, bookings: [] });
  expect(runner.calls).toEqual([updates]);
});

test("an unconfirmed request is rejected before the runner", async () => {
  const runner = recordingRunner();
  const result = await executeUpdateBookings({
    conversationId,
    updates: [{ bookingId: bookingIds[0]!, startAt: 1 }],
    confirmed: false,
  }, runner);
  expect(result).toMatchObject({ kind: "invalid_request", success: false });
  expect(runner.calls).toEqual([]);
});

test("updateBookingsDateTime replaces the old update tools and covers a single booking", () => {
  const tools: ToolSet = {};
  registerGoogleCalendarTools({ tools, conversationId, eligible: true, defaultTimeZone: "UTC" });
  expect(tools).not.toHaveProperty("updateCalendarEvent");
  expect(tools).not.toHaveProperty("updateBookings");
  const description = tools.updateBookingsDateTime?.description;
  expect(description).toContain("including a single booking");
  expect(description).toContain(UPDATE_BOOKINGS_SINGLE_EXAMPLE);
  expect(description).toContain(UPDATE_BOOKINGS_MULTIPLE_EXAMPLE);
});
