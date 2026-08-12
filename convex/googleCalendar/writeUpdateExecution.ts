import { googleCalendarOperationError, type GoogleCalendarOperationResult } from "./contracts";
import { mapGoogleEvent } from "./eventMapping";
import { GoogleCalendarProviderError } from "./googleClient";
import {
  classifiedProviderError,
  claimMutationRecovery,
  credentialForWrite,
  isOperationResult,
  recordRecoveryConflict,
  refreshFailure,
  renewAttemptLease,
  reserveAndBegin,
} from "./writeExecutionSupport";
import { providerMatchesGoogleCalendarWriteInput } from "./writePayloadMatch";
import {
  getGoogleCalendarEventForWrite,
  patchGoogleCalendarEvent,
} from "./writeProvider";
import type {
  GoogleCalendarEventWriteArgs,
  GoogleCalendarWriteDependencies,
} from "./writeTypes";

export async function runUpdateGoogleCalendarEvent(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  const { event, ...writeArgs } = args;
  const reserved = await reserveAndBegin(writeArgs, dependencies, "update", undefined, event);
  if (!("attempt" in reserved)) return reserved.result;
  if (reserved.attempt.kind === "recovering") {
    return await recoverUpdate(args, dependencies, reserved);
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
    const beforeGet = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration, "preparing",
    );
    if (beforeGet !== null) return beforeGet;
    const current = await getGoogleCalendarEventForWrite({
      credential,
      externalEventId: prepared.externalEventId,
      fetchImplementation: dependencies.fetchImplementation,
    });
    const afterGet = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration, "preparing",
    );
    if (afterGet !== null) return afterGet;
    if (
      attempt.intendedEtag === undefined || current.etag === undefined ||
      current.etag !== attempt.intendedEtag
    ) throw new GoogleCalendarProviderError("conflict");
    const beforePatch = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      "provider_mutation_started",
    );
    if (beforePatch !== null) return beforePatch;
    providerEvent = await patchGoogleCalendarEvent({
      credential,
      externalEventId: prepared.externalEventId,
      knownEtag: current.etag,
      operationKey: args.operationKey,
      payloadFingerprint,
      event,
      fetchImplementation: dependencies.fetchImplementation,
    });
    const afterPatch = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      "provider_mutation_started",
    );
    if (afterPatch !== null) return afterPatch;
  } catch (error) {
    return await refreshFailure(
      dependencies, args, prepared.operationId, attempt.attemptGeneration,
      classifiedProviderError(error),
    );
  }
  return await finalizeUpdate(
    args, dependencies, prepared, attempt.attemptGeneration, providerEvent,
  );
}

async function recoverUpdate(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
  reserved: Extract<Awaited<ReturnType<typeof reserveAndBegin>>, { attempt: unknown }>,
) {
  if (reserved.attempt.kind !== "recovering") {
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
      marker?.kilobotOperationKey === args.operationKey &&
      marker.kilobotOperationFingerprint === payloadFingerprint
    ) {
      if (!providerMatchesGoogleCalendarWriteInput(providerEvent, args.event)) {
        return await recordRecoveryConflict(
          dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
        );
      }
      return await finalizeUpdate(
        args, dependencies, prepared, attempt.attemptGeneration, providerEvent,
      );
    }
    const intendedEtag = attempt.intendedEtag;
    if (intendedEtag === undefined || providerEvent.etag !== intendedEtag) {
      return await recordRecoveryConflict(
        dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
      );
    }
    const claimed = await claimMutationRecovery(
      dependencies, prepared.operationId, attempt.attemptGeneration,
    );
    if (claimed !== null) return claimed;
    let updated;
    try {
      updated = await patchGoogleCalendarEvent({
        credential, externalEventId: prepared.externalEventId,
        knownEtag: intendedEtag, operationKey: args.operationKey,
        payloadFingerprint, event: args.event,
        fetchImplementation: dependencies.fetchImplementation,
      });
    } catch (error) {
      if (error instanceof GoogleCalendarProviderError && error.kind === "conflict") {
        await dependencies.deferMutationRecovery({
          operationId: prepared.operationId,
          attemptGeneration: attempt.attemptGeneration,
          now: dependencies.clock(),
        });
        return googleCalendarOperationError("conflict");
      }
      throw error;
    }
    const renewed = await renewAttemptLease(
      dependencies, prepared.operationId, attempt.attemptGeneration,
      "provider_mutation_started",
    );
    if (renewed !== null) return renewed;
    const updatedMarker = updated.extendedProperties?.private;
    if (
      updatedMarker?.kilobotOperationKey !== args.operationKey ||
      updatedMarker.kilobotOperationFingerprint !== payloadFingerprint ||
      !providerMatchesGoogleCalendarWriteInput(updated, args.event)
    ) return await recordRecoveryConflict(
      dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
    );
    return await finalizeUpdate(
      args, dependencies, prepared, attempt.attemptGeneration, updated,
    );
  } catch (error) {
    return await refreshFailure(
      dependencies, args, prepared.operationId, attempt.attemptGeneration,
      classifiedProviderError(error),
    );
  }
}

async function finalizeUpdate(
  args: GoogleCalendarEventWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
  prepared: Extract<Awaited<ReturnType<typeof reserveAndBegin>>, { prepared: unknown }>["prepared"],
  attemptGeneration: number,
  providerEvent: Parameters<typeof mapGoogleEvent>[0],
) {
  try {
    const finalized = await dependencies.finalizeEvent({
      operationId: prepared.operationId,
      attemptGeneration,
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
