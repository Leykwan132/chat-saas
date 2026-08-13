import { googleCalendarOperationError, type GoogleCalendarOperationResult } from "./contracts";
import { mapGoogleEvent } from "./eventMapping";
import { GoogleCalendarProviderError } from "./googleClient";
import { deriveGoogleCalendarEventId } from "./writeFingerprint";
import {
  classifiedProviderError,
  claimMutationRecovery,
  credentialForWrite,
  finishClaimedMutationRecovery,
  isOperationResult,
  recordRecoveryConflict,
  refreshFailure,
  renewAttemptLease,
  reserveAndBegin,
} from "./writeExecutionSupport";
import { providerMatchesGoogleCalendarCreateInput } from "./writePayloadMatch";
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
        marker.kilobotOperationFingerprint !== payloadFingerprint ||
        !providerMatchesGoogleCalendarCreateInput(existing, event)
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
  const claimed = await claimMutationRecovery(
    dependencies, prepared.operationId, attempt.attemptGeneration,
  );
  if (claimed.kind !== "ready") return claimed;
  const recoveryClaimGeneration = claimed.recoveryClaimGeneration;
  try {
    const providerEvent = await getGoogleCalendarEventForWrite({
      credential,
      externalEventId: prepared.externalEventId,
      fetchImplementation: dependencies.fetchImplementation,
    });
    const marker = providerEvent.extendedProperties?.private;
    if (
      marker?.kilobotOperationKey !== args.operationKey ||
      marker.kilobotOperationFingerprint !== payloadFingerprint ||
      !providerMatchesGoogleCalendarCreateInput(providerEvent, args.event)
    ) {
      return await recordRecoveryConflict(
        dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
        recoveryClaimGeneration,
      );
    }
    const finalized = await dependencies.finalizeEvent({
      operationId: prepared.operationId,
      attemptGeneration: attempt.attemptGeneration,
      recoveryClaimGeneration,
      event: mapGoogleEvent(providerEvent, prepared.timeZone),
      now: args.now,
    });
    return finalized.kind === "success"
      ? finalized
      : googleCalendarOperationError(finalized.kind === "conflict" ? "conflict" : "retryable");
  } catch (error) {
    const kind = classifiedProviderError(error);
    if (kind === "not_found") return await reissueCreate(
      args, dependencies, reserved, credential, recoveryClaimGeneration,
    );
    return await finishClaimedMutationRecovery(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      recoveryClaimGeneration, kind,
    );
  }
}

async function reissueCreate(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
  reserved: Extract<Awaited<ReturnType<typeof reserveAndBegin>>, { attempt: unknown }>,
  credential: Extract<Awaited<ReturnType<typeof credentialForWrite>>, { kind: "active" }>,
  recoveryClaimGeneration: number,
): Promise<GoogleCalendarOperationResult> {
  if (reserved.attempt.kind !== "recovering") return googleCalendarOperationError("retryable");
  const { prepared, attempt, payloadFingerprint } = reserved;
  try {
    let providerEvent;
    try {
      providerEvent = await insertGoogleCalendarEvent({
        credential, externalEventId: prepared.externalEventId,
        operationKey: args.operationKey, payloadFingerprint, event: args.event,
        fetchImplementation: dependencies.fetchImplementation,
      });
    } catch (error) {
      if (!(error instanceof GoogleCalendarProviderError) || error.kind !== "conflict") throw error;
      providerEvent = await getGoogleCalendarEventForWrite({
        credential, externalEventId: prepared.externalEventId,
        fetchImplementation: dependencies.fetchImplementation,
      });
    }
    const marker = providerEvent.extendedProperties?.private;
    if (
      marker?.kilobotOperationKey !== args.operationKey ||
      marker.kilobotOperationFingerprint !== payloadFingerprint ||
      !providerMatchesGoogleCalendarCreateInput(providerEvent, args.event)
    ) return await recordRecoveryConflict(
      dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
      recoveryClaimGeneration,
    );
    const finalized = await dependencies.finalizeEvent({
      operationId: prepared.operationId, attemptGeneration: attempt.attemptGeneration,
      recoveryClaimGeneration, event: mapGoogleEvent(providerEvent, prepared.timeZone),
      now: args.now,
    });
    return finalized.kind === "success" ? finalized :
      googleCalendarOperationError(finalized.kind === "conflict" ? "conflict" : "retryable");
  } catch (error) {
    return await finishClaimedMutationRecovery(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      recoveryClaimGeneration, classifiedProviderError(error),
    );
  }
}
