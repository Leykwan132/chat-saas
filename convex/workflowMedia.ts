import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { mediaDeletePool } from "./mediaPools";
import { getBillingPlanFromStripe } from "./billingScope";
import { getPlan } from "./plans";
import {
  buildWorkflowMediaFileName,
  generateWorkflowMediaKey,
  r2,
} from "./media/r2";
import {
  MAX_AGENT_MEDIA,
  assertAllowedWorkflowMediaType,
  assertManageableSendMediaNode,
  isAllowedWorkflowMediaTypeForNode,
  isActiveWorkflowMedia,
  listWorkflowNodeMediaRows,
  mediaBelongsToAgent,
  publicWorkflowMediaRow,
  type UploadReservation,
} from "./workflowMediaShared";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";
import { MediaUploadPurpose } from "../shared/mediaUploadPurpose";

function mediaUploadError(error: unknown) {
  return error instanceof Error ? error.message : "Upload failed";
}

export const listForNode = query({
  args: { agentId: v.id("agents"), nodeId: v.id("workflowNodes") },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableSendMediaNode(ctx, args.agentId, args.nodeId);
    const rows = await listWorkflowNodeMediaRows(ctx, args.nodeId);
    return rows
      .filter((row) =>
        row.purpose === MediaUploadPurpose.WorkflowSendMedia &&
        mediaBelongsToAgent(row, agent) &&
        isActiveWorkflowMedia(row),
      )
      .map(publicWorkflowMediaRow);
  },
});

export const listLegacyUnassigned = query({
  args: { agentId: v.id("agents"), nodeId: v.id("workflowNodes") },
  handler: async (ctx, args) => {
    const { agent, node } = await assertManageableSendMediaNode(ctx, args.agentId, args.nodeId);
    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(MAX_AGENT_MEDIA);
    return rows
      .filter((row) =>
        row.purpose === MediaUploadPurpose.KnowledgeBase &&
        row.workflowNodeId === undefined &&
        mediaBelongsToAgent(row, agent) &&
        isActiveWorkflowMedia(row) &&
        isAllowedWorkflowMediaTypeForNode(node.kind, row.mediaType),
      )
      .map(publicWorkflowMediaRow);
  },
});

export const importLegacyMedia = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { agent, node } = await assertManageableSendMediaNode(ctx, args.agentId, args.nodeId);
    if (args.clientIds.length === 0) return { imported: 0 };

    const requestedClientIds = new Set(args.clientIds);
    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
      .take(MAX_AGENT_MEDIA);
    let imported = 0;
    for (const row of rows) {
      if (
        !requestedClientIds.has(row.clientId) ||
        row.purpose !== MediaUploadPurpose.KnowledgeBase ||
        row.workflowNodeId !== undefined ||
        !mediaBelongsToAgent(row, agent) ||
        !isActiveWorkflowMedia(row) ||
        !isAllowedWorkflowMediaTypeForNode(node.kind, row.mediaType)
      ) {
        continue;
      }
      await ctx.db.patch(row._id, {
        purpose: MediaUploadPurpose.WorkflowSendMedia,
        workflowNodeId: args.nodeId,
      });
      imported += 1;
    }
    await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);
    return { imported };
  },
});

export const prepareUpload = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const originalFileName = args.fileName.trim();
    if (!originalFileName) throw new Error("File name is required");
    const { node } = await assertManageableSendMediaNode(ctx, args.agentId, args.nodeId);
    assertAllowedWorkflowMediaType(node.kind, args.mimeType, originalFileName);
    const stripeInfo = await getBillingPlanFromStripe(ctx);
    const limit = getPlan(stripeInfo.plan).knowledgeBaseBytesPerAgent;
    const queuedBytes: number = await ctx.runQuery(
      internal.knowledgeBase.internalGetKnowledgeBaseBytesForAgent,
      { agentId: args.agentId },
    );
    if (args.fileSize > limit || queuedBytes + args.fileSize > limit) {
      throw new Error("Knowledge base limit reached for this agent.");
    }

    const reservation: UploadReservation = await ctx.runMutation(
      internal.workflowMediaInternal.internalCreateUpload,
      {
        agentId: args.agentId,
        nodeId: args.nodeId,
        clientId: args.clientId,
        fileName: buildWorkflowMediaFileName(originalFileName),
        mimeType: args.mimeType,
        fileSize: args.fileSize,
      },
    );
    await ctx.runMutation(internal.workflowMediaInternal.internalSetUploading, {
      uploadId: reservation.uploadId,
    });
    const key = generateWorkflowMediaKey(
      reservation.orgId,
      args.agentId,
      args.nodeId,
      args.clientId,
      reservation.fileName,
    );
    try {
      return await r2.generateUploadUrl(key);
    } catch (error) {
      await ctx.runMutation(internal.workflowMediaInternal.internalMarkFailed, {
        agentId: args.agentId,
        nodeId: args.nodeId,
        clientId: args.clientId,
        error: mediaUploadError(error),
      });
      throw error;
    }
  },
});

export const syncUpload = action({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await r2.syncMetadata(ctx, args.key);
      await ctx.runMutation(
        internal.workflowMediaInternal.internalFinalizeDirectUpload,
        args,
      );
    } catch (error) {
      await mediaDeletePool.enqueueAction(
        ctx,
        internal.workpool.mediaDeleteWorker,
        { r2Key: args.key },
        { retry: true },
      );
      await ctx.runMutation(internal.workflowMediaInternal.internalMarkFailed, {
        agentId: args.agentId,
        nodeId: args.nodeId,
        clientId: args.clientId,
        error: mediaUploadError(error),
      });
      throw error;
    }
    return null;
  },
});

export const markUploadFailed = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientId: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.workflowMediaInternal.internalMarkFailed, args);
    return null;
  },
});

export const enqueueDelete = action({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(
      internal.workflowMediaInternal.internalMarkDeleting,
      args,
    );
    return null;
  },
});
