import type { Id } from "../_generated/dataModel";
import { googleCalendarOperationError } from "./contracts";
import type { GoogleCalendarWriteDependencies } from "./writeTypes";

export async function finalizeGoogleCalendarDelete(
  dependencies: GoogleCalendarWriteDependencies,
  operationId: Id<"googleCalendarWriteOperations">,
  attemptGeneration: number,
  now: number,
) {
  try {
    const finalized = await dependencies.finalizeDelete({
      operationId,
      attemptGeneration,
      confirmedAbsent: true,
      now,
    });
    return finalized.kind === "success"
      ? finalized
      : googleCalendarOperationError(finalized.kind === "conflict" ? "conflict" : "retryable");
  } catch {
    return googleCalendarOperationError("retryable");
  }
}
