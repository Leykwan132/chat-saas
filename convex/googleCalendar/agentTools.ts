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
import {
  googleCalendarBookingSyncDependencies,
  runCancelBookingSession,
  runUpdateBookingAppointment,
} from "./bookingSync";
import type { BookingToolResult } from "./bookingTypes";

type PrepareListResult =
  | { kind: "completed"; result: AgentCalendarBusyInterval[] }
  | { kind: "failed"; result: AgentCalendarToolFailure }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> };

type GuardEventResult =
  | { kind: "ok"; serviceId?: Id<"appointmentServices">; startAt: number }
  | AgentCalendarToolFailure;

export type GoogleCalendarAgentToolDependencies = {
  prepareList: (args: {
    conversationId: Id<"conversations">;
    rangeStartAt: number;
    rangeEndAt: number;
    refreshed?: boolean;
  }) => Promise<PrepareListResult>;
  guardEvent: (args: {
    conversationId: Id<"conversations">;
    eventId: Id<"calendarEvents">;
  }) => Promise<GuardEventResult>;
  refresh: (args: { connectionId: Id<"googleCalendarConnections"> }) => Promise<unknown>;
  updateBooking?: (args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    startAt: number;
  }) => Promise<BookingToolResult>;
  cancelBooking?: (args: { conversationId: Id<"conversations"> }) => Promise<BookingToolResult>;
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
  agentToolMutate: {
    guardEvent: StoreMutation<{
      conversationId: Id<"conversations">;
      eventId: Id<"calendarEvents">;
    }, GuardEventResult>;
  };
  agentTools: {
    listCalendarEvents: FunctionReference<"action", "internal", {
      conversationId: Id<"conversations">;
      rangeStartAt: number;
      rangeEndAt: number;
    }, AgentCalendarBusyInterval[] | AgentCalendarToolFailure>;
    updateCalendarEvent: FunctionReference<"action", "internal", {
      conversationId: Id<"conversations">;
      eventId: Id<"calendarEvents">;
      startAt?: number;
      confirmed: boolean;
    }, { kind: string; success: boolean; message: string }>;
    deleteCalendarEvent: FunctionReference<"action", "internal", {
      conversationId: Id<"conversations">;
      eventId: Id<"calendarEvents">;
      confirmed: boolean;
    }, { kind: string; success: boolean; message: string }>;
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

export async function executeUpdateCalendarEvent(
  args: {
    conversationId: Id<"conversations">;
    eventId: Id<"calendarEvents">;
    startAt?: number;
    confirmed: boolean;
  },
  dependencies: GoogleCalendarAgentToolDependencies,
) {
  const confirmation = requireExplicitConfirmation(args.confirmed);
  if (confirmation !== null) return confirmation;
  const guard = await dependencies.guardEvent({
    conversationId: args.conversationId,
    eventId: args.eventId,
  });
  if (guard.kind !== "ok") return guard;
  if (guard.serviceId === undefined || dependencies.updateBooking === undefined) {
    return agentCalendarToolFailure("invalid_request");
  }
  return bookingResult(await dependencies.updateBooking({
    conversationId: args.conversationId,
    serviceId: guard.serviceId,
    startAt: args.startAt ?? guard.startAt,
  }));
}

export async function executeDeleteCalendarEvent(
  args: {
    conversationId: Id<"conversations">;
    eventId: Id<"calendarEvents">;
    confirmed: boolean;
  },
  dependencies: GoogleCalendarAgentToolDependencies,
) {
  const confirmation = requireExplicitConfirmation(args.confirmed);
  if (confirmation !== null) return confirmation;
  const guard = await dependencies.guardEvent({
    conversationId: args.conversationId,
    eventId: args.eventId,
  });
  if (guard.kind !== "ok") return guard;
  if (dependencies.cancelBooking === undefined) {
    return agentCalendarToolFailure("invalid_request");
  }
  return bookingResult(await dependencies.cancelBooking({ conversationId: args.conversationId }));
}

export function googleCalendarAgentToolDependencies(
  ctx: ActionCtx,
): GoogleCalendarAgentToolDependencies {
  const booking = googleCalendarBookingSyncDependencies(ctx);
  return {
    prepareList: (args) => ctx.runMutation(googleInternal.agentToolList.prepareList, args),
    guardEvent: (args) => ctx.runMutation(googleInternal.agentToolMutate.guardEvent, args),
    refresh: (args) => ctx.runAction(googleInternal.syncWorker.run, args),
    updateBooking: (args) => runUpdateBookingAppointment(args, booking),
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

export const updateCalendarEvent = internalAction({
  args: {
    conversationId: v.id("conversations"),
    eventId: v.id("calendarEvents"),
    startAt: v.optional(v.number()),
    confirmed: v.boolean(),
  },
  handler: async (ctx, args) =>
    executeUpdateCalendarEvent(args, googleCalendarAgentToolDependencies(ctx)),
});

export const deleteCalendarEvent = internalAction({
  args: {
    conversationId: v.id("conversations"),
    eventId: v.id("calendarEvents"),
    confirmed: v.boolean(),
  },
  handler: async (ctx, args) =>
    executeDeleteCalendarEvent(args, googleCalendarAgentToolDependencies(ctx)),
});

export function registerGoogleCalendarTools(args: {
  tools: ToolSet;
  conversationId: Id<"conversations">;
  eligible: boolean;
}) {
  if (!args.eligible) return;
  const { tools, conversationId } = args;
  tools.listCalendarEvents = createTool({
    description:
      "Lists busy time ranges on the assigned teammate's calendar for scheduling. Never includes titles, descriptions, attendees, links, or account details.",
    inputSchema: z.object({
      rangeStartIso: z.string().optional().describe("Range start as an ISO timestamp."),
      rangeEndIso: z.string().optional().describe("Range end as an ISO timestamp."),
    }),
    execute: async (ctx, input) => {
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
  tools.updateCalendarEvent = createTool({
    description:
      "Updates the Kilobot booking for this conversation after the customer explicitly confirms the final changes. Cannot change Google-only or other-conversation events.",
    inputSchema: z.object({
      eventId: z.string().describe("The calendar event ID from getCurrentBooking."),
      startTimeIso: z.string().optional().describe("Confirmed new start time as an ISO timestamp."),
      confirmed: z.boolean().describe("True only when the customer explicitly confirmed this change in the current request."),
    }),
    execute: async (ctx, input) => {
      const startAt = input.startTimeIso ? Date.parse(input.startTimeIso) : Number.NaN;
      return await ctx.runAction(googleInternal.agentTools.updateCalendarEvent, {
        conversationId,
        eventId: input.eventId as Id<"calendarEvents">,
        ...(Number.isFinite(startAt) ? { startAt } : {}),
        confirmed: input.confirmed,
      });
    },
  });
  tools.deleteCalendarEvent = createTool({
    description:
      "Cancels the Kilobot booking for this conversation after the customer explicitly asks to cancel. Cannot delete Google-only or other-conversation events.",
    inputSchema: z.object({
      eventId: z.string().describe("The calendar event ID from getCurrentBooking."),
      confirmed: z.boolean().describe("True only when the customer explicitly asked to cancel in the current request."),
    }),
    execute: async (ctx, input) => {
      return await ctx.runAction(googleInternal.agentTools.deleteCalendarEvent, {
        conversationId,
        eventId: input.eventId as Id<"calendarEvents">,
        confirmed: input.confirmed,
      });
    },
  });
}
