import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { bookingFailureFromGoogle } from "./bookingGate";
import type { BookingToolResult, PrepareBookResult } from "./bookingTypes";
import { runCreateGoogleCalendarEvent, runDeleteGoogleCalendarEvent } from "./writeExecution";
import { runUpdateGoogleCalendarEvent } from "./writeUpdateExecution";
import { googleCalendarWriteActionDependencies } from "./writeActions";
import type { GoogleCalendarWriteDependencies } from "./writeTypes";

type StoreMutation<TArgs extends Record<string, unknown>, TResult> =
  FunctionReference<"mutation", "internal", TArgs, TResult>;

const googleInternal = (internal as unknown as {
  googleCalendar: {
    bookingPrepare: {
      prepareBook: StoreMutation<{
        conversationId: Id<"conversations">;
        serviceId: Id<"appointmentServices">;
        startAt: number;
        refreshed?: boolean;
      }, PrepareBookResult>;
    };
    bookingFinalize: {
      rollbackBook: StoreMutation<{
        calendarEventId: Id<"calendarEvents">;
        conversationId: Id<"conversations">;
      }, null>;
      finalizeBook: StoreMutation<{
        calendarEventId: Id<"calendarEvents">;
        conversationId: Id<"conversations">;
      }, PrepareBookResult>;
    };
    bookingUpdatePrepare: {
      prepareUpdate: StoreMutation<{
        conversationId: Id<"conversations">;
        serviceId: Id<"appointmentServices">;
        startAt: number;
        refreshed?: boolean;
      }, PrepareBookResult>;
      finalizeUpdate: StoreMutation<{
        conversationId: Id<"conversations">;
        serviceId: Id<"appointmentServices">;
        startAt: number;
      }, BookingToolResult>;
    };
    bookingCancelPrepare: {
      prepareCancel: StoreMutation<{
        conversationId: Id<"conversations">;
        refreshed?: boolean;
      }, PrepareBookResult>;
      finalizeCancel: StoreMutation<{
        conversationId: Id<"conversations">;
        calendarEventId: Id<"calendarEvents">;
      }, BookingToolResult>;
    };
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    };
  };
}).googleCalendar;

export type GoogleCalendarBookingSyncDependencies = {
  prepareBook: (args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    startAt: number;
    refreshed?: boolean;
  }) => Promise<PrepareBookResult>;
  rollbackBook: (args: {
    calendarEventId: Id<"calendarEvents">;
    conversationId: Id<"conversations">;
  }) => Promise<null>;
  finalizeBook: (args: {
    calendarEventId: Id<"calendarEvents">;
    conversationId: Id<"conversations">;
  }) => Promise<PrepareBookResult>;
  prepareUpdate: (args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    startAt: number;
    refreshed?: boolean;
  }) => Promise<PrepareBookResult>;
  finalizeUpdate: (args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    startAt: number;
  }) => Promise<BookingToolResult>;
  prepareCancel: (args: {
    conversationId: Id<"conversations">;
    refreshed?: boolean;
  }) => Promise<PrepareBookResult>;
  finalizeCancel: (args: {
    conversationId: Id<"conversations">;
    calendarEventId: Id<"calendarEvents">;
  }) => Promise<BookingToolResult>;
  refresh: (args: { connectionId: Id<"googleCalendarConnections"> }) => Promise<unknown>;
  write: GoogleCalendarWriteDependencies;
};

function resultFromPrepared(prepared: PrepareBookResult): BookingToolResult {
  if (prepared.kind === "completed" || prepared.kind === "failed") return prepared.result;
  throw new Error("Google Calendar booking prepare did not finish");
}

