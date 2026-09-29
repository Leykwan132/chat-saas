import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { bookingFailureFromGoogle } from "./bookingGate";
import type { GoogleCalendarOperationResult } from "./contracts";
import { runCreateGoogleCalendarEvent, runDeleteGoogleCalendarEvent } from "./writeExecution";
import { googleCalendarWriteActionDependencies } from "./writeActions";
import { googleCalendarEventOperationKey } from "./bookingPayload";
import type {
  BatchBookingResult,
  PrepareBatchBookResult,
  PreparedBatchWrite,
} from "./batchBookingTypes";

type MutationRef<TArgs, TResult> = FunctionReference<
  "mutation",
  "internal",
  TArgs & Record<string, unknown>,
  TResult
>;

const batchInternal = (internal as unknown as {
  googleCalendar: {
    batchBookingPrepare: {
      prepareBatchBook: MutationRef<{
        conversationId: Id<"conversations">;
        serviceId: Id<"appointmentServices">;
        startAts: number[];
        refreshed: boolean;
      }, PrepareBatchBookResult>;
    };
    batchBookingFinalize: {
      finalizeBatchBook: MutationRef<{ batchId: Id<"appointmentBookingBatches"> }, BatchBookingResult>;
      rollbackBatchBook: MutationRef<{ batchId: Id<"appointmentBookingBatches"> }, null>;
      markBatchCompensationFailed: MutationRef<{
        batchId: Id<"appointmentBookingBatches">;
        failedCalendarEventIds: Id<"calendarEvents">[];
        failureMessage: string;
      }, null>;
    };
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    };
  };
}).googleCalendar;

export type BatchBookingSyncDependencies = {
  prepare(args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    startAts: number[];
    refreshed: boolean;
  }): Promise<PrepareBatchBookResult>;
  refresh(args: { connectionId: Id<"googleCalendarConnections"> }): Promise<unknown>;
  create(write: PreparedBatchWrite): Promise<GoogleCalendarOperationResult>;
  remove(write: PreparedBatchWrite): Promise<GoogleCalendarOperationResult>;
  finalize(args: { batchId: Id<"appointmentBookingBatches"> }): Promise<BatchBookingResult>;
  rollback(args: { batchId: Id<"appointmentBookingBatches"> }): Promise<null>;
  markCompensationFailed(args: {
    batchId: Id<"appointmentBookingBatches">;
    failedCalendarEventIds: Id<"calendarEvents">[];
    failureMessage: string;
  }): Promise<null>;
};

export async function runBookAppointments(
  args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    startAts: number[];
  },
  dependencies: BatchBookingSyncDependencies,
): Promise<BatchBookingResult> {
  let prepared = await dependencies.prepare({ ...args, refreshed: false });
  if (prepared.kind === "needs_refresh") {
    await Promise.all(prepared.connectionIds.map((connectionId) =>
      dependencies.refresh({ connectionId })
    ));
    prepared = await dependencies.prepare({ ...args, refreshed: true });
  }
  if (prepared.kind === "failed") return prepared.result;
  if (prepared.kind === "needs_refresh") {
    return { success: false, message: "Google Calendar refresh did not complete.", kind: "retryable" };
  }
  const completed: PreparedBatchWrite[] = [];
  for (const write of prepared.writes) {
    if (write.kind === "local") continue;
    const result = await dependencies.create(write);
    if (result.kind === "success") {
      completed.push(write);
      continue;
    }
    const failedCompensations: Id<"calendarEvents">[] = [];
    for (const created of [...completed].reverse()) {
      const deleted = await dependencies.remove(created);
      if (deleted.kind !== "success") failedCompensations.push(created.calendarEventId);
    }
    if (failedCompensations.length > 0) {
      await dependencies.markCompensationFailed({
        batchId: prepared.batchId,
        failedCalendarEventIds: failedCompensations,
        failureMessage: "Google Calendar compensation failed.",
      });
      return {
        success: false,
        message: "Google Calendar compensation failed. Manual recovery is required.",
        kind: "failed",
      };
    }
    await dependencies.rollback({ batchId: prepared.batchId });
    return bookingFailureFromGoogle(result);
  }
  return await dependencies.finalize({ batchId: prepared.batchId });
}

export function batchBookingSyncDependencies(ctx: ActionCtx): BatchBookingSyncDependencies {
  const writeDependencies = googleCalendarWriteActionDependencies(ctx);
  return {
    prepare: (args) => ctx.runMutation(batchInternal.batchBookingPrepare.prepareBatchBook, args),
    refresh: (args) => ctx.runAction(batchInternal.syncWorker.run, args),
    create: (write) => {
      if (write.connectionId === undefined) throw new Error("Google connection is required");
      return runCreateGoogleCalendarEvent({ ...write, connectionId: write.connectionId }, writeDependencies);
    },
    remove: (write) => {
      if (write.connectionId === undefined) throw new Error("Google connection is required");
      return runDeleteGoogleCalendarEvent({
        connectionId: write.connectionId,
        calendarEventId: write.calendarEventId,
        operationKey: googleCalendarEventOperationKey(write.calendarEventId, "delete"),
        now: Date.now(),
      }, writeDependencies);
    },
    finalize: (args) => ctx.runMutation(batchInternal.batchBookingFinalize.finalizeBatchBook, args),
    rollback: (args) => ctx.runMutation(batchInternal.batchBookingFinalize.rollbackBatchBook, args),
    markCompensationFailed: (args) =>
      ctx.runMutation(batchInternal.batchBookingFinalize.markBatchCompensationFailed, args),
  };
}
