import { googleCalendarOperationError, type GoogleCalendarOperationResult } from "./contracts";
import { mapGoogleEvent } from "./eventMapping";
import { GoogleCalendarProviderError } from "./googleClient";
import { deriveGoogleCalendarEventId } from "./writeFingerprint";
import {
  classifiedProviderError,
  credentialForWrite,
  isOperationResult,
  recordError,
  refreshFailure,
  renewAttemptLease,
  reserveAndBegin,
} from "./writeExecutionSupport";
import {
  getGoogleCalendarEventForWrite,
  insertGoogleCalendarEvent,
} from "./writeProvider";
import type { GoogleCalendarEventWriteArgs, GoogleCalendarWriteDependencies } from "./writeTypes";

export async function runCreateGoogleCalendarEvent(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  if (args.operationKey.trim().length === 0) return googleCalendarOperationError("invalid_request");
  const externalEventId = await deriveGoogleCalendarEventId(args.operationKey);
  const { event, ...writeArgs } = args;
  const reserved = await reserveAndBegin(writeArgs, dependencies, "create", externalEventId, event);
  if (!("attempt" in reserved)) return reserved.result;
  if (reserved.attempt.kind === "recovering") {
    return await recoverCreate(args, dependencies, reserved);
  }
  if (reserved.attempt.kind !== "ready") {
    if (reserved.attempt.kind === "error") return reserved.attempt.result;
    return reserved.attempt.kind === "running"
      ? googleCalendarOperationError("retryable") : reserved.attempt;
  }
  const { prepared, attempt, payloadFingerprint } = reserved;
  const credential = await credentialForWrite(
    dependencies, prepared.operationId, attempt.attemptGeneration,
    prepared.workosUserId, args.now,
  );
  if (isOperationResult(credential)) return credential;
  let providerEvent;
  try {
    const beforePost = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      "provider_mutation_started",
    );
    if (beforePost !== null) return beforePost;
    try {
      providerEvent = await insertGoogleCalendarEvent({
        credential,
        externalEventId,
        operationKey: args.operationKey,
        payloadFingerprint,
        event,
        fetchImplementation: dependencies.fetchImplementation,
      });
    } catch (error) {
      if (!(error instanceof GoogleCalendarProviderError) || error.kind !== "conflict") {
        throw error;
      }
      const beforeGet = await renewAttemptLease(
        dependencies, prepared.operationId, attempt.attemptGeneration,
        "provider_mutation_started",
      );
      if (beforeGet !== null) return beforeGet;
      const existing = await getGoogleCalendarEventForWrite({
        credential,
        externalEventId,
        fetchImplementation: dependencies.fetchImplementation,
      });
      const afterGet = await renewAttemptLease(
        dependencies, prepared.operationId, attempt.attemptGeneration,
        "provider_mutation_started",
      );
      if (afterGet !== null) return afterGet;
      const marker = existing.extendedProperties?.private;
      if (
        marker?.kilobotOperationKey !== args.operationKey ||
        marker.kilobotOperationFingerprint !== payloadFingerprint
      ) throw new GoogleCalendarProviderError("conflict");
      providerEvent = existing;
    }
    const afterPost = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      "provider_mutation_started",
    );
    if (afterPost !== null) return afterPost;
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

async function recoverCreate(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
  reserved: Awaited<ReturnType<typeof reserveAndBegin>>,
): Promise<GoogleCalendarOperationResult> {
  if (!("attempt" in reserved) || reserved.attempt.kind !== "recovering") {
    return googleCalendarOperationError("retryable");
  }
  const { prepared, attempt, payloadFingerprint } = reserved;
  const credential = await credentialForWrite(
    dependencies, prepared.operationId, attempt.attemptGeneration,
    prepared.workosUserId, args.now,
  );
  if (isOperationResult(credential)) return credential;
  try {
    const beforeGet = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      "provider_mutation_started",
    );
    if (beforeGet !== null) return beforeGet;
    const providerEvent = await getGoogleCalendarEventForWrite({
      credential,
      externalEventId: prepared.externalEventId,
      fetchImplementation: dependencies.fetchImplementation,
    });
    const afterGet = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      "provider_mutation_started",
    );
    if (afterGet !== null) return afterGet;
    const marker = providerEvent.extendedProperties?.private;
    if (
      marker?.kilobotOperationKey !== args.operationKey ||
      marker.kilobotOperationFingerprint !== payloadFingerprint
    ) {
      return await recordError(
        dependencies, prepared.operationId, attempt.attemptGeneration, "conflict", args.now,
      );
    }
    const finalized = await dependencies.finalizeEvent({
      operationId: prepared.operationId,
      attemptGeneration: attempt.attemptGeneration,
      event: mapGoogleEvent(providerEvent, prepared.timeZone),
      now: args.now,
    });
    return finalized.kind === "success"
      ? finalized
      : googleCalendarOperationError(finalized.kind === "conflict" ? "conflict" : "retryable");
  } catch (error) {
    const kind = classifiedProviderError(error);
    if (kind === "not_found") {
      await dependencies.deferMutationRecovery({
        operationId: prepared.operationId,
        attemptGeneration: attempt.attemptGeneration,
        now: dependencies.clock(),
      });
      return googleCalendarOperationError("retryable");
    }
    return await refreshFailure(
      dependencies, args, prepared.operationId, attempt.attemptGeneration, kind,
    );
  }
}
