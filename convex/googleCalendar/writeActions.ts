import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import {
  googleCalendarOperationError,
  googleCalendarOperationResultValidator,
  type GoogleCalendarOperationResult,
} from "./contracts";
import { mapGoogleEvent } from "./eventMapping";
import { GoogleCalendarProviderError } from "./googleClient";
import { getGoogleCalendarCredential } from "./workosToken";
import {
  insertGoogleCalendarEvent,
  patchGoogleCalendarEvent,
  removeGoogleCalendarEvent,
} from "./writeProvider";
import {
  googleCalendarWriteInputValidator,
  type GoogleCalendarEventWriteArgs,
  type GoogleCalendarWriteArgs,
  type GoogleCalendarWriteDependencies,
} from "./writeTypes";

export type { GoogleCalendarWriteDependencies } from "./writeTypes";

const BASE32HEX_ALPHABET = "0123456789abcdefghijklmnopqrstuv";

export async function deriveGoogleCalendarEventId(operationKey: string) {
  if (operationKey.trim().length === 0) throw new Error("Google Calendar operation key is required");
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(operationKey),
  ));
  let bits = 0;
  let buffer = 0;
  let encoded = "";
  for (const byte of digest) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += BASE32HEX_ALPHABET[(buffer >> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) encoded += BASE32HEX_ALPHABET[(buffer << (5 - bits)) & 31];
  return encoded;
}

function classifiedProviderError(error: unknown) {
  if (!(error instanceof GoogleCalendarProviderError)) return "failed" as const;
  if (error.kind === "invalid_sync_token") return "failed" as const;
  return error.kind;
}

async function recordError(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  kind: Exclude<GoogleCalendarOperationResult["kind"], "success">,
  now: number,
) {
  await dependencies.recordOutcome({ operationId, kind, now });
  return googleCalendarOperationError(kind);
}

async function credentialForWrite(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  workosUserId: string,
  now: number,
) {
  let credential: Awaited<ReturnType<GoogleCalendarWriteDependencies["getCredential"]>>;
  try {
    credential = await dependencies.getCredential(workosUserId);
  } catch {
    return await recordError(dependencies, operationId, "retryable", now);
  }
  if (credential.kind !== "active") {
    return await recordError(dependencies, operationId, credential.kind, now);
  }
  return credential;
}

function isOperationResult(
  value: Awaited<ReturnType<typeof credentialForWrite>>,
): value is GoogleCalendarOperationResult {
  return value.kind !== "active";
}

async function refreshFailure(
  dependencies: GoogleCalendarWriteDependencies,
  args: GoogleCalendarWriteArgs,
  operationId: Id<"googleCalendarWriteOperations">,
  kind: Exclude<GoogleCalendarOperationResult["kind"], "success">,
) {
  const result = await recordError(dependencies, operationId, kind, args.now);
  if (kind !== "conflict" && kind !== "not_found") return result;
  try {
    await dependencies.refresh({ connectionId: args.connectionId });
    return result;
  } catch {
    return await recordError(dependencies, operationId, "retryable", args.now);
  }
}

export async function runCreateGoogleCalendarEvent(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  if (args.operationKey.trim().length === 0) {
    return googleCalendarOperationError("invalid_request");
  }
  const externalEventId = await deriveGoogleCalendarEventId(args.operationKey);
  const { event, ...writeArgs } = args;
  const prepared = await dependencies.prepare({ ...writeArgs, action: "create", externalEventId });
  if (prepared.kind === "error") return prepared.result;
  const credential = await credentialForWrite(
    dependencies,
    prepared.operationId,
    prepared.workosUserId,
    args.now,
  );
  if (isOperationResult(credential)) return credential;
  let providerEvent;
  try {
    providerEvent = await insertGoogleCalendarEvent({
      credential,
      externalEventId,
      operationKey: args.operationKey,
      event,
      fetchImplementation: dependencies.fetchImplementation,
    });
  } catch (error) {
    return await refreshFailure(
      dependencies,
      args,
      prepared.operationId,
      classifiedProviderError(error),
    );
  }
  try {
    const finalizedId = await dependencies.finalizeEvent({
      operationId: prepared.operationId,
      event: mapGoogleEvent(providerEvent, prepared.timeZone),
      now: args.now,
    });
    return { kind: "success", externalEventId: finalizedId };
  } catch {
    return googleCalendarOperationError("retryable");
  }
}

