import type { Id } from "../_generated/dataModel";
import { googleCalendarOperationError, type GoogleCalendarOperationResult } from "./contracts";
import { GoogleCalendarProviderError } from "./googleClient";
import { fingerprintGoogleCalendarWritePayload } from "./writeFingerprint";
import type {
  GoogleCalendarEventWriteArgs,
  GoogleCalendarWriteArgs,
  GoogleCalendarWriteDependencies,
} from "./writeTypes";

export function classifiedProviderError(error: unknown) {
  if (!(error instanceof GoogleCalendarProviderError)) return "failed" as const;
  if (error.kind === "invalid_sync_token") return "failed" as const;
  return error.kind;
}

export async function recordError(
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

export async function credentialForWrite(
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

export function isOperationResult(
  value: Awaited<ReturnType<typeof credentialForWrite>>,
): value is GoogleCalendarOperationResult {
  return value.kind !== "active";
}

export async function refreshFailure(
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

export async function reserveAndBegin(
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
    now: dependencies.clock(),
  });
  return { prepared, attempt, payloadFingerprint } as const;
}

export async function renewAttemptLease(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  attemptGeneration: number,
  phase: "preparing" | "provider_mutation_started",
) {
  const result = await dependencies.renewAttemptLease({
    operationId, attemptGeneration, phase, now: dependencies.clock(),
  });
  if (result.kind === "ready") return null;
  return result.kind === "success"
    ? result
    : googleCalendarOperationError("retryable");
}

export async function claimMutationRecovery(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  attemptGeneration: number,
) {
  const claim = await dependencies.claimMutationRecovery({
    operationId, attemptGeneration, now: dependencies.clock(),
  });
  if (claim.kind === "ready") return null;
  if (claim.kind === "success") return claim;
  return googleCalendarOperationError(claim.kind === "exhausted" ? "failed" : "retryable");
}

export async function recordRecoveryConflict(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  attemptGeneration: number,
  now: number,
) {
  const result = await dependencies.recordRecoveryConflict({
    operationId, attemptGeneration, now,
  });
  return result.kind === "success" ? result : googleCalendarOperationError("conflict");
}
