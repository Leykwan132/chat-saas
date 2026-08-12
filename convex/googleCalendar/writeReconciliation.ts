import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { MappedGoogleCalendarEvent } from "./eventMapping";

export async function reconcileGoogleCalendarCreate(
  ctx: MutationCtx,
  connection: Doc<"googleCalendarConnections">,
  event: MappedGoogleCalendarEvent,
  now: number,
) {
  if (event.operationKey === undefined) return null;
  const operation = await ctx.db
    .query("googleCalendarWriteOperations")
    .withIndex("by_operationKey", (q) => q.eq("operationKey", event.operationKey!))
    .unique();
  if (
    operation === null || operation.connectionId !== connection._id ||
    operation.action !== "create" || operation.externalEventId !== event.eventId
  ) {
    return null;
  }
  await ctx.db.patch(operation._id, {
    state: "succeeded",
    errorKind: undefined,
    updatedAt: now,
  });
  if (operation.calendarEventId === undefined) return null;
  const localEvent = await ctx.db.get(operation.calendarEventId);
  if (
    localEvent === null || localEvent.externalOwnerUserId !== connection.userId ||
    localEvent.externalCalendarId !== "primary" || localEvent.externalOrigin !== "kilobot"
  ) {
    return null;
  }
  return localEvent;
}
