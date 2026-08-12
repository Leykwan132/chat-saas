import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { AVAILABILITY_FRESHNESS_MS } from "./constants";

export async function hasHealthyGoogleCalendarConnection(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const connection = await ctx.db
    .query("googleCalendarConnections")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (connection === null) return true;
  if (connection.state !== "connected" && connection.state !== "syncing") return false;
  if (connection.lastErrorKind !== undefined || connection.lastSuccessfulSyncAt === undefined) {
    return false;
  }
  return Date.now() - connection.lastSuccessfulSyncAt <= AVAILABILITY_FRESHNESS_MS;
}

export function calendarEventBlocksAvailability(event: Doc<"calendarEvents">) {
  if (event.status === "cancelled" || event.externalStatus === "cancelled") return false;
  return event.externalTransparency !== "transparent";
}
