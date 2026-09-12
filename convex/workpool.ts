"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { Workpool } from "@convex-dev/workpool";
import { deleteFromCFOrThrow } from "./cloudflare";
import {
  r2,
  generateFilePreviewKey,
  generateKnowledgeBaseImageKey,
  generateWorkflowMediaKey,
  getPublicMediaUrl,
  knowledgeFileMimeType,
} from "./media/r2";
import {
  assertWorkspaceCanCreateExternalState,
  createWorkspaceExternalState,
} from "./teamDeletion/externalGuard";
import {
  addKnowledgeEntryToRag,
  deleteKnowledgeEntryFromRag,
  knowledgeEntryPayload,
} from "./rag/ingest";
import { describeImageForKnowledgeBase, isImageFileName } from "./rag/imageText";

// ─── Workpool instances ───────────────────────────────────

export const cfUploadPool = new Workpool(components.cfUploadWorkpool, {
  maxParallelism: 5,
});

export const cfDeletePool = new Workpool(components.cfDeleteWorkpool, {
  maxParallelism: 5,
});

export const webScraperPool = new Workpool(components.webScraperWorkpool, {
  maxParallelism: 1,
});

// ─── CF Upload Worker ─────────────────────────────────────

export const cfUploadWorker = internalAction({
  args: {
    entryId: v.string(),
    entryType: v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("qa"),
    ),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileBytes: v.optional(v.bytes()),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    agentId: v.string(),
    orgId: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertWorkspaceCanCreateExternalState(ctx, args.orgId ?? "");

    console.log("[convex-rag] uploadWorker", {
      entryType: args.entryType,
      entryId: args.entryId,
      agentId: args.agentId,
      fileName: args.fileName ?? null,
      title: args.title ?? null,
      extractedChars: args.extractedText?.length ?? 0,
    });

    const needsVision = args.entryType === "file"
      && !args.extractedText?.trim()
      && isImageFileName(args.fileName ?? "");
    console.log("[convex-rag] uploadWorker rag", { needsVision });
    const extractedText = needsVision
      ? await describeImageForKnowledgeBase(args.fileName!, args.fileBytes!)
      : args.extractedText;

    let previewR2Key: string | undefined;
    if (args.entryType === "file" && args.fileBytes && args.fileName && args.orgId) {
      const storedPreviewR2Key = generateFilePreviewKey(
        args.orgId,
        args.agentId,
        args.entryId,
        args.fileName,
      );
      previewR2Key = storedPreviewR2Key;
      const previewBlob = new Blob([args.fileBytes], {
        type: knowledgeFileMimeType(args.fileName),
      });
      await createWorkspaceExternalState(
        ctx,
        args.orgId,
        "r2",
        async () => {
          await r2.store(ctx, previewBlob, { key: storedPreviewR2Key });
          return storedPreviewR2Key;
        },
        async (createdKey) => await r2.deleteObject(ctx, createdKey),
      );
      await ctx.runMutation(internal.knowledgeBase.internalSetFilePreview, {
        entryId: args.entryId as never,
        extractedText,
        previewR2Key,
      });
    }

    const rag = await addKnowledgeEntryToRag(ctx, {
      agentId: args.agentId,
      entryType: args.entryType,
      entryId: args.entryId,
      ...knowledgeEntryPayload({ ...args, extractedText }),
    });
    return { ...rag, extractedText, previewR2Key };
  },
});

// ─── KB Image Upload Worker ─────────────────────────────────

export const kbImageUploadWorker = internalAction({
  args: {
    uploadId: v.id("mediaUploads"),
    clientId: v.string(),
    orgId: v.string(),
    userId: v.string(),
    agentId: v.id("agents"),
    collectionName: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    fileBytes: v.bytes(),
  },
  handler: async (ctx, args) => {
    await assertWorkspaceCanCreateExternalState(ctx, args.orgId);
    const key = generateKnowledgeBaseImageKey(
      args.orgId,
      args.agentId,
      args.collectionName,
      args.fileName,
    );

    const blob = new Blob([args.fileBytes], { type: args.mimeType });
    await createWorkspaceExternalState(
      ctx,
      args.orgId,
      "r2",
      async () => {
        await r2.store(ctx, blob, { key });
        return key;
      },
      async (createdKey) => await r2.deleteObject(ctx, createdKey),
    );

    return {
      r2Key: key,
      fileSize: args.fileBytes.byteLength,
      publicUrl: getPublicMediaUrl(key),
    };
  },
});

export const workflowMediaUploadWorker = internalAction({
  args: {
    uploadId: v.id("mediaUploads"),
    clientId: v.string(),
    orgId: v.string(),
    userId: v.string(),
    agentId: v.id("agents"),
    workflowNodeId: v.id("workflowNodes"),
    fileName: v.string(),
    mimeType: v.string(),
    fileBytes: v.bytes(),
  },
  handler: async (ctx, args) => {
    await assertWorkspaceCanCreateExternalState(ctx, args.orgId);
    const key = generateWorkflowMediaKey(
      args.orgId,
      args.agentId,
      args.workflowNodeId,
      args.clientId,
      args.fileName,
    );

    const blob = new Blob([args.fileBytes], { type: args.mimeType });
    await createWorkspaceExternalState(
      ctx,
      args.orgId,
      "r2",
      async () => {
        await r2.store(ctx, blob, { key });
        return key;
      },
      async (createdKey) => await r2.deleteObject(ctx, createdKey),
    );

    return {
      r2Key: key,
      fileSize: args.fileBytes.byteLength,
      publicUrl: getPublicMediaUrl(key),
    };
  },
});

// ─── CF Delete Worker ─────────────────────────────────────

export const cfDeleteWorker = internalAction({
  args: {
    cfItemId: v.optional(v.string()),
    ragEntryId: v.optional(v.string()),
    r2Key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("[convex-rag] deleteWorker", {
      cfItemId: args.cfItemId ?? null,
      ragEntryId: args.ragEntryId ?? null,
      r2Key: args.r2Key ?? null,
    });
    if (args.cfItemId) {
      await deleteFromCFOrThrow(args.cfItemId);
    }
    if (args.ragEntryId) {
      await deleteKnowledgeEntryFromRag(ctx, args.ragEntryId);
    }
    if (args.r2Key) await r2.deleteObject(ctx, args.r2Key);
    return { deleted: true };
  },
});

// ─── Media Delete Worker ────────────────────────────────────

export const mediaDeleteWorker = internalAction({
  args: {
    r2Key: v.string(),
  },
  handler: async (ctx, args) => {
    await r2.deleteObject(ctx, args.r2Key);
    return { deleted: true };
  },
});
