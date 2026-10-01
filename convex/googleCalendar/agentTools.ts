import { v } from "convex/values";
import { createTool } from "@convex-dev/agent";
import type { ToolSet } from "ai";
import { z } from "zod";
import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import {
  agentCalendarToolFailure,
  requireExplicitConfirmation,
  type AgentCalendarBusyInterval,
  type AgentCalendarToolFailure,
} from "./agentToolGuard";
import { googleCalendarBookingSyncDependencies, runCancelBookingSession } from "./bookingSync";
import { queryActiveBookingSession } from "../chat/bookingToolSession";
import type { BookingToolResult } from "./bookingTypes";
import { batchBookingUpdateSyncDependencies, runBatchBookingUpdate } from "./batchBookingUpdateSync";
import { parseBatchBookingUpdates } from "./batchBookingUpdateInput";
import type { BatchBookingUpdate, BatchBookingUpdateResult } from "./batchBookingUpdateTypes";

export const UPDATE_BOOKINGS_SINGLE_EXAMPLE =
  'updateBookingsDateTime({ bookings: [{ bookingId: "calendar-event-id", startTimeIso: "2026-10-01T16:00:00+08:00" }], confirmed: true })';
export const UPDATE_BOOKINGS_MULTIPLE_EXAMPLE =
  'updateBookingsDateTime({ bookings: [{ bookingId: "october-1-booking-id", startTimeIso: "2026-10-01T16:00:00+08:00" }, { bookingId: "october-5-booking-id", startTimeIso: "2026-10-05T14:00:00+08:00" }], confirmed: true })';
export const CANCEL_BOOKINGS_SINGLE_EXAMPLE =
  'deleteCalendarEvent({ bookingIds: ["calendar-event-id"], confirmed: true })';
export const CANCEL_BOOKINGS_MULTIPLE_EXAMPLE =
  'deleteCalendarEvent({ bookingIds: ["october-14-booking-id", "october-16-booking-id"], confirmed: true })';

type PrepareListResult =
  | { kind: "completed"; result: AgentCalendarBusyInterval[] }
  | { kind: "failed"; result: AgentCalendarToolFailure }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> };

export type GoogleCalendarAgentToolDependencies = {
  prepareList: (args: {
    conversationId: Id<"conversations">;
    rangeStartAt: number;
    rangeEndAt: number;
    refreshed?: boolean;
  }) => Promise<PrepareListResult>;
  refresh: (args: { connectionId: Id<"googleCalendarConnections"> }) => Promise<unknown>;
  updateBookings?: (args: {
    conversationId: Id<"conversations">;
    updates: BatchBookingUpdate[];
  }) => Promise<BatchBookingUpdateResult>;
  cancelBooking?: (args: {
    conversationId: Id<"conversations">;
    bookingId: Id<"calendarEvents">;
  }) => Promise<BookingToolResult>;
};

type StoreMutation<TArgs extends Record<string, unknown>, TResult> =
  FunctionReference<"mutation", "internal", TArgs, TResult>;

type GoogleAgentToolInternal = {
  agentToolList: {
    prepareList: StoreMutation<{
      conversationId: Id<"conversations">;
      rangeStartAt: number;
      rangeEndAt: number;
      refreshed?: boolean;
    }, PrepareListResult>;
  };
  agentTools: {
    listCalendarEvents: FunctionReference<"action", "internal", {
      conversationId: Id<"conversations">;
      rangeStartAt: number;
      rangeEndAt: number;
    }, AgentCalendarBusyInterval[] | AgentCalendarToolFailure>;
    updateBookings: FunctionReference<"action", "internal", {
      conversationId: Id<"conversations">;
      updates: BatchBookingUpdate[];
      confirmed: boolean;
    }, ReturnType<typeof updateBookingsResult> | AgentCalendarToolFailure>;
    deleteCalendarEvent: FunctionReference<"action", "internal", {
      conversationId: Id<"conversations">;
      bookingIds: Id<"calendarEvents">[];
      confirmed: boolean;
    }, Awaited<ReturnType<typeof executeDeleteCalendarEvent>>>;
  };
  syncWorker: {
    run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
  };
};
const googleInternal: GoogleAgentToolInternal = (
  internal as unknown as { googleCalendar: GoogleAgentToolInternal }
).googleCalendar;

function bookingResult(result: BookingToolResult) {
  if (result.success) {
    return { kind: "success" as const, success: true as const, message: result.message };
  }
  return {
    kind: result.kind ?? "failed",
    success: false as const,
    message: result.message,
  };
}

