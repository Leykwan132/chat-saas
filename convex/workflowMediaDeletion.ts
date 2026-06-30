import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { generateWorkflowMediaKey } from "./media/r2";
import { mediaDeletePool } from "./mediaPools";
import {
  listWorkflowNodeMediaRows,
  mediaBelongsToAgent,
} from "./workflowMediaShared";

export async function queueWorkflowMediaR2Delete(
  ctx: MutationCtx,
  r2Key: string,
  uploadId?: Id<"mediaUploads">,
  options?: { runAfterMs?: number },
) {
  const scheduleOptions =
    options?.runAfterMs === undefined ? {} : { runAfter: options.runAfterMs };
  if (uploadId === undefined) {
    await mediaDeletePool.enqueueAction(
      ctx,
      internal.workpool.mediaDeleteWorker,
      { r2Key },
      { retry: true, ...scheduleOptions },
    );
    return;
  }

  await mediaDeletePool.enqueueAction(
    ctx,
    internal.workpool.mediaDeleteWorker,
    { r2Key },
    {
      onComplete: internal.media.attachments.mediaDeleteComplete,
      context: { uploadId },
      retry: true,
      ...scheduleOptions,
    },
  );
}

function expectedWorkflowMediaKey(row: Doc<"mediaUploads">) {
  if (!row.agentId || !row.workflowNodeId || !row.filename) return null;
  return generateWorkflowMediaKey(
    row.orgId,
    row.agentId,
    row.workflowNodeId,
    row.clientId,
    row.filename,
  );
}

export async function deleteOrQueueWorkflowMediaRow(
  ctx: MutationCtx,
  row: Doc<"mediaUploads">,
) {
  if (row.status === "deleting") return;

  if (row.r2Key) {
    await ctx.db.patch(row._id, { status: "deleting" });
    await queueWorkflowMediaR2Delete(ctx, row.r2Key, row._id);
    return;
  }

  if (row.status === "cancelled") return;

  if (row.status === "queued" || row.status === "uploading") {
    const expectedKey = expectedWorkflowMediaKey(row);
    await ctx.db.patch(row._id, { status: "cancelled" });
    if (expectedKey) {
      await queueWorkflowMediaR2Delete(ctx, expectedKey);
      await queueWorkflowMediaR2Delete(ctx, expectedKey, undefined, {
        runAfterMs: 5 * 60 * 1000,
      });
    }
    return;
  }

  await ctx.db.delete(row._id);
}

export async function deleteOrQueueWorkflowNodeMedia(
  ctx: MutationCtx,
  agent: Doc<"agents">,
  nodeId: Id<"workflowNodes">,
) {
  const rows = await listWorkflowNodeMediaRows(ctx, nodeId);
  for (const row of rows) {
    if (
      row.purpose !== "workflowSendMedia" ||
      !mediaBelongsToAgent(row, agent)
    ) {
      continue;
    }
    await deleteOrQueueWorkflowMediaRow(ctx, row);
  }
}
