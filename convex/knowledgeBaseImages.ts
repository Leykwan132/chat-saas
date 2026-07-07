import { v } from "convex/values";
import {
  action,
  internalMutation,
  query,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { cfUploadPool } from "./workpool";
import { api } from "./_generated/api";
import { buildKnowledgeBaseImageFileName } from "./media/r2";
import { requireReadyMediaPublicUrl } from "./media/publicUrls";
import { getBillingPlanFromStripe } from "./billingScope";
import { getPlan } from "./plans";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function assertAllowedImageType(mimeType: string, fileName: string) {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error(`${fileName} is not a supported file type (must be image or PDF)`);
  }
}

// ─── Display query (UI only) ───────────────────────────────

export const listKbImagesByAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();

    return rows.filter(
      (row) =>
        row.purpose === "knowledgeBase" &&
        row.orgId === auth.orgId &&
        row.userId === auth.userId &&
        row.status !== "deleting" &&
        row.status !== "cancelled",
    );
  },
});

// ─── Internal mutations ────────────────────────────────────

export const internalCreateKbImageUpload = internalMutation({
  args: {
    clientId: v.string(),
    orgId: v.string(),
    userId: v.string(),
    agentId: v.id("agents"),
    collectionName: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mediaUploads")
      .withIndex("by_orgId_userId_clientId", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("userId", args.userId)
          .eq("clientId", args.clientId),
      )
      .unique();

    if (existing !== null) {
      if (
        existing.status === "ready" ||
        existing.status === "queued" ||
        existing.status === "uploading"
      ) {
        return existing._id;
      }
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("mediaUploads", {
      clientId: args.clientId,
      orgId: args.orgId,
      userId: args.userId,
      agentId: args.agentId,
      purpose: "knowledgeBase",
      collectionName: args.collectionName,
      filename: args.fileName,
      mediaType: args.mimeType,
      fileSize: args.fileSize,
      status: "queued",
      createdAt: Date.now(),
    });
  },
});

export const internalCompleteKbImageUpload = internalMutation({
  args: {
    uploadId: v.id("mediaUploads"),
    r2Key: v.string(),
    publicUrl: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.uploadId, {
      status: "ready",
      r2Key: args.r2Key,
      publicUrl: args.publicUrl,
      fileSize: args.fileSize,
    });
  },
});

export const internalMarkKbImageFailed = internalMutation({
  args: {
    uploadId: v.id("mediaUploads"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.uploadId, {
      status: "failed",
      error: args.error ?? "Upload failed",
    });
  },
});

export const internalSetKbImageUploading = internalMutation({
  args: {
    uploadId: v.id("mediaUploads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.uploadId, { status: "uploading" });
  },
});

export const kbImageUploadComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      uploadId: v.id("mediaUploads"),
      clientId: v.string(),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.result.kind === "success" && args.result.returnValue) {
      const { r2Key, fileSize, publicUrl } = args.result.returnValue as {
        r2Key: string;
        fileSize: number;
        publicUrl: string;
      };
      await ctx.runMutation(internal.knowledgeBaseImages.internalCompleteKbImageUpload, {
        uploadId: args.context.uploadId,
        r2Key,
        publicUrl,
        fileSize,
      });
    } else if (args.result.kind === "failed") {
      await ctx.runMutation(internal.knowledgeBaseImages.internalMarkKbImageFailed, {
        uploadId: args.context.uploadId,
        error: args.result.error,
      });
    }
  },
});

// ─── Actions ───────────────────────────────────────────────