export async function executeListCalendarEvents(
  args: { conversationId: Id<"conversations">; rangeStartAt: number; rangeEndAt: number },
  dependencies: Pick<GoogleCalendarAgentToolDependencies, "prepareList" | "refresh">,
) {
  let prepared = await dependencies.prepareList({ ...args, refreshed: false });
  if (prepared.kind === "needs_refresh") {
    await dependencies.refresh({ connectionId: prepared.connectionId });
    prepared = await dependencies.prepareList({ ...args, refreshed: true });
  }
  if (prepared.kind === "needs_refresh") {
    throw new Error("Google Calendar list still required a refresh after synchronizing");
  }
  if (prepared.kind === "failed") return prepared.result;
  return prepared.result;
}

function updateBookingsResult(result: BatchBookingUpdateResult) {
  return {
    ...bookingResult(result),
    ...(result.bookings === undefined ? {} : { bookings: result.bookings }),
    ...(result.failures === undefined ? {} : { failures: result.failures }),
  };
}

export async function executeUpdateBookings(
  args: {
    conversationId: Id<"conversations">;
    updates: BatchBookingUpdate[];
    confirmed: boolean;
  },
  dependencies: Pick<GoogleCalendarAgentToolDependencies, "updateBookings">,
) {
  const confirmation = requireExplicitConfirmation(args.confirmed);
  if (confirmation !== null) return confirmation;
  if (dependencies.updateBookings === undefined) return agentCalendarToolFailure("invalid_request");
  return updateBookingsResult(await dependencies.updateBookings({
    conversationId: args.conversationId,
    updates: args.updates,
  }));
}

export async function executeDeleteCalendarEvent(
  args: {
    conversationId: Id<"conversations">;
    bookingIds: Id<"calendarEvents">[];
    confirmed: boolean;
  },
  dependencies: Pick<GoogleCalendarAgentToolDependencies, "cancelBooking">,
) {
  const confirmation = requireExplicitConfirmation(args.confirmed);
  if (confirmation !== null) return confirmation;
  const { cancelBooking } = dependencies;
  if (cancelBooking === undefined) return agentCalendarToolFailure("invalid_request");
  if (args.bookingIds.length === 0 || args.bookingIds.length > 10) {
    return agentCalendarToolFailure("invalid_request", "Cancel between one and ten bookings at a time.");
  }
  if (new Set(args.bookingIds).size !== args.bookingIds.length) {
    return agentCalendarToolFailure("invalid_request", "Each booking can be cancelled only once per request.");
  }
  const bookings = [];
  for (const bookingId of args.bookingIds) {
    const result = bookingResult(await cancelBooking({ conversationId: args.conversationId, bookingId }));
    bookings.push({ bookingId, success: result.success, message: result.message });
  }
  const cancelled = bookings.filter((booking) => booking.success).length;
  const success = cancelled === bookings.length;
  return {
    kind: success ? "success" as const : "failed" as const,
    success,
    message: success
      ? `Cancelled ${cancelled} of ${bookings.length} bookings.`
      : `Cancelled ${cancelled} of ${bookings.length} bookings. Report each failed booking to the customer.`,
    bookings,
  };
}

export function googleCalendarAgentToolDependencies(
  ctx: ActionCtx,
): GoogleCalendarAgentToolDependencies {
  const booking = googleCalendarBookingSyncDependencies(ctx);
  return {
    prepareList: (args) => ctx.runMutation(googleInternal.agentToolList.prepareList, args),
    refresh: (args) => ctx.runAction(googleInternal.syncWorker.run, args),
    updateBookings: (args) => runBatchBookingUpdate(args, batchBookingUpdateSyncDependencies(ctx)),
    cancelBooking: (args) => runCancelBookingSession(args, booking),
  };
}

const listArgs = {
  conversationId: v.id("conversations"),
  rangeStartAt: v.number(),
  rangeEndAt: v.number(),
};

export const listCalendarEvents = internalAction({
  args: listArgs,
  handler: async (ctx, args) =>
    executeListCalendarEvents(args, googleCalendarAgentToolDependencies(ctx)),
});

export const updateBookings = internalAction({
  args: {
    conversationId: v.id("conversations"),
    updates: v.array(v.object({ bookingId: v.id("calendarEvents"), startAt: v.number() })),
    confirmed: v.boolean(),
  },
  handler: async (ctx, args) =>
    executeUpdateBookings(args, googleCalendarAgentToolDependencies(ctx)),
});

