"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { cfUploadPool, cfDeletePool } from "./workpool";
import Cloudflare from "cloudflare";
import { r2 } from "./media/r2";

const cfAccountId = process.env.CF_ACCOUNT_ID!;
const cfInstanceName = process.env.CF_AI_SEARCH_NAME!;
const cfNamespace = process.env.CF_AI_SEARCH_NAMESPACE ?? "default";

const client = new Cloudflare({
  apiToken: process.env.CF_AI_SEARCH_TOKEN!,
});

export async function uploadToCF(
  content: File,
  metadata: { agent_id: string, org_id: string, user_id: string },
): Promise<string> {
  const response = await client.aiSearch.namespaces.instances.items.upload(
    cfNamespace,
    cfInstanceName,
    {
      account_id: cfAccountId,
      file: {
        file: content,
        metadata: JSON.stringify(metadata),
      },
    },
  );

  return response.id;
}

export async function deleteFromCFOrThrow(cfItemId: string): Promise<void> {
  try {
    await client.aiSearch.namespaces.instances.items.delete(
      cfNamespace,
      cfInstanceName,
      cfItemId,
      { account_id: cfAccountId },
    );
  } catch (error) {
    if (isCloudflareNotFoundError(error)) return;
    throw error;
  }
}

export const internalDeleteLegacyQaIndex = internalAction({
  args: { cfItemId: v.string() },
  handler: async (ctx, args) => {
    await cfDeletePool.enqueueAction(ctx, internal.workpool.cfDeleteWorker, {
      cfItemId: args.cfItemId,
    }, {
      onComplete: internal.knowledgeBase.cfDeleteComplete,
      context: { entryId: args.cfItemId, entryType: "qaIndex" },
      retry: true,
    });
  },
});

export function isCloudflareNotFoundError(error: unknown): boolean {
  if (error instanceof Cloudflare.NotFoundError) return true;
  const status = (error as { status?: number; statusCode?: number })?.status ??
    (error as { statusCode?: number })?.statusCode;
  return status === 404;
}

export async function deleteFromCF(cfItemId: string): Promise<void> {
  try {
    await deleteFromCFOrThrow(cfItemId);
  } catch (err) {
    console.warn(`Cloudflare delete warning:`, err);
  }
}

// ─── Update actions ────────────────────────────────────────

export const updateTextEntry = action({
  args: {
    entryId: v.id("textEntries"),
    title: v.string(),
    content: v.string(),
    cfItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("Title and content are required");

    const entry = await ctx.runQuery(internal.knowledgeBase.internalGetTextEntry, {
      entryId: args.entryId,
    });
    if (!entry) throw new Error("Entry not found");

    const fileSize = new Blob([title + content]).size;
    await ctx.runMutation(internal.knowledgeBase.internalPatchTextEntry, {
      entryId: args.entryId,
      title,
      content,
      fileSize,
    });
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId: args.entryId,
      status: "queued",
    });

    await cfUploadPool.enqueueAction(ctx, internal.workpool.cfUploadWorker, {
      entryId: args.entryId,
      entryType: "text",
      title,
      content,
      agentId: entry.agentId,
      orgId: auth.orgId,
      userId: auth.userId,
    }, {
      onComplete: internal.knowledgeBase.cfUploadComplete,
      context: { entryId: args.entryId, entryType: "text" },
      retry: true,
    });
  },
});

export const updateFileEntry = action({
  args: {
    entryId: v.id("fileEntries"),
    title: v.optional(v.string()),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const fileName = args.fileName.trim();
    if (!fileName) throw new Error("File name is required");

    await ctx.runMutation(internal.knowledgeBase.internalPatchFileEntry, {
      entryId: args.entryId,
      title: args.title,
      fileName,
    });
  },
});

// ─── Delete actions ────────────────────────────────────────

