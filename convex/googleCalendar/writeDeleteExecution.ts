import { googleCalendarOperationError, type GoogleCalendarOperationResult } from "./contracts";
import { finalizeGoogleCalendarDelete } from "./writeDeleteFinalization";
import {
  classifiedProviderError,
  credentialForWrite,
  isOperationResult,
  recordError,
  refreshFailure,
  renewAttemptLease,
  reserveAndBegin,
} from "./writeExecutionSupport";
import { getGoogleCalendarEventForWrite, removeGoogleCalendarEvent } from "./writeProvider";
import type { GoogleCalendarWriteArgs, GoogleCalendarWriteDependencies } from "./writeTypes";

export async function runDeleteGoogleCalendarEvent(
  args: GoogleCalendarWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
): Promise<GoogleCalendarOperationResult> {
  const reserved = await reserveAndBegin(args, dependencies, "delete", undefined);
  if (!("attempt" in reserved)) return reserved.result;
  if (reserved.attempt.kind === "recovering") {
    return await recoverDelete(args, dependencies, reserved);
  }
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
      const beforeGet = await renewAttemptLease(
        dependencies, prepared.operationId, attempt.attemptGeneration, "preparing",
      );
      if (beforeGet !== null) return beforeGet;
      const providerEvent = await getGoogleCalendarEventForWrite({
        credential,
        externalEventId: prepared.externalEventId,
        fetchImplementation: dependencies.fetchImplementation,
      });
      const afterGet = await renewAttemptLease(
        dependencies, prepared.operationId, attempt.attemptGeneration, "preparing",
      );
      if (afterGet !== null) return afterGet;
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
  const beforeDelete = await renewAttemptLease(
    dependencies, prepared.operationId, attempt.attemptGeneration,
    "provider_mutation_started",
  );
  if (beforeDelete !== null) return beforeDelete;
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
  const afterDelete = await renewAttemptLease(
    dependencies, prepared.operationId, attempt.attemptGeneration,
    "provider_mutation_started",
  );
  if (afterDelete !== null) return afterDelete;
  return await finalizeGoogleCalendarDelete(
    dependencies, prepared.operationId, attempt.attemptGeneration, args.now,
  );
}

async function recoverDelete(
  args: GoogleCalendarWriteArgs,
  dependencies: GoogleCalendarWriteDependencies,
  reserved: Awaited<ReturnType<typeof reserveAndBegin>>,
): Promise<GoogleCalendarOperationResult> {
  if (!("attempt" in reserved) || reserved.attempt.kind !== "recovering") {
    return googleCalendarOperationError("retryable");
  }
  const { prepared, attempt } = reserved;
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
    if (providerEvent.etag !== attempt.intendedEtag) {
      return await recordError(
        dependencies, prepared.operationId, attempt.attemptGeneration, "conflict", args.now,
      );
    }
    await dependencies.deferMutationRecovery({
      operationId: prepared.operationId,
      attemptGeneration: attempt.attemptGeneration,
      now: dependencies.clock(),
    });
    return googleCalendarOperationError("retryable");
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
