import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type OwnedSyncRun = {
  connection: Doc<"googleCalendarConnections">;
  run: Doc<"googleCalendarSyncRuns">;
};

export async function ownedSyncRun(
  ctx: MutationCtx,
  connectionId: Id<"googleCalendarConnections">,
  runId: Id<"googleCalendarSyncRuns">,
): Promise<OwnedSyncRun | undefined> {
  const connection = await ctx.db.get(connectionId);
  if (connection === null) throw new Error("Google Calendar connection not found");
  const run = await ctx.db.get(runId);
  if (
    run === null ||
    run.connectionId !== connection._id ||
    run.state !== "running" ||
    connection.activeSyncRunId !== run._id
  ) {
    return undefined;
  }
  return { connection, run };
}
