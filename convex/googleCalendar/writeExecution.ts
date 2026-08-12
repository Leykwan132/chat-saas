import type { Id } from "../_generated/dataModel";
import { googleCalendarOperationError, type GoogleCalendarOperationResult } from "./contracts";
import { mapGoogleEvent } from "./eventMapping";
import { GoogleCalendarProviderError } from "./googleClient";
import { finalizeGoogleCalendarDelete } from "./writeDeleteFinalization";
import { deriveGoogleCalendarEventId, fingerprintGoogleCalendarWritePayload } from "./writeFingerprint";
import {
  getGoogleCalendarEventForWrite,
  insertGoogleCalendarEvent,
  patchGoogleCalendarEvent,
  removeGoogleCalendarEvent,
} from "./writeProvider";
import type {
  GoogleCalendarEventWriteArgs,
  GoogleCalendarWriteArgs,
  GoogleCalendarWriteDependencies,
} from "./writeTypes";

function classifiedProviderError(error: unknown) {
  if (!(error instanceof GoogleCalendarProviderError)) return "failed" as const;
  if (error.kind === "invalid_sync_token") return "failed" as const;
  return error.kind;
}

async function recordError(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  attemptGeneration: number,
  kind: Exclude<GoogleCalendarOperationResult["kind"], "success">,
  now: number,
) {
  const outcome = await dependencies.recordOutcome({
    operationId,
    attemptGeneration,
    kind,
    now,
  });
  if (outcome.kind === "success") return outcome;
  return googleCalendarOperationError(kind);
}

async function credentialForWrite(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  attemptGeneration: number,
  workosUserId: string,
  now: number,
) {
  let credential: Awaited<ReturnType<GoogleCalendarWriteDependencies["getCredential"]>>;
  try {
    credential = await dependencies.getCredential(workosUserId);
  } catch {
    return await recordError(dependencies, operationId, attemptGeneration, "retryable", now);
  }
  if (credential.kind !== "active") {
    return await recordError(dependencies, operationId, attemptGeneration, credential.kind, now);
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
  attemptGeneration: number,
  kind: Exclude<GoogleCalendarOperationResult["kind"], "success">,
) {
  const result = await recordError(
    dependencies, operationId, attemptGeneration, kind, args.now,
  );
  if (result.kind === "success" || (kind !== "conflict" && kind !== "not_found")) {
    return result;
  }
  try {
    await dependencies.refresh({ connectionId: args.connectionId });
    return result;
  } catch {
    return await recordError(
      dependencies, operationId, attemptGeneration, "retryable", args.now,
    );
  }
}

async function reserveAndBegin(
  args: GoogleCalendarWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
  action: "create" | "update" | "delete",
  externalEventId: string | undefined,
  event?: GoogleCalendarEventWriteArgs["event"],
) {
  const prepared = await dependencies.prepare({ ...args, action, externalEventId });
  if (prepared.kind === "error") return prepared;
  const payloadFingerprint = await fingerprintGoogleCalendarWritePayload({
    action,
    connectionId: args.connectionId,
    calendarEventId: args.calendarEventId,
    externalEventId: prepared.externalEventId,
    payloadPreconditionEtag: prepared.payloadPreconditionEtag,
    event,
  });
  const attempt = await dependencies.beginAttempt({
    operationId: prepared.operationId,
    payloadFingerprint,
    now: args.now,
  });
  return { prepared, attempt } as const;
}

export async function runCreateGoogleCalendarEvent(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  if (args.operationKey.trim().length === 0) return googleCalendarOperationError("invalid_request");
  const externalEventId = await deriveGoogleCalendarEventId(args.operationKey);
  const { event, ...writeArgs } = args;
  const reserved = await reserveAndBegin(writeArgs, dependencies, "create", externalEventId, event);
  if (!("attempt" in reserved)) return reserved.result;
  if (reserved.attempt.kind !== "ready") {
    if (reserved.attempt.kind === "error") return reserved.attempt.result;
    return reserved.attempt.kind === "running"
      ? googleCalendarOperationError("retryable") : reserved.attempt;
  }
  const { prepared, attempt } = reserved;
  const credential = await credentialForWrite(
    dependencies, prepared.operationId, attempt.attemptGeneration,
    prepared.workosUserId, args.now,
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
      dependencies, args, prepared.operationId, attempt.attemptGeneration,
      classifiedProviderError(error),
    );
  }
  try {
    const finalized = await dependencies.finalizeEvent({
      operationId: prepared.operationId,
      attemptGeneration: attempt.attemptGeneration,
      event: mapGoogleEvent(providerEvent, prepared.timeZone),
      now: args.now,
    });
    return finalized.kind === "success"
      ? finalized
      : googleCalendarOperationError(finalized.kind === "conflict" ? "conflict" : "retryable");
  } catch {
    return googleCalendarOperationError("retryable");
  }
}

