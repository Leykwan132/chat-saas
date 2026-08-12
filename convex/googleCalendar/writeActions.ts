import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import {
  googleCalendarOperationResultValidator,
  type GoogleCalendarOperationResult,
} from "./contracts";
import { getGoogleCalendarCredential } from "./workosToken";
import {
  runCreateGoogleCalendarEvent,
  runDeleteGoogleCalendarEvent,
} from "./writeExecution";
import { runUpdateGoogleCalendarEvent } from "./writeUpdateExecution";
import {
  googleCalendarWriteInputValidator,
  type GoogleCalendarWriteDependencies,
} from "./writeTypes";

export { deriveGoogleCalendarEventId } from "./writeFingerprint";
export {
  runCreateGoogleCalendarEvent,
  runDeleteGoogleCalendarEvent,
} from "./writeExecution";
export { runUpdateGoogleCalendarEvent } from "./writeUpdateExecution";
export type { GoogleCalendarWriteDependencies } from "./writeTypes";

type StoreMutation<TArgs extends Record<string, unknown>, TResult> =
  FunctionReference<"mutation", "internal", TArgs, TResult>;

const googleCalendarInternal = (internal as unknown as {
  googleCalendar: {
    writeStore: {
      prepare: StoreMutation<Parameters<GoogleCalendarWriteDependencies["prepare"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["prepare"]>>>;
      beginAttempt: StoreMutation<Parameters<GoogleCalendarWriteDependencies["beginAttempt"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["beginAttempt"]>>>;
    };
    writeAttemptLeaseStore: {
      renewAttemptLease: StoreMutation<Parameters<GoogleCalendarWriteDependencies["renewAttemptLease"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["renewAttemptLease"]>>>;
      deferMutationRecovery: StoreMutation<Parameters<GoogleCalendarWriteDependencies["deferMutationRecovery"]>[0], null>;
    };
    writeFinalizationStore: {
      finalizeEvent: StoreMutation<Parameters<GoogleCalendarWriteDependencies["finalizeEvent"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["finalizeEvent"]>>>;
      establishDeletePrecondition: StoreMutation<Parameters<GoogleCalendarWriteDependencies["establishDeletePrecondition"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["establishDeletePrecondition"]>>>;
      finalizeDelete: StoreMutation<Parameters<GoogleCalendarWriteDependencies["finalizeDelete"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["finalizeDelete"]>>>;
      recordOutcome: StoreMutation<Parameters<GoogleCalendarWriteDependencies["recordOutcome"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["recordOutcome"]>>>;
    };
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    };
  };
}).googleCalendar;

function actionDependencies(ctx: ActionCtx): GoogleCalendarWriteDependencies {
  return {
    prepare: (args) => ctx.runMutation(googleCalendarInternal.writeStore.prepare, args),
    beginAttempt: (args) => ctx.runMutation(googleCalendarInternal.writeStore.beginAttempt, args),
    renewAttemptLease: (args) => ctx.runMutation(googleCalendarInternal.writeAttemptLeaseStore.renewAttemptLease, args),
    deferMutationRecovery: (args) => ctx.runMutation(googleCalendarInternal.writeAttemptLeaseStore.deferMutationRecovery, args),
    finalizeEvent: (args) => ctx.runMutation(googleCalendarInternal.writeFinalizationStore.finalizeEvent, args),
    establishDeletePrecondition: (args) => ctx.runMutation(
      googleCalendarInternal.writeFinalizationStore.establishDeletePrecondition, args,
    ),
    finalizeDelete: (args) => ctx.runMutation(googleCalendarInternal.writeFinalizationStore.finalizeDelete, args),
    recordOutcome: (args) => ctx.runMutation(googleCalendarInternal.writeFinalizationStore.recordOutcome, args),
    getCredential: getGoogleCalendarCredential,
    refresh: (args) => ctx.runAction(googleCalendarInternal.syncWorker.run, args),
    clock: Date.now,
    fetchImplementation: fetch,
  };
}

const eventWriteArgs = {
  connectionId: v.id("googleCalendarConnections"),
  calendarEventId: v.id("calendarEvents"),
  operationKey: v.string(),
  event: googleCalendarWriteInputValidator,
  now: v.number(),
};
const deleteWriteArgs = {
  connectionId: v.id("googleCalendarConnections"),
  calendarEventId: v.id("calendarEvents"),
  operationKey: v.string(),
  now: v.number(),
};

export const createGoogleCalendarEvent = internalAction({
  args: eventWriteArgs,
  returns: googleCalendarOperationResultValidator,
  handler: async (ctx, args): Promise<GoogleCalendarOperationResult> =>
    runCreateGoogleCalendarEvent(args, actionDependencies(ctx)),
});
export const updateGoogleCalendarEvent = internalAction({
  args: eventWriteArgs,
  returns: googleCalendarOperationResultValidator,
  handler: async (ctx, args): Promise<GoogleCalendarOperationResult> =>
    runUpdateGoogleCalendarEvent(args, actionDependencies(ctx)),
});
export const deleteGoogleCalendarEvent = internalAction({
  args: deleteWriteArgs,
  returns: googleCalendarOperationResultValidator,
  handler: async (ctx, args): Promise<GoogleCalendarOperationResult> =>
    runDeleteGoogleCalendarEvent(args, actionDependencies(ctx)),
});
