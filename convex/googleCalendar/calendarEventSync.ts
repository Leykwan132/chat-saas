import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { runDeleteGoogleCalendarEvent } from "./writeExecution";
import { runUpdateGoogleCalendarEvent } from "./writeUpdateExecution";
import { googleCalendarWriteActionDependencies } from "./writeActions";
import type { GoogleCalendarWriteInput } from "./writeTypes";

type CalendarEventPrepareResult =
  | { kind: "local" }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> }
  | {
      kind: "google";
      connectionId: Id<"googleCalendarConnections">;
      calendarEventId: Id<"calendarEvents">;
      operationKey: string;
      action: "update" | "delete";
      event: GoogleCalendarWriteInput;
      now: number;
    };

type StoreMutation<TArgs extends Record<string, unknown>, TResult> =
  FunctionReference<"mutation", "internal", TArgs, TResult>;

const googleInternal = (internal as unknown as {
  googleCalendar: {
    calendarEventPrepare: {
      prepareUpdate: StoreMutation<Record<string, unknown>, CalendarEventPrepareResult>;
      prepareRemove: StoreMutation<Record<string, unknown>, CalendarEventPrepareResult>;
      applyGoogleCancellation: StoreMutation<{ eventId: Id<"calendarEvents"> }, null>;
    };
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    };
  };
  calendarEventsMutate: {
    applyUpdate: StoreMutation<Record<string, unknown>, null>;
    applyRemove: StoreMutation<{ eventId: Id<"calendarEvents"> }, null>;
  };
});

async function writePrepared(
  ctx: ActionCtx,
  prepared: Extract<CalendarEventPrepareResult, { kind: "google" }>,
) {
  const write = prepared.action === "delete"
    ? await runDeleteGoogleCalendarEvent({
        connectionId: prepared.connectionId,
        calendarEventId: prepared.calendarEventId,
        operationKey: prepared.operationKey,
        now: prepared.now,
      }, googleCalendarWriteActionDependencies(ctx))
    : await runUpdateGoogleCalendarEvent({
        connectionId: prepared.connectionId,
        calendarEventId: prepared.calendarEventId,
        operationKey: prepared.operationKey,
        event: prepared.event,
        now: prepared.now,
      }, googleCalendarWriteActionDependencies(ctx));
  if (write.kind !== "success") throw new Error(write.message);
}

export async function runCalendarEventUpdate(
  ctx: ActionCtx,
  args: Record<string, unknown>,
) {
  let prepared = await ctx.runMutation(googleInternal.googleCalendar.calendarEventPrepare.prepareUpdate, {
    ...args,
    refreshed: false,
  });
  if (prepared.kind === "needs_refresh") {
    await ctx.runAction(googleInternal.googleCalendar.syncWorker.run, { connectionId: prepared.connectionId });
    prepared = await ctx.runMutation(googleInternal.googleCalendar.calendarEventPrepare.prepareUpdate, {
      ...args,
      refreshed: true,
    });
  }
  if (prepared.kind === "google") {
    await writePrepared(ctx, prepared);
    if (prepared.action === "delete") {
      await ctx.runMutation(googleInternal.googleCalendar.calendarEventPrepare.applyGoogleCancellation, {
        eventId: prepared.calendarEventId,
      });
      return null;
    }
  }
  return await ctx.runMutation(googleInternal.calendarEventsMutate.applyUpdate, args);
}

export async function runCalendarEventRemove(
  ctx: ActionCtx,
  args: { eventId: Id<"calendarEvents"> },
) {
  let prepared = await ctx.runMutation(googleInternal.googleCalendar.calendarEventPrepare.prepareRemove, {
    ...args,
    refreshed: false,
  });
  if (prepared.kind === "needs_refresh") {
    await ctx.runAction(googleInternal.googleCalendar.syncWorker.run, { connectionId: prepared.connectionId });
    prepared = await ctx.runMutation(googleInternal.googleCalendar.calendarEventPrepare.prepareRemove, {
      ...args,
      refreshed: true,
    });
  }
  if (prepared.kind === "google") {
    await writePrepared(ctx, prepared);
    await ctx.runMutation(googleInternal.googleCalendar.calendarEventPrepare.applyGoogleCancellation, {
      eventId: prepared.calendarEventId,
    });
    return null;
  }
  return await ctx.runMutation(googleInternal.calendarEventsMutate.applyRemove, args);
}