export async function runUpdateGoogleCalendarEvent(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  const { event, ...writeArgs } = args;
  const prepared = await dependencies.prepare({ ...writeArgs, action: "update" });
  if (prepared.kind === "error") return prepared.result;
  const credential = await credentialForWrite(
    dependencies, prepared.operationId, prepared.workosUserId, args.now,
  );
  if (isOperationResult(credential)) return credential;
  let providerEvent;
  try {
    providerEvent = await patchGoogleCalendarEvent({
      credential,
      externalEventId: prepared.externalEventId,
      knownEtag: prepared.knownEtag,
      event,
      fetchImplementation: dependencies.fetchImplementation,
    });
  } catch (error) {
    return await refreshFailure(
      dependencies, args, prepared.operationId, classifiedProviderError(error),
    );
  }
  try {
    const finalizedId = await dependencies.finalizeEvent({
      operationId: prepared.operationId,
      event: mapGoogleEvent(providerEvent, prepared.timeZone),
      now: args.now,
    });
    return { kind: "success", externalEventId: finalizedId };
  } catch {
    return googleCalendarOperationError("retryable");
  }
}

export async function runDeleteGoogleCalendarEvent(
  args: GoogleCalendarWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  const prepared = await dependencies.prepare({ ...args, action: "delete" });
  if (prepared.kind === "error") return prepared.result;
  const credential = await credentialForWrite(
    dependencies, prepared.operationId, prepared.workosUserId, args.now,
  );
  if (isOperationResult(credential)) return credential;
  try {
    await removeGoogleCalendarEvent({
      credential,
      externalEventId: prepared.externalEventId,
      knownEtag: prepared.knownEtag,
      fetchImplementation: dependencies.fetchImplementation,
    });
  } catch (error) {
    const kind = classifiedProviderError(error);
    if (kind !== "not_found") {
      return await refreshFailure(dependencies, args, prepared.operationId, kind);
    }
  }
  try {
    const finalizedId = await dependencies.finalizeDelete({
      operationId: prepared.operationId,
      now: args.now,
    });
    return { kind: "success", externalEventId: finalizedId };
  } catch {
    return googleCalendarOperationError("retryable");
  }
}

type StoreMutation<TArgs extends Record<string, unknown>, TResult> = FunctionReference<"mutation", "internal", TArgs, TResult>;
const googleCalendarInternal = (internal as unknown as {
  googleCalendar: {
    writeStore: {
      prepare: StoreMutation<Parameters<GoogleCalendarWriteDependencies["prepare"]>[0], Awaited<ReturnType<GoogleCalendarWriteDependencies["prepare"]>>>;
      finalizeEvent: StoreMutation<Parameters<GoogleCalendarWriteDependencies["finalizeEvent"]>[0], string>;
      finalizeDelete: StoreMutation<Parameters<GoogleCalendarWriteDependencies["finalizeDelete"]>[0], string>;
      recordOutcome: StoreMutation<Parameters<GoogleCalendarWriteDependencies["recordOutcome"]>[0], null>;
    };
    syncWorker: { run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown> };
  };
}).googleCalendar;

function actionDependencies(ctx: ActionCtx): GoogleCalendarWriteDependencies {
  return {
    prepare: (args) => ctx.runMutation(googleCalendarInternal.writeStore.prepare, args),
    finalizeEvent: (args) => ctx.runMutation(googleCalendarInternal.writeStore.finalizeEvent, args),
    finalizeDelete: (args) => ctx.runMutation(googleCalendarInternal.writeStore.finalizeDelete, args),
    recordOutcome: (args) => ctx.runMutation(googleCalendarInternal.writeStore.recordOutcome, args),
    getCredential: getGoogleCalendarCredential,
    refresh: (args) => ctx.runAction(googleCalendarInternal.syncWorker.run, args),
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