export async function runUpdateGoogleCalendarEvent(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  const { event, ...writeArgs } = args;
  const reserved = await reserveAndBegin(writeArgs, dependencies, "update", undefined, event);
  if (!("attempt" in reserved)) return reserved.result;
  if (reserved.attempt.kind !== "ready") {
    if (reserved.attempt.kind === "error") return reserved.attempt.result;
    return reserved.attempt.kind === "running"
      ? googleCalendarOperationError("retryable") : reserved.attempt;
  }
  const { prepared, attempt } = reserved;
  const credential = await credentialForWrite(
    dependencies, prepared.operationId, attempt.attemptGeneration,
    prepared.workosUserId, args.now,
  );
  if (isOperationResult(credential)) return credential;
  let providerEvent;
  try {
    providerEvent = await patchGoogleCalendarEvent({
      credential,
      externalEventId: prepared.externalEventId,
      knownEtag: attempt.intendedEtag,
      event,
      fetchImplementation: dependencies.fetchImplementation,
    });
  } catch (error) {
    return await refreshFailure(
      dependencies, args, prepared.operationId, attempt.attemptGeneration,
      classifiedProviderError(error),
    );
  }
  try {
    const finalized = await dependencies.finalizeEvent({
      operationId: prepared.operationId,
      attemptGeneration: attempt.attemptGeneration,
      event: mapGoogleEvent(providerEvent, prepared.timeZone),
      now: args.now,
    });
    return finalized.kind === "success"
      ? finalized
      : googleCalendarOperationError(finalized.kind === "conflict" ? "conflict" : "retryable");
  } catch {
    return googleCalendarOperationError("retryable");
  }
}

export async function runDeleteGoogleCalendarEvent(
  args: GoogleCalendarWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  const reserved = await reserveAndBegin(args, dependencies, "delete", undefined);
  if (!("attempt" in reserved)) return reserved.result;
  if (reserved.attempt.kind !== "ready") {
    if (reserved.attempt.kind === "error") return reserved.attempt.result;
    return reserved.attempt.kind === "running"
      ? googleCalendarOperationError("retryable") : reserved.attempt;
  }
  const { prepared, attempt } = reserved;
  const credential = await credentialForWrite(
    dependencies, prepared.operationId, attempt.attemptGeneration,
    prepared.workosUserId, args.now,
  );
  if (isOperationResult(credential)) return credential;
  let intendedEtag = attempt.intendedEtag;
  if (intendedEtag === undefined) {
    try {
      const providerEvent = await getGoogleCalendarEventForWrite({
        credential,
        externalEventId: prepared.externalEventId,
        fetchImplementation: dependencies.fetchImplementation,
      });
      if (providerEvent.etag === undefined) {
        return await refreshFailure(
          dependencies, args, prepared.operationId, attempt.attemptGeneration, "conflict",
        );
      }
      const established = await dependencies.establishDeletePrecondition({
        operationId: prepared.operationId,
        attemptGeneration: attempt.attemptGeneration,
        providerEtag: providerEvent.etag,
        now: args.now,
      });
      if (established.kind !== "ready") {
        return established.kind === "success"
          ? established
          : googleCalendarOperationError(established.kind === "conflict" ? "conflict" : "retryable");
      }
      intendedEtag = established.intendedEtag;
    } catch (error) {
      const kind = classifiedProviderError(error);
      if (kind === "not_found") {
        return await finalizeGoogleCalendarDelete(
          dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
        );
      }
      return await refreshFailure(
        dependencies, args, prepared.operationId, attempt.attemptGeneration, kind,
      );
    }
  }
  try {
    await removeGoogleCalendarEvent({
      credential,
      externalEventId: prepared.externalEventId,
      knownEtag: intendedEtag,
      fetchImplementation: dependencies.fetchImplementation,
    });
  } catch (error) {
    const kind = classifiedProviderError(error);
    if (kind !== "not_found") {
      return await refreshFailure(
        dependencies, args, prepared.operationId, attempt.attemptGeneration, kind,
      );
    }
  }
  return await finalizeGoogleCalendarDelete(
    dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
  );
}