export const deleteCalendarEvent = internalAction({
  args: {
    conversationId: v.id("conversations"),
    bookingIds: v.array(v.id("calendarEvents")),
    confirmed: v.boolean(),
  },
  handler: async (ctx, args) =>
    executeDeleteCalendarEvent(args, googleCalendarAgentToolDependencies(ctx)),
});

export function registerGoogleCalendarTools(args: {
  tools: ToolSet;
  conversationId: Id<"conversations">;
  eligible: boolean;
  defaultTimeZone: string;
}) {
  if (!args.eligible) return;
  const { tools, conversationId, defaultTimeZone } = args;
  tools.listCalendarEvents = createTool({
    description:
      "Lists busy time ranges on the assigned teammate's calendar for scheduling. Never includes titles, descriptions, attendees, links, or account details.",
    inputSchema: z.object({
      rangeStartIso: z.string().optional().describe("Range start as an ISO timestamp."),
      rangeEndIso: z.string().optional().describe("Range end as an ISO timestamp."),
    }),
    execute: async (ctx, input) => {
      await queryActiveBookingSession(ctx, conversationId);
      const rangeStartAt = input.rangeStartIso ? Date.parse(input.rangeStartIso) : Date.now();
      const rangeEndAt = input.rangeEndIso
        ? Date.parse(input.rangeEndIso)
        : rangeStartAt + 7 * 24 * 60 * 60 * 1000;
      if (!Number.isFinite(rangeStartAt) || !Number.isFinite(rangeEndAt)) {
        return agentCalendarToolFailure("invalid_request", "Invalid calendar range.");
      }
      return await ctx.runAction(googleInternal.agentTools.listCalendarEvents, {
        conversationId,
        rangeStartAt,
        rangeEndAt,
      });
    },
  });
  tools.updateBookingsDateTime = createTool({
    description:
      `You must invoke this tool when the user requests to make changes to the time of a booking. The only tool that changes the date or time of an existing booking. Use it whenever the customer wants to reschedule or move an appointment, including a single booking: pass a one-item bookings array. Handles one to ten bookings in one call and keeps each booking's duration. Every bookingId must come from listCustomerBookings. All changes succeed together or none are made. One booking: ${UPDATE_BOOKINGS_SINGLE_EXAMPLE}. Several bookings: ${UPDATE_BOOKINGS_MULTIPLE_EXAMPLE}.`,
    inputSchema: z.object({
      bookings: z.array(z.object({
        bookingId: z.string().describe("Booking ID returned by listCustomerBookings."),
        startTimeIso: z.string().describe("Confirmed new start time as an ISO timestamp with offset."),
      })).min(1).max(10),
      confirmed: z.boolean().describe("True only when the customer explicitly approved these exact changes."),
    }),
    execute: async (ctx, input) => {
      const parsed = parseBatchBookingUpdates(input.bookings.map((booking) => ({
        bookingId: booking.bookingId as Id<"calendarEvents">,
        startTimeIso: booking.startTimeIso,
      })), defaultTimeZone);
      if (!parsed.success) return agentCalendarToolFailure("invalid_request", parsed.message);
      return await ctx.runAction(googleInternal.agentTools.updateBookings, {
        conversationId,
        updates: parsed.updates,
        confirmed: input.confirmed,
      });
    },
  });
  tools.deleteCalendarEvent = createTool({
    description:
      `You must invoke this tool when the customer asks to cancel an existing booking. The only tool that cancels confirmed bookings, including a single booking: pass a one-item bookingIds array. Handles one to ten bookings in one call, cancels exactly those bookings, and removes them from the connected Google Calendar. Every bookingId must come from listCustomerBookings. Bookings are cancelled in order and the result lists each booking's outcome. One booking: ${CANCEL_BOOKINGS_SINGLE_EXAMPLE}. Several bookings: ${CANCEL_BOOKINGS_MULTIPLE_EXAMPLE}.`,
    inputSchema: z.object({
      bookingIds: z.array(z.string().describe("Booking ID returned by listCustomerBookings.")).min(1).max(10),
      confirmed: z.boolean().describe("True only when the customer explicitly asked to cancel these exact bookings."),
    }),
    execute: async (ctx, input) => {
      await queryActiveBookingSession(ctx, conversationId);
      return await ctx.runAction(googleInternal.agentTools.deleteCalendarEvent, {
        conversationId,
        bookingIds: input.bookingIds.map((bookingId) => bookingId as Id<"calendarEvents">),
        confirmed: input.confirmed,
      });
    },
  });
}
