import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { runCreateGoogleCalendarEvent } from "./writeExecution";
import { googleCalendarWriteActionDependencies } from "./writeActions";
import type { GoogleCalendarWriteDependencies } from "./writeTypes";
import type { GoogleCalendarWriteInput } from "./writeTypes";

type StaffPrepareResult =
  | { kind: "completed"; eventId: Id<"calendarEvents">; sessionId: Id<"appointmentBookingSessions"> }
  | { kind: "failed"; message: string }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> }
  | {
      kind: "google";
      connectionId: Id<"googleCalendarConnections">;
      calendarEventId: Id<"calendarEvents">;
      sessionId: Id<"appointmentBookingSessions">;
      operationKey: string;
      event: GoogleCalendarWriteInput;
      now: number;
    };

type StaffIds = { eventId: Id<"calendarEvents">; sessionId: Id<"appointmentBookingSessions"> };

export type GoogleCalendarStaffBookingDependencies = {
  prepare: (refreshed: boolean) => Promise<StaffPrepareResult>;
  rollback: (args: {
    calendarEventId: Id<"calendarEvents">;
    sessionId: Id<"appointmentBookingSessions">;
  }) => Promise<null>;
  finalize: (args: {
    calendarEventId: Id<"calendarEvents">;
    sessionId: Id<"appointmentBookingSessions">;
    recordInboxBooking: boolean;
  }) => Promise<StaffIds>;
  refresh: (args: { connectionId: Id<"googleCalendarConnections"> }) => Promise<unknown>;
  write: GoogleCalendarWriteDependencies;
  recordInboxBooking: boolean;
};

export async function runStaffBooking(
  dependencies: GoogleCalendarStaffBookingDependencies,
): Promise<StaffIds> {
  let prepared = await dependencies.prepare(false);
  if (prepared.kind === "needs_refresh") {
    await dependencies.refresh({ connectionId: prepared.connectionId });
    prepared = await dependencies.prepare(true);
  }
  if (prepared.kind === "failed") throw new Error(prepared.message);
  if (prepared.kind === "completed") return { eventId: prepared.eventId, sessionId: prepared.sessionId };
  if (prepared.kind !== "google") throw new Error("Google Calendar staff booking prepare did not finish");
  const write = await runCreateGoogleCalendarEvent({
    connectionId: prepared.connectionId,
    calendarEventId: prepared.calendarEventId,
    operationKey: prepared.operationKey,
    event: prepared.event,
    now: prepared.now,
  }, dependencies.write);
  if (write.kind !== "success") {
    await dependencies.rollback({
      calendarEventId: prepared.calendarEventId,
      sessionId: prepared.sessionId,
    });
    throw new Error(write.message);
  }
  return await dependencies.finalize({
    calendarEventId: prepared.calendarEventId,
    sessionId: prepared.sessionId,
    recordInboxBooking: dependencies.recordInboxBooking,
  });
}

type StoreMutation<TArgs extends Record<string, unknown>, TResult> =
  FunctionReference<"mutation", "internal", TArgs, TResult>;

const googleInternal = (internal as unknown as {
  googleCalendar: {
    staffBookingPrepare: {
      prepareCalendarStaffBook: StoreMutation<Record<string, unknown>, StaffPrepareResult>;
      prepareInboxStaffBook: StoreMutation<Record<string, unknown>, StaffPrepareResult>;
    };
    staffBookingFinalize: {
      rollbackStaffBook: StoreMutation<{
        calendarEventId: Id<"calendarEvents">;
        sessionId: Id<"appointmentBookingSessions">;
      }, null>;
      finalizeStaffBook: StoreMutation<{
        calendarEventId: Id<"calendarEvents">;
        sessionId: Id<"appointmentBookingSessions">;
        recordInboxBooking: boolean;
      }, StaffIds>;
    };
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    };
  };
}).googleCalendar;

export function googleCalendarStaffBookingDependencies(
  ctx: ActionCtx,
  prepare: (refreshed: boolean) => Promise<StaffPrepareResult>,
  recordInboxBooking: boolean,
): GoogleCalendarStaffBookingDependencies {
  return {
    prepare,
    rollback: (args) => ctx.runMutation(googleInternal.staffBookingFinalize.rollbackStaffBook, args),
    finalize: (args) => ctx.runMutation(googleInternal.staffBookingFinalize.finalizeStaffBook, args),
    refresh: (args) => ctx.runAction(googleInternal.syncWorker.run, args),
    write: googleCalendarWriteActionDependencies(ctx),
    recordInboxBooking,
  };
}

export async function runCalendarStaffBooking(
  ctx: ActionCtx,
  args: {
    agentId: Id<"agents">;
    customerId: Id<"customers">;
    serviceId: Id<"appointmentServices">;
    collectedFields: Record<string, string | number | boolean | null>;
    remarks?: string;
    startAt: number;
    endAt: number;
  },
) {
  return await runStaffBooking(googleCalendarStaffBookingDependencies(
    ctx,
    (refreshed) => ctx.runMutation(googleInternal.staffBookingPrepare.prepareCalendarStaffBook, {
      ...args,
      refreshed,
    }),
    false,
  ));
}

export async function runInboxStaffBooking(
  ctx: ActionCtx,
  args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    collectedFields: Record<string, string | number | boolean | null>;
    remarks?: string;
    startAt: number;
    endAt: number;
  },
) {
  return await runStaffBooking(googleCalendarStaffBookingDependencies(
    ctx,
    (refreshed) => ctx.runMutation(googleInternal.staffBookingPrepare.prepareInboxStaffBook, {
      ...args,
      refreshed,
    }),
    true,
  ));
}