export const enqueueImageUpload = action({
  args: {
    agentId: v.id("agents"),
    collectionName: v.string(),
    files: v.array(
      v.object({
        clientId: v.string(),
        fileName: v.string(),
        fileBytes: v.bytes(),
        mimeType: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const collectionName = args.collectionName.trim();
    if (!collectionName) {
      throw new Error("Collection name is required");
    }
    if (args.files.length === 0) {
      throw new Error("At least one image is required");
    }

    const stripeInfo = await getBillingPlanFromStripe(ctx);
    const knowledgeBaseLimit = getPlan(stripeInfo.plan).knowledgeBaseBytesPerAgent;
    let queuedBytes = await ctx.runQuery(
      internal.knowledgeBase.internalGetKnowledgeBaseBytesForAgent,
      { agentId: args.agentId },
    );

    for (const file of args.files) {
      const originalFileName = file.fileName.trim();
      if (!originalFileName) {
        throw new Error("File name is required");
      }
      const fileName = buildKnowledgeBaseImageFileName(
        collectionName,
        originalFileName,
      );
      assertAllowedImageType(file.mimeType, originalFileName);
      if (file.fileBytes.byteLength > knowledgeBaseLimit) {
        throw new Error(
          `${originalFileName} exceeds your knowledge base limit for this plan`,
        );
      }

      const fileSize = file.fileBytes.byteLength;
      if (queuedBytes + fileSize > knowledgeBaseLimit) {
        throw new Error("Knowledge base limit reached for this agent.");
      }
      queuedBytes += fileSize;

      const uploadId = await ctx.runMutation(
        internal.knowledgeBaseImages.internalCreateKbImageUpload,
        {
          clientId: file.clientId,
          orgId: auth.orgId,
          userId: auth.userId,
          agentId: args.agentId,
          collectionName,
          fileName,
          mimeType: file.mimeType,
          fileSize,
        },
      );

      await ctx.runMutation(internal.knowledgeBaseImages.internalSetKbImageUploading, {
        uploadId,
      });

      await cfUploadPool.enqueueAction(
        ctx,
        internal.workpool.kbImageUploadWorker,
        {
          uploadId,
          clientId: file.clientId,
          orgId: auth.orgId,
          userId: auth.userId,
          agentId: args.agentId,
          collectionName,
          fileName,
          mimeType: file.mimeType,
          fileBytes: file.fileBytes,
        },
        {
          onComplete: internal.knowledgeBaseImages.kbImageUploadComplete,
          context: { uploadId, clientId: file.clientId },
          retry: true,
        },
      );
    }

    return { queued: args.files.length };
  },
});

export const enqueueImageDelete = action({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runAction(api.media.attachments.enqueueDelete, {
      clientId: args.clientId,
    });
  },
});

/** Returns ready media assets for a specific collection. */
export const internalListReadyByCollection = internalQuery({
  args: { agentId: v.id("agents"), collectionName: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();
    return rows
      .filter((r) => r.status === "ready" && r.collectionName === args.collectionName)
      .map((r) => ({
        clientId: r.clientId,
        filename: r.filename,
        publicUrl: r.publicUrl ?? "",
        mediaType: r.mediaType,
      }));
  },
});

/** Map public URLs to mediaUploads clientIds for playground message rewriting. */
export const internalResolvePublicUrlsToClientIds = internalQuery({
  args: {
    agentId: v.id("agents"),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.urls.length === 0) return {} as Record<string, string>;

    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const byUrl: Record<string, string> = {};
    for (const row of rows) {
      if (row.status === "ready" && row.publicUrl) {
        byUrl[row.publicUrl] = row.clientId;
      }
    }

    const resolved: Record<string, string> = {};
    for (const url of args.urls) {
      const clientId = byUrl[url];
      if (clientId) resolved[url] = clientId;
    }
    return resolved;
  },
});

/** Map mediaUploads clientIds to public URLs (inbox channel send). */
export const internalResolveClientIdsToPublicUrls = internalQuery({
  args: {
    agentId: v.id("agents"),
    clientIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.clientIds.length === 0) return [] as string[];

    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const byClientId = new Map<string, string>();
    for (const row of rows) {
      if (row.status === "ready") {
        byClientId.set(row.clientId, requireReadyMediaPublicUrl(row));
      }
    }

    return args.clientIds
      .map((id) => byClientId.get(id))
      .filter((url): url is string => url !== undefined);
  },
});

export const internalResolveClientIdsToMediaItems = internalQuery({
  args: {
    agentId: v.id("agents"),
    clientIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.clientIds.length === 0) {
      return [] as Array<{ url: string; mediaType: string; filename?: string }>;
    }

    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const byClientId = new Map<string, { url: string; mediaType: string; filename?: string }>();
    for (const row of rows) {
      if (row.status === "ready") {
        byClientId.set(row.clientId, {
          url: requireReadyMediaPublicUrl(row),
          mediaType: row.mediaType,
          filename: row.filename,
        });
      }
    }

    return args.clientIds
      .map((id) => byClientId.get(id))
      .filter((item): item is { url: string; mediaType: string; filename?: string } =>
        item !== undefined,
      );
  },
});

/** Playground UI: resolve [MEDIA:clientId] markers to display URLs. */
export const listReadyMediaByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (agent === null || agent.orgId !== orgId) {
      return {} as Record<string, { url: string; mediaType: string }>;
    }

    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const byClientId: Record<string, { url: string; mediaType: string }> = {};
    for (const row of rows) {
      if (row.status === "ready" && row.publicUrl) {
        byClientId[row.clientId] = {
          url: row.publicUrl,
          mediaType: row.mediaType,
        };
      }
    }
    return byClientId;
  },
});

/** Returns distinct collection names for this agent's uploads (injected into system prompt). */
export const internalListCollectionNames = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const names = new Set(
      rows
        .filter((r) => r.status === "ready" && r.collectionName)
        .map((r) => r.collectionName!),
    );
    return [...names].sort();
  },
});