export const deleteTextEntry = action({
  args: { entryId: v.id("textEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.runQuery(internal.knowledgeBase.internalGetTextEntry, {
      entryId: args.entryId,
    });
    if (!entry) throw new Error("Entry not found");

    if (entry.cfItemId) {
      await deleteFromCF(entry.cfItemId);
    }
    await ctx.runMutation(internal.knowledgeBase.internalRemoveTextEntry, {
      entryId: args.entryId,
    });
  },
});

export const deleteFileEntry = action({
  args: { entryId: v.id("fileEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.runQuery(internal.knowledgeBase.internalGetFileEntry, {
      entryId: args.entryId,
    });
    if (!entry) throw new Error("Entry not found");

    if (entry.cfItemId) {
      await deleteFromCF(entry.cfItemId);
    }

    await ctx.runMutation(internal.knowledgeBase.internalRemoveFileEntry, {
      entryId: args.entryId,
    });
  },
});

export const deleteWebEntry = action({
  args: { entryId: v.id("webEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.runQuery(internal.knowledgeBase.internalGetWebEntry, {
      entryId: args.entryId,
    });
    if (!entry) throw new Error("Entry not found");

    if (entry.cfItemId) {
      await deleteFromCF(entry.cfItemId);
    }
    if (entry.markdownR2Key) await r2.deleteObject(ctx, entry.markdownR2Key);

    await ctx.runMutation(internal.knowledgeBase.internalRemoveWebEntry, {
      entryId: args.entryId,
    });
  },
});

export const deleteWebEntryGroup = action({
  args: { parentId: v.id("webEntries") },
  handler: async (ctx, args) => {
    const parent = await ctx.runQuery(internal.knowledgeBase.internalGetWebEntry, {
      entryId: args.parentId,
    });
    if (!parent) throw new Error("Parent entry not found");

    const children = await ctx.runQuery(internal.knowledgeBase.internalGetWebEntriesByParentId, {
      parentId: args.parentId,
    });

    const allEntries = [parent, ...children];

    // Mark all as deleting and enqueue CF deletion for each
    for (const entry of allEntries) {
      await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
        entryId: entry._id,
        status: "deleting",
      });

      await cfDeletePool.enqueueAction(ctx, internal.workpool.cfDeleteWorker, {
        cfItemId: entry.cfItemId,
        ragEntryId: entry.ragEntryId,
        r2Key: entry.markdownR2Key,
      }, {
        onComplete: internal.knowledgeBase.cfDeleteComplete,
        context: { entryId: entry._id, entryType: "web" },
      });
    }
  },
});

// ─── Async upload/delete (workpool-based) ─────────────────

export const enqueueTextUpload = action({
  args: {
    agentId: v.id("agents"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ entryId: string }> => {
    const auth = await getAuthContext(ctx);
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("Title and content are required");
    console.log("[convex-rag] enqueueTextUpload", {
      agentId: args.agentId,
      title,
      contentChars: content.length,
    });

    const fileSize = new Blob([title + content]).size;
    const entryId = await ctx.runMutation(internal.knowledgeBase.internalStoreTextEntry, {
      agentId: args.agentId,
      title,
      content,
      fileSize,
      userId: auth.userId,
      orgId: auth.orgId,
    });
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId,
      status: "queued",
    });

    await cfUploadPool.enqueueAction(ctx, internal.workpool.cfUploadWorker, {
      entryId,
      entryType: "text",
      title,
      content,
      agentId: args.agentId,
      orgId: auth.orgId,
      userId: auth.userId,
    }, {
      onComplete: internal.knowledgeBase.cfUploadComplete,
      context: { entryId, entryType: "text" },
      retry: true
    });

    return { entryId };
  },
});