export async function runBookAppointment(
  args: { conversationId: Id<"conversations">; serviceId: Id<"appointmentServices">; startAt: number },
  dependencies: Pick<GoogleCalendarBookingSyncDependencies, "prepareBook" | "rollbackBook" | "finalizeBook" | "refresh" | "write">,
): Promise<BookingToolResult> {
  let prepared = await dependencies.prepareBook({ ...args, refreshed: false });
  if (prepared.kind === "needs_refresh") {
    await dependencies.refresh({ connectionId: prepared.connectionId });
    prepared = await dependencies.prepareBook({ ...args, refreshed: true });
  }
  if (prepared.kind !== "google") return resultFromPrepared(prepared);
  const write = await runCreateGoogleCalendarEvent({
    connectionId: prepared.connectionId,
    calendarEventId: prepared.calendarEventId,
    operationKey: prepared.operationKey,
    event: prepared.event,
    now: prepared.now,
  }, dependencies.write);
  if (write.kind !== "success") {
    await dependencies.rollbackBook({
      calendarEventId: prepared.calendarEventId,
      conversationId: args.conversationId,
    });
    return bookingFailureFromGoogle(write);
  }
  return resultFromPrepared(await dependencies.finalizeBook({
    calendarEventId: prepared.calendarEventId,
    conversationId: args.conversationId,
  }));
}

export async function runUpdateBookingAppointment(
  args: { conversationId: Id<"conversations">; serviceId: Id<"appointmentServices">; startAt: number },
  dependencies: Pick<GoogleCalendarBookingSyncDependencies, "prepareUpdate" | "finalizeUpdate" | "refresh" | "write">,
): Promise<BookingToolResult> {
  let prepared = await dependencies.prepareUpdate({ ...args, refreshed: false });
  if (prepared.kind === "needs_refresh") {
    await dependencies.refresh({ connectionId: prepared.connectionId });
    prepared = await dependencies.prepareUpdate({ ...args, refreshed: true });
  }
  if (prepared.kind !== "google") return resultFromPrepared(prepared);
  const write = await runUpdateGoogleCalendarEvent({
    connectionId: prepared.connectionId,
    calendarEventId: prepared.calendarEventId,
    operationKey: prepared.operationKey,
    event: prepared.event,
    now: prepared.now,
  }, dependencies.write);
  if (write.kind !== "success") return bookingFailureFromGoogle(write);
  return await dependencies.finalizeUpdate(args);
}

export async function runCancelBookingSession(
  args: { conversationId: Id<"conversations"> },
  dependencies: Pick<GoogleCalendarBookingSyncDependencies, "prepareCancel" | "finalizeCancel" | "refresh" | "write">,
): Promise<BookingToolResult> {
  let prepared = await dependencies.prepareCancel({ ...args, refreshed: false });
  if (prepared.kind === "needs_refresh") {
    await dependencies.refresh({ connectionId: prepared.connectionId });
    prepared = await dependencies.prepareCancel({ ...args, refreshed: true });
  }
  if (prepared.kind !== "google") return resultFromPrepared(prepared);
  const write = await runDeleteGoogleCalendarEvent({
    connectionId: prepared.connectionId,
    calendarEventId: prepared.calendarEventId,
    operationKey: prepared.operationKey,
    now: prepared.now,
  }, dependencies.write);
  if (write.kind !== "success") return bookingFailureFromGoogle(write);
  return await dependencies.finalizeCancel({
    conversationId: args.conversationId,
    calendarEventId: prepared.calendarEventId,
  });
}

export function googleCalendarBookingSyncDependencies(
  ctx: ActionCtx,
): GoogleCalendarBookingSyncDependencies {
  return {
    prepareBook: (args) => ctx.runMutation(googleInternal.bookingPrepare.prepareBook, args),
    rollbackBook: (args) => ctx.runMutation(googleInternal.bookingFinalize.rollbackBook, args),
    finalizeBook: (args) => ctx.runMutation(googleInternal.bookingFinalize.finalizeBook, args),
    prepareUpdate: (args) => ctx.runMutation(googleInternal.bookingUpdatePrepare.prepareUpdate, args),
    finalizeUpdate: (args) => ctx.runMutation(googleInternal.bookingUpdatePrepare.finalizeUpdate, args),
    prepareCancel: (args) => ctx.runMutation(googleInternal.bookingCancelPrepare.prepareCancel, args),
    finalizeCancel: (args) => ctx.runMutation(googleInternal.bookingCancelPrepare.finalizeCancel, args),
    refresh: (args) => ctx.runAction(googleInternal.syncWorker.run, args),
    write: googleCalendarWriteActionDependencies(ctx),
  };
}
