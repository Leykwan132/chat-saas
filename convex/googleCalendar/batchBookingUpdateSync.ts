import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { bookingFailureFromGoogle } from "./bookingGate";
import type { GoogleCalendarOperationResult } from "./contracts";
import { runUpdateGoogleCalendarEvent } from "./writeUpdateExecution";
import { googleCalendarWriteActionDependencies } from "./writeActions";
import {
  batchUpdateOperationKey,
  type BatchBookingUpdate,
  type BatchBookingUpdateResult,
  type PrepareBatchUpdateResult,
  type PreparedBatchUpdateWrite,
} from "./batchBookingUpdateTypes";

type BatchId = Id<"appointmentBookingUpdateBatches">;
type MutationRef<TArgs, TResult> = FunctionReference<
  "mutation",
  "internal",
  TArgs & Record<string, unknown>,
  TResult
>;
type PrepareArgs = { conversationId: Id<"conversations">; updates: BatchBookingUpdate[]; refreshed: boolean };
type MarkFailedArgs = { batchId: BatchId; failedCalendarEventIds: Id<"calendarEvents">[]; failureMessage: string };

const updateInternal = (internal as unknown as {
  googleCalendar: {
    batchBookingUpdatePrepare: {
      prepareBatchUpdate: MutationRef<PrepareArgs, PrepareBatchUpdateResult>;
    };
    batchBookingUpdateFinalize: {
      finalizeBatchUpdate: MutationRef<{ batchId: BatchId }, BatchBookingUpdateResult>;
      markBatchUpdateRestored: MutationRef<{ batchId: BatchId }, null>;
      markBatchUpdateFailed: MutationRef<MarkFailedArgs, null>;
    };
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    };
  };
}).googleCalendar;

export type BatchBookingUpdateSyncDependencies = {
  prepare(args: PrepareArgs): Promise<PrepareBatchUpdateResult>;
  refresh(args: { connectionId: Id<"googleCalendarConnections"> }): Promise<unknown>;
  update(batchId: BatchId, write: PreparedBatchUpdateWrite): Promise<GoogleCalendarOperationResult>;
  restore(batchId: BatchId, write: PreparedBatchUpdateWrite): Promise<GoogleCalendarOperationResult>;
  finalize(args: { batchId: BatchId }): Promise<BatchBookingUpdateResult>;
  markRestored(args: { batchId: BatchId }): Promise<null>;
  markFailed(args: MarkFailedArgs): Promise<null>;
};

const MANUAL_RECOVERY: BatchBookingUpdateResult = {
  success: false,
  kind: "failed",
  message: "Google Calendar restore failed. Manual recovery is required.",
};

async function restoreCompleted(
  batchId: BatchId,
  completed: PreparedBatchUpdateWrite[],
  dependencies: BatchBookingUpdateSyncDependencies,
) {
  const failedRestores: Id<"calendarEvents">[] = [];
  for (const write of [...completed].reverse()) {
    const restored = await dependencies.restore(batchId, write).catch((error: unknown) => {
      console.error("batch_booking_update_restore_threw", { batchId, calendarEventId: write.calendarEventId, error });
      return null;
    });
    if (restored?.kind !== "success") failedRestores.push(write.calendarEventId);
  }
  if (failedRestores.length > 0) {
    await dependencies.markFailed({
      batchId,
      failedCalendarEventIds: failedRestores,
      failureMessage: "Google Calendar restore failed.",
    });
    return false;
  }
  await dependencies.markRestored({ batchId });
  return true;
}

export async function runBatchBookingUpdate(
  args: { conversationId: Id<"conversations">; updates: BatchBookingUpdate[] },
  dependencies: BatchBookingUpdateSyncDependencies,
): Promise<BatchBookingUpdateResult> {
  let prepared = await dependencies.prepare({ ...args, refreshed: false });
  if (prepared.kind === "needs_refresh") {
    await Promise.all(prepared.connectionIds.map((connectionId) => dependencies.refresh({ connectionId })));
    prepared = await dependencies.prepare({ ...args, refreshed: true });
  }
  if (prepared.kind === "failed" || prepared.kind === "completed") return prepared.result;
  if (prepared.kind === "needs_refresh") {
    return { success: false, message: "Google Calendar refresh did not complete.", kind: "retryable" };
  }
  const { batchId } = prepared;
  const completed: PreparedBatchUpdateWrite[] = [];
  for (const write of prepared.writes) {
    let result;
    try {
      result = await dependencies.update(batchId, write);
    } catch (error) {
      const restored = await restoreCompleted(batchId, completed, dependencies);
      if (!restored) return MANUAL_RECOVERY;
      throw error;
    }
    if (result.kind === "success") {
      completed.push(write);
      continue;
    }
    const restored = await restoreCompleted(batchId, completed, dependencies);
    return restored ? bookingFailureFromGoogle(result) : MANUAL_RECOVERY;
  }
  return await dependencies.finalize({ batchId });
}

export function batchBookingUpdateSyncDependencies(ctx: ActionCtx): BatchBookingUpdateSyncDependencies {
  const writeDependencies = googleCalendarWriteActionDependencies(ctx);
  const write = (batchId: BatchId, row: PreparedBatchUpdateWrite, action: "update" | "restore") =>
    runUpdateGoogleCalendarEvent({
      connectionId: row.connectionId,
      calendarEventId: row.calendarEventId,
      operationKey: batchUpdateOperationKey(batchId, row.calendarEventId, action),
      event: action === "update" ? row.event : row.original,
      now: action === "update" ? row.now : Date.now(),
    }, writeDependencies);
  return {
    prepare: (args) => ctx.runMutation(updateInternal.batchBookingUpdatePrepare.prepareBatchUpdate, args),
    refresh: (args) => ctx.runAction(updateInternal.syncWorker.run, args),
    update: (batchId, row) => write(batchId, row, "update"),
    restore: (batchId, row) => write(batchId, row, "restore"),
    finalize: (args) => ctx.runMutation(updateInternal.batchBookingUpdateFinalize.finalizeBatchUpdate, args),
    markRestored: (args) => ctx.runMutation(updateInternal.batchBookingUpdateFinalize.markBatchUpdateRestored, args),
    markFailed: (args) => ctx.runMutation(updateInternal.batchBookingUpdateFinalize.markBatchUpdateFailed, args),
  };
}