export const enqueueFileUpload = action({
  args: {
    agentId: v.id("agents"),
    fileBytes: v.bytes(),
    fileName: v.string(),
    title: v.optional(v.string()),
    extractedText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ entryId: string; fileSize: number }> => {
    const auth = await getAuthContext(ctx);
    const fileName = args.fileName.trim();
    if (!fileName) throw new Error("File name is required");
    console.log("[convex-rag] enqueueFileUpload", {
      agentId: args.agentId,
      fileName,
      byteLength: args.fileBytes.byteLength,
      extractedChars: args.extractedText?.length ?? 0,
    });
    const MAX_FILE_SIZE = 4 * 1024 * 1024;
    if (args.fileBytes.byteLength > MAX_FILE_SIZE) {
      throw new Error("File too big. Limit is 4 MB per file.");
    }

    const fileContent = new File([args.fileBytes], fileName);
    const fileSize = fileContent.size;
    const entryId = await ctx.runMutation(internal.knowledgeBase.internalStoreFileEntry, {
      agentId: args.agentId,
      title: args.title,
      fileName,
      fileSize,
      extractedText: args.extractedText,
      userId: auth.userId,
      orgId: auth.orgId,
    });
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId,
      status: "queued",
    });

    await cfUploadPool.enqueueAction(ctx, internal.workpool.cfUploadWorker, {
      entryId,
      entryType: "file",
      fileName,
      fileBytes: args.fileBytes,
      extractedText: args.extractedText,
      agentId: args.agentId,
      orgId: auth.orgId,
      userId: auth.userId,
    }, {
      onComplete: internal.knowledgeBase.cfUploadComplete,
      context: { entryId, entryType: "file" },
      retry: true
    });

    return { entryId, fileSize };
  },
});

export const enqueueDelete = action({
  args: {
    entryId: v.union(
      v.id("textEntries"),
      v.id("fileEntries"),
      v.id("webEntries"),
      v.id("qaEntries"),
    ),
    entryType: v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("web"),
      v.literal("qa"),
    ),
    cfItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const webEntry = args.entryType === "web"
      ? await ctx.runQuery(internal.knowledgeBase.internalGetWebEntry, {
        entryId: args.entryId as never,
      })
      : null;
    const textEntry = args.entryType === "text"
      ? await ctx.runQuery(internal.knowledgeBase.internalGetTextEntry, {
        entryId: args.entryId as never,
      })
      : null;
    const fileEntry = args.entryType === "file"
      ? await ctx.runQuery(internal.knowledgeBase.internalGetFileEntry, {
        entryId: args.entryId as never,
      })
      : null;
    const qaEntry = args.entryType === "qa"
      ? await ctx.runQuery(internal.knowledgeBase.internalGetQAEntry, {
        entryId: args.entryId as never,
      })
      : null;
    const ragEntryId = webEntry?.ragEntryId
      ?? textEntry?.ragEntryId
      ?? fileEntry?.ragEntryId
      ?? qaEntry?.ragEntryId;

    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId: args.entryId,
      status: "deleting",
    });

    await cfDeletePool.enqueueAction(ctx, internal.workpool.cfDeleteWorker, {
      cfItemId: args.cfItemId,
      ragEntryId,
      r2Key: webEntry?.markdownR2Key ?? fileEntry?.previewR2Key,
    }, {
      onComplete: internal.knowledgeBase.cfDeleteComplete,
      context: { entryId: args.entryId, entryType: args.entryType },
    });
  },
});

export const internalSearch = internalAction({
  args: {
    agentId: v.id("agents"),
    query: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await client.aiSearch.namespaces.instances.search(
      cfNamespace,
      cfInstanceName,
      {
        account_id: cfAccountId,
        query: args.query,
        ai_search_options: {
          retrieval: {
            filters: {
              agent_id: args.agentId,
            },
            match_threshold: 0.4,
            max_num_results: 5,
          },
          reranking: {
            enabled: true,
            model: "@cf/baai/bge-reranker-base",
          },
        },
      },
    );

    const results = (response.chunks ?? []).map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      score: chunk.score,
      type: chunk.type,
      item: chunk.item,
    }));

    return results;
  },
});
