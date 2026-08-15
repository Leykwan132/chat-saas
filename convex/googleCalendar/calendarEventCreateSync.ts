import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import type { CalendarEventCreateInput } from "../calendarEventsHelpers";
import { runCreateGoogleCalendarEvent } from "./writeExecution";
import { googleCalendarWriteActionDependencies } from "./writeActions";
import type { GoogleCalendarOperationResult } from "./contracts";
import type { CalendarEventCreatePreparation } from "./calendarEventCreatePrepare";
import type { GoogleCalendarWriteDependencies } from "./writeTypes";

type StoreMutation<TArgs extends Record<string, unknown>, TResult> =
  FunctionReference<"mutation", "internal", TArgs, TResult>;

type GoogleCalendarCreateApi = {
  calendarEventCreatePrepare: {
    prepareCreate: StoreMutation<Record<string, unknown>, CalendarEventCreatePreparation>;
    rollbackCreate: StoreMutation<{ eventId: Id<"calendarEvents"> }, null>;
  };
  syncWorker: {
    run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
  };
};

const googleInternal: GoogleCalendarCreateApi = (
  internal as unknown as { googleCalendar: GoogleCalendarCreateApi }
).googleCalendar;

export type CalendarEventCreateDependencies = {
  prepare: (args: CalendarEventCreateInput & { refreshed: boolean }) => Promise<CalendarEventCreatePreparation>;
  refresh: (args: { connectionId: Id<"googleCalendarConnections"> }) => Promise<unknown>;
  write: (args: Extract<CalendarEventCreatePreparation, { kind: "google" }>) => Promise<GoogleCalendarOperationResult>;
  rollback: (args: { eventId: Id<"calendarEvents"> }) => Promise<null>;
};

export async function runPreparedCalendarEventCreate(
  args: CalendarEventCreateInput,
  dependencies: CalendarEventCreateDependencies,
): Promise<Id<"calendarEvents">> {
  let prepared = await dependencies.prepare({ ...args, refreshed: false });
  if (prepared.kind === "needs_refresh") {
    await dependencies.refresh({ connectionId: prepared.connectionId });
    prepared = await dependencies.prepare({ ...args, refreshed: true });
  }
  if (prepared.kind === "local") return prepared.eventId;
  if (prepared.kind !== "google") throw new Error("Google Calendar event creation did not finish");
  const result = await dependencies.write(prepared);
  if (result.kind !== "success") {
    await dependencies.rollback({ eventId: prepared.calendarEventId });
    throw new Error(result.message);
  }
  return prepared.calendarEventId;
}

export async function runCalendarEventCreate(
  ctx: ActionCtx,
  args: CalendarEventCreateInput,
): Promise<Id<"calendarEvents">> {
  return await runPreparedCalendarEventCreate(args, {
    prepare: (input): Promise<CalendarEventCreatePreparation> => ctx.runMutation(
      googleInternal.calendarEventCreatePrepare.prepareCreate,
      input,
    ),
    refresh: (input) => ctx.runAction(googleInternal.syncWorker.run, input),
    write: async (prepared) => await runCreateGoogleCalendarEvent({
      connectionId: prepared.connectionId,
      calendarEventId: prepared.calendarEventId,
      operationKey: prepared.operationKey,
      event: prepared.event,
      now: prepared.now,
    }, googleCalendarWriteActionDependencies(ctx)),
    rollback: (input) => ctx.runMutation(googleInternal.calendarEventCreatePrepare.rollbackCreate, input),
  });
}
