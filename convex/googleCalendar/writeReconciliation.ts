import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { MappedGoogleCalendarEvent } from "./eventMapping";

export type GoogleCalendarReconciliationTarget = {
  operationId: Doc<"googleCalendarWriteOperations">["_id"];
  event: Doc<"calendarEvents">;
};

export async function reconcileGoogleCalendarCreate(
  ctx: MutationCtx,
  connection: Doc<"googleCalendarConnections">,
  event: MappedGoogleCalendarEvent,
) {
  if (event.operationKey === undefined) return null;
  const operation = await ctx.db
    .query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", event.operationKey!))
    .unique();
  if (
    operation === null || operation.connectionId !== connection._id ||
    operation.action !== "create" || operation.externalEventId !== event.eventId ||
    operation.calendarEventId === undefined || operation.payloadBindingVersion !== 2 ||
    operation.payloadFingerprint === undefined ||
    event.operationFingerprint !== operation.payloadFingerprint
  ) return null;
  const localEvent = await ctx.db.get(operation.calendarEventId);
  if (
    localEvent === null || localEvent.externalProvider !== "google" ||
    localEvent.externalOwnerUserId !== connection.userId ||
    localEvent.externalCalendarId !== "primary" || localEvent.externalOrigin !== "kilobot" ||
    (localEvent.externalEventId !== undefined && localEvent.externalEventId !== event.eventId) ||
    (localEvent.externalOperationKey !== undefined &&
      localEvent.externalOperationKey !== operation.operationKey)
  ) return null;
  const membership = await ctx.db.query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", connection.userId).eq("teamId", localEvent.teamId),
    ).unique();
  if (membership === null) return null;
  return { operationId: operation._id, event: localEvent };
}
