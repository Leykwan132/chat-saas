import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getPublicMediaUrl } from "./media/r2";
import { requireReadyMediaPublicUrl } from "./media/publicUrls";
import { assertManageableAgent } from "./agentAccess";
import {
  assertAllowedWorkflowMediaType,
  assertManageableSendMediaNode,
  listWorkflowNodeMediaRows,
  mediaBelongsToAgent,
  requireSendMediaNode,
  type UploadReservation,
} from "./workflowMediaShared";
import {
  deleteOrQueueWorkflowMediaRow,
  queueWorkflowMediaR2Delete,
} from "./workflowMediaDeletion";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";

async function findWorkflowMediaRow(
  ctx: Parameters<typeof listWorkflowNodeMediaRows>[0],
  agentId: Parameters<typeof assertManageableSendMediaNode>[1],
  nodeId: Parameters<typeof listWorkflowNodeMediaRows>[1],
  clientId: string,
) {
  const { agent } = await assertManageableAgent(ctx, agentId);
  const rows = await listWorkflowNodeMediaRows(ctx, nodeId);
  return rows.find((candidate) =>
    candidate.clientId === clientId &&
    candidate.purpose === "workflowSendMedia" &&
    mediaBelongsToAgent(candidate, agent),
  );
}

export const internalCreateUpload = internalMutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args): Promise<UploadReservation> => {
    const { auth, agent, node } = await assertManageableSendMediaNode(
      ctx,
      args.agentId,
      args.nodeId,
    );
    assertAllowedWorkflowMediaType(node.kind, args.mimeType, args.fileName);
    const existing = await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId_userId_clientId", (q) =>
        q.eq("orgId", auth.orgId).eq("userId", auth.userId).eq("clientId", args.clientId),
      )
      .unique();

    if (existing !== null) {
      if (existing.status === "ready" || existing.status === "queued" || existing.status === "uploading") {
        throw new Error("Upload already exists");
      }
      await ctx.db.delete(existing._id);
    }

    const uploadId = await ctx.db.insert("mediaUploads", {
      clientId: args.clientId,
      orgId: auth.orgId,
      userId: auth.userId,
      agentId: agent._id,
      workflowNodeId: args.nodeId,
      purpose: "workflowSendMedia",
      filename: args.fileName,
      mediaType: args.mimeType,
      fileSize: args.fileSize,
      status: "queued",
      createdAt: Date.now(),
    });
    return { uploadId, orgId: auth.orgId, userId: auth.userId, fileName: args.fileName };
  },
});

export const internalSetUploading = internalMutation({
  args: { uploadId: v.id("mediaUploads") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.uploadId, { status: "uploading" });
  },
});

export const workflowMediaUploadComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({ uploadId: v.id("mediaUploads") }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.context.uploadId);
    if (args.result.kind === "success" && args.result.returnValue) {
      const result = args.result.returnValue as { r2Key: string; publicUrl: string; fileSize: number };
      if (row === null) {
        await queueWorkflowMediaR2Delete(ctx, result.r2Key);
        return;
      }
      const metadata = {
        r2Key: result.r2Key,
        publicUrl: result.publicUrl,
        fileSize: result.fileSize,
      };
      if (row.status === "cancelled") {
        await ctx.db.patch(row._id, metadata);
        await deleteOrQueueWorkflowMediaRow(ctx, { ...row, ...metadata });
        return;
      }
      await ctx.db.patch(row._id, { status: "ready", ...metadata });
    } else if (args.result.kind === "failed") {
      if (row === null) return;
      if (row.status === "cancelled" || row.status === "deleting") {
        await ctx.db.delete(row._id);
        return;
      }
      await ctx.db.patch(row._id, {
        status: "failed",
        error: args.result.error,
      });
    } else if (
      row !== null &&
      (row.status === "cancelled" || row.status === "deleting")
    ) {
      await ctx.db.delete(row._id);
    }
    if (row?.agentId) {
      await refreshWorkflowNodeReadinessForAgent(ctx, row.agentId);
    }
  },
});

export const internalFinalizeDirectUpload = internalMutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await findWorkflowMediaRow(
      ctx,
      args.agentId,
      args.nodeId,
      args.clientId,
    );
    if (row === undefined) {
      await queueWorkflowMediaR2Delete(ctx, args.key);
      return null;
    }

    const metadata = {
      r2Key: args.key,
      publicUrl: getPublicMediaUrl(args.key),
    };
    if (row.status === "cancelled" || row.status === "deleting") {
      await ctx.db.patch(row._id, metadata);
      await deleteOrQueueWorkflowMediaRow(ctx, { ...row, ...metadata });
      return null;
    }
    await ctx.db.patch(row._id, { status: "ready", ...metadata });
    await refreshWorkflowNodeReadinessForAgent(ctx, args.agentId);
    return null;
  },
});

export const internalMarkDeleting = internalMutation({
  args: { agentId: v.id("agents"), nodeId: v.id("workflowNodes"), clientId: v.string() },
  handler: async (ctx, args) => {
    const row = await findWorkflowMediaRow(
      ctx,
      args.agentId,
      args.nodeId,
      args.clientId,
    );
    if (row === undefined || row.status === "deleting" || row.status === "cancelled") {
      return null;
    }
    await deleteOrQueueWorkflowMediaRow(ctx, row);
    await refreshWorkflowNodeReadinessForAgent(ctx, args.agentId);
    return null;
  },
});

export const internalMarkFailed = internalMutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientId: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await findWorkflowMediaRow(
      ctx,
      args.agentId,
      args.nodeId,
      args.clientId,
    );
    if (row === undefined || row.status === "cancelled" || row.status === "deleting") {
      return null;
    }
    await ctx.db.patch(row._id, {
      status: "failed",
      error: args.error ?? "Upload failed",
    });
    return null;
  },
});

export const internalListReadyByNode = internalQuery({
  args: { agentId: v.id("agents"), nodeId: v.id("workflowNodes") },
  handler: async (ctx, args) => {
    await requireSendMediaNode(ctx, args.agentId, args.nodeId);
    const rows = await listWorkflowNodeMediaRows(ctx, args.nodeId);
    return rows
      .filter((row) =>
        row.agentId === args.agentId &&
        row.purpose === "workflowSendMedia" &&
        row.status === "ready",
      )
      .map((row) => ({
        clientId: row.clientId,
        filename: row.filename,
        publicUrl: requireReadyMediaPublicUrl(row),
        mediaType: row.mediaType,
      }));
  },
});
