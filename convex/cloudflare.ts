"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { cfUploadPool, cfDeletePool, webScraperPool, linkDiscovererPool } from "./workpool";
import Cloudflare from "cloudflare";
import { createWorkspaceExternalState } from "./teamDeletion/externalGuard";

const cfAccountId = process.env.CF_ACCOUNT_ID!;
const cfInstanceName = process.env.CF_AI_SEARCH_NAME!;
const cfNamespace = process.env.CF_AI_SEARCH_NAMESPACE ?? "default";

const client = new Cloudflare({
  apiToken: process.env.CF_AI_SEARCH_TOKEN!,
});

const brClient = new Cloudflare({
  apiToken: process.env.CF_BROWSER_RUN_TOKEN!,
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

async function uploadWorkspaceFileToCF(
  ctx: ActionCtx,
  content: File,
  metadata: { agent_id: string; org_id: string; user_id: string },
): Promise<string> {
  return await createWorkspaceExternalState(
    ctx,
    metadata.org_id,
    "cloudflare",
    async () => await uploadToCF(content, metadata),
    deleteFromCFOrThrow,
  );
}

// ─── Browser rendering helpers ───────────────────────────



export async function scrapeLinks(url: string): Promise<string[]> {
  const result = await brClient.browserRendering.links.create({
    account_id: cfAccountId,
    excludeExternalLinks: true,
    url,
  });

  if (!result) {
    throw new Error(`Browser rendering /links failed: ${JSON.stringify(result)}`);
  }

  return result;
}

export async function scrapeMarkdown(url: string): Promise<string> {
  const result = await brClient.browserRendering.markdown.create({
    account_id: cfAccountId,
    url,
  });

  if (!result) {
    throw new Error(`Browser rendering /markdown failed: ${JSON.stringify(result)}`);
  }

  return result;
}

// ─── Upload actions (create) ───────────────────────────────

export const uploadTextEntry = action({
  args: {
    agentId: v.id("agents"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("Title and content are required");

    const storageUsed = await ctx.runQuery(internal.knowledgeBase.internalGetAgentStorageUsed, {
      agentId: args.agentId,
    });

    const fileContent = new File([`${title}\n\n${content}`], `${title}.txt`, { type: "text/plain" });
    const fileSize = fileContent.size;

    const MAX_TOTAL_SIZE = 4 * 1024 * 1024;
    if (storageUsed + fileSize > MAX_TOTAL_SIZE) {
      throw new Error("Storage limit exceeded. Limit is 4 MB total per agent.");
    }

    const cfItemId = await uploadWorkspaceFileToCF(ctx, fileContent, { agent_id: args.agentId, org_id: auth.orgId, user_id: auth.userId });

    await ctx.runMutation(internal.knowledgeBase.internalStoreTextEntry, {
      agentId: args.agentId,
      title,
      content,
      fileSize,
      cfItemId,
      userId: auth.userId,
      orgId: auth.orgId,
    });

    return { cfItemId };
  },
});

export const uploadFileEntry = action({
  args: {
    agentId: v.id("agents"),
    fileBytes: v.bytes(),
    fileName: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const fileName = args.fileName.trim();
    if (!fileName) throw new Error("File name is required");

    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB per file
    const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4 MB total

    if (args.fileBytes.byteLength > MAX_FILE_SIZE) {
      throw new Error("File too big. Limit is 4 MB per file.");
    }

    const storageUsed = await ctx.runQuery(internal.knowledgeBase.internalGetAgentStorageUsed, {
      agentId: args.agentId,
    });

    const fileContent = new File([args.fileBytes], fileName);
    const fileSize = fileContent.size;

    if (storageUsed + fileSize > MAX_TOTAL_SIZE) {
      throw new Error("Storage limit exceeded. Limit is 4 MB total per agent.");
    }

    const cfItemId = await uploadWorkspaceFileToCF(ctx, fileContent, { agent_id: args.agentId, org_id: auth.orgId, user_id: auth.userId });

    await ctx.runMutation(internal.knowledgeBase.internalStoreFileEntry, {
      agentId: args.agentId,
      title: args.title,
      fileName,
      fileSize,
      cfItemId,
      userId: auth.userId,
      orgId: auth.orgId,
    });

    return { cfItemId, fileSize };
  },
});

// ─── Link preview (step 1: discover links only) ──────────────

export const scrapePreviewLinks = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args) => {
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");

    let links: string[] = [];
    try {
      links = await scrapeLinks(url);
    } catch (err) {
      console.warn(`Failed to scrape links from ${url}:`, err);
    }
    const uniqueLinks = [...new Set([url, ...links])].slice(0, 20);

    return { links: uniqueLinks, sourceUrl: url };
  },
});

// ─── Process single web URL (step 2: scrape markdown + index) ──

export const processWebUrl = action({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
    parentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");

    const markdown = await scrapeMarkdown(url);
    const uid = Math.random().toString(36).slice(2, 10);
    const safeName = url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const markdownBlob = new File([markdown], `${safeName}_${uid}.md`, { type: "text/markdown" });
    const fileSize = markdownBlob.size;

    const MAX_TOTAL_SIZE = 4 * 1024 * 1024;
    const storageUsed = await ctx.runQuery(internal.knowledgeBase.internalGetAgentStorageUsed, {
      agentId: args.agentId,
    });
    if (storageUsed + fileSize > MAX_TOTAL_SIZE) {
      throw new Error("Storage limit exceeded. Limit is 4 MB total per agent.");
    }

    const cfItemId = await uploadWorkspaceFileToCF(ctx, markdownBlob, { agent_id: args.agentId, org_id: auth.orgId, user_id: auth.userId });

    await ctx.runMutation(
      internal.knowledgeBase.internalStoreWebEntryWithContent,
      {
        agentId: args.agentId,
        url,
        markdown,
        fileSize,
        cfItemId,
        parentUrl: args.parentUrl,
        userId: auth.userId,
        orgId: auth.orgId,
      },
    );

    return { url, cfItemId, fileSize };
  },
});

export const uploadWebEntry = action({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const MAX_LINKS = 20;
    const CONCURRENCY = 5;
    const auth = await getAuthContext(ctx);
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");

    const MAX_TOTAL_SIZE = 4 * 1024 * 1024;
    const storageUsed = await ctx.runQuery(internal.knowledgeBase.internalGetAgentStorageUsed, {
      agentId: args.agentId,
    });
    if (storageUsed >= MAX_TOTAL_SIZE) {
      throw new Error("Storage limit exceeded. Limit is 4 MB total per agent.");
    }

    // 1. Scrape all links from the URL
    let links: string[] = [];
    try {
      links = await scrapeLinks(url);
    } catch (err) {
      console.warn(`Failed to scrape links from ${url}:`, err);
    }
    const uniqueLinks = [...new Set([url, ...links])].slice(0, MAX_LINKS);

    const results: Array<{ url: string; cfItemId?: string }> = [];

    // 2. Process in concurrent batches
    for (let i = 0; i < uniqueLinks.length; i += CONCURRENCY) {
      const batch = uniqueLinks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (linkUrl) => {
          try {
            // Scrape markdown for this URL
            const markdown = await scrapeMarkdown(linkUrl);

            // Upload markdown to CF AI Search — unique suffix prevents collisions
            // between URLs that share the same sanitized 50-char prefix.
            const uid = Math.random().toString(36).slice(2, 10);
            const safeName = linkUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
            const markdownBlob = new File([markdown], `${safeName}_${uid}.md`, { type: "text/markdown" });
            const cfItemId = await uploadWorkspaceFileToCF(ctx, markdownBlob, { agent_id: args.agentId, org_id: auth.orgId, user_id: auth.userId });

            // Store entry with markdown in Convex storage
            await ctx.runMutation(
              internal.knowledgeBase.internalStoreWebEntryWithContent,
              {
                agentId: args.agentId,
                url: linkUrl,
                markdown,
                fileSize: markdownBlob.size,
                cfItemId,
                parentUrl: linkUrl === url ? undefined : url,
                userId: auth.userId,
                orgId: auth.orgId,
              },
            );

            return { url: linkUrl, cfItemId };
          } catch (err) {
            console.warn(`Failed to process ${linkUrl}:`, err);
            return { url: linkUrl };
          }
        }),
      );
      results.push(...batchResults);
    }

    return {
      totalScraped: results.filter((r) => r.cfItemId).length,
      totalLinks: uniqueLinks.length,
      results,
    };
  },
});

export const uploadQAEntry = action({
  args: {
    agentId: v.id("agents"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const question = args.question.trim();
    const answer = args.answer.trim();
    if (!question || !answer) throw new Error("Question and answer are required");

    const MAX_TOTAL_SIZE = 4 * 1024 * 1024;
    const storageUsed = await ctx.runQuery(internal.knowledgeBase.internalGetAgentStorageUsed, {
      agentId: args.agentId,
    });

    const safeName = question.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const fileContent = new File([`Q: ${question}\nA: ${answer}`], `${safeName}.txt`, { type: "text/plain" });
    const fileSize = fileContent.size;

    if (storageUsed + fileSize > MAX_TOTAL_SIZE) {
      throw new Error("Storage limit exceeded. Limit is 4 MB total per agent.");
    }

    const cfItemId = await uploadWorkspaceFileToCF(ctx, fileContent, { agent_id: args.agentId, org_id: auth.orgId, user_id: auth.userId });

    await ctx.runMutation(internal.knowledgeBase.internalStoreQAEntry, {
      agentId: args.agentId,
      question,
      answer,
      fileSize,
      cfItemId,
      userId: auth.userId,
      orgId: auth.orgId,
    });

    return { cfItemId };
  },
});

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

    if (args.cfItemId) {
      await deleteFromCF(args.cfItemId);
    }

    const fileContent = new File([`${title}\n\n${content}`], `${title}.txt`, { type: "text/plain" });
    const fileSize = fileContent.size;
    const newCfItemId = await uploadWorkspaceFileToCF(ctx, fileContent, { agent_id: "", org_id: auth.orgId, user_id: auth.userId });

    await ctx.runMutation(internal.knowledgeBase.internalPatchTextEntry, {
      entryId: args.entryId,
      title,
      content,
      fileSize,
      cfItemId: newCfItemId,
    });

    return { cfItemId: newCfItemId };
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

export const updateWebEntry = action({
  args: {
    entryId: v.id("webEntries"),
    url: v.string(),
    cfItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");

    if (args.cfItemId) {
      await deleteFromCF(args.cfItemId);
    }

    const auth = await getAuthContext(ctx);
    const safeName = url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const fileContent = new File([url], `${safeName}.txt`, { type: "text/plain" });
    const fileSize = fileContent.size;
    const newCfItemId = await uploadWorkspaceFileToCF(ctx, fileContent, { agent_id: "", org_id: auth.orgId, user_id: auth.userId });

    await ctx.runMutation(internal.knowledgeBase.internalPatchWebEntry, {
      entryId: args.entryId,
      url,
      fileSize,
      cfItemId: newCfItemId,
    });

    return { cfItemId: newCfItemId };
  },
});

export const updateQAEntry = action({
  args: {
    entryId: v.id("qaEntries"),
    question: v.string(),
    answer: v.string(),
    cfItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const question = args.question.trim();
    const answer = args.answer.trim();
    if (!question || !answer) throw new Error("Question and answer are required");

    if (args.cfItemId) {
      await deleteFromCF(args.cfItemId);
    }
    const auth = await getAuthContext(ctx);
    const safeName = question.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const fileContent = new File([`Q: ${question}\nA: ${answer}`], `${safeName}.txt`, { type: "text/plain" });
    const fileSize = fileContent.size;
    const newCfItemId = await uploadWorkspaceFileToCF(ctx, fileContent, { agent_id: "", org_id: auth.orgId, user_id: auth.userId });

    await ctx.runMutation(internal.knowledgeBase.internalPatchQAEntry, {
      entryId: args.entryId,
      question,
      answer,
      fileSize,
      cfItemId: newCfItemId,
    });

    return { cfItemId: newCfItemId };
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
      }, {
        onComplete: internal.knowledgeBase.cfDeleteComplete,
        context: { entryId: entry._id, entryType: "web" },
      });
    }
  },
});

export const deleteQAEntry = action({
  args: { entryId: v.id("qaEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.runQuery(internal.knowledgeBase.internalGetQAEntry, { entryId: args.entryId });
    if (!entry) throw new Error("Entry not found");
    if (entry.cfItemId) {
      await deleteFromCF(entry.cfItemId);
    }
    await ctx.runMutation(internal.knowledgeBase.internalRemoveQAEntry, { entryId: args.entryId });
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
  },
  handler: async (ctx, args): Promise<{ entryId: string; fileSize: number }> => {
    console.log('enqueueing file upload', args);
    const auth = await getAuthContext(ctx);
    const fileName = args.fileName.trim();
    if (!fileName) throw new Error("File name is required");

    console.log('filename', fileName)
    console.log('args.fileBytes', args.fileBytes)
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

export const enqueueQAUpload = action({
  args: {
    agentId: v.id("agents"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args): Promise<{ entryId: string }> => {
    const auth = await getAuthContext(ctx);
    const question = args.question.trim();
    const answer = args.answer.trim();
    if (!question || !answer) throw new Error("Question and answer are required");

    const fileSize = new Blob([question + answer]).size;
    const entryId = await ctx.runMutation(internal.knowledgeBase.internalStoreQAEntry, {
      agentId: args.agentId,
      question,
      answer,
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
      entryType: "qa",
      question,
      answer,
      agentId: args.agentId,
      orgId: auth.orgId,
      userId: auth.userId,
    }, {
      onComplete: internal.knowledgeBase.cfUploadComplete,
      context: { entryId, entryType: "qa" },
      retry: true
    });

    return { entryId };
  },
});

export const enqueueWebScrape = action({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
    parentUrl: v.optional(v.string()),
    parentId: v.optional(v.id("webEntries")),
    userId: v.optional(v.string()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ entryId: string; url: string }> => {
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");

    // When called from scheduler, userId/orgId are passed directly (no auth context available)
    let userId = args.userId;
    let orgId = args.orgId ?? null;
    if (!userId) {
      const auth = await getAuthContext(ctx);
      userId = auth.userId;
      orgId = auth.orgId;
    }

    const fileSize = new Blob([url]).size;
    const entryId = await ctx.runMutation(internal.knowledgeBase.internalStoreWebEntry, {
      agentId: args.agentId,
      url,
      fileSize,
      parentUrl: args.parentUrl,
      parentId: args.parentId,
      userId: userId!,
      orgId: orgId!,
    });
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId,
      status: "gettingMarkdown",
    });

    await webScraperPool.enqueueAction(ctx, internal.workpool.webScraperWorker, {
      entryId,
      url,
      parentUrl: args.parentUrl,
      agentId: args.agentId,
      orgId: orgId ?? "",
      userId: userId!,
    }, {
      onComplete: internal.knowledgeBase.webScraperComplete,
      context: { entryId },
      retry: true
    });

    return { entryId, url };
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
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId: args.entryId,
      status: "deleting",
    });

    await cfDeletePool.enqueueAction(ctx, internal.workpool.cfDeleteWorker, {
      cfItemId: args.cfItemId,
    }, {
      onComplete: internal.knowledgeBase.cfDeleteComplete,
      context: { entryId: args.entryId, entryType: args.entryType },
    });
  },
});

export const enqueueLinkDiscovery = action({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
  },
  handler: async (ctx, args): Promise<{ entryId: string }> => {
    const auth = await getAuthContext(ctx);
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");

    const alreadyAdded = await ctx.runQuery(internal.knowledgeBase.internalHasParentWebUrl, {
      agentId: args.agentId,
      url,
    });
    if (alreadyAdded) {
      throw new Error("This URL has already been added");
    }

    const entryId = await ctx.runMutation(internal.knowledgeBase.internalStoreWebEntry, {
      agentId: args.agentId,
      url,
      fileSize: new Blob([url]).size,
      userId: auth.userId,
      orgId: auth.orgId,
    });
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId,
      status: "gettingLinks",
    });

    await linkDiscovererPool.enqueueAction(ctx, internal.workpool.linkDiscovererWorker, {
      entryId,
      url,
    }, {
      onComplete: internal.knowledgeBase.linkDiscovererComplete,
      context: { entryId, agentId: args.agentId, parentUrl: url, userId: auth.userId, orgId: auth.orgId },
      retry: true
    });

    return { entryId };
  },
});
// ─── Internal search (used by agent tool) ──────────────────

export const getIndexingStatus = action({
  args: {},
  handler: async (_ctx, _args) => {
    try {
      const stats = await client.aiSearch.namespaces.instances.stats(
        cfNamespace,
        cfInstanceName,
        { account_id: cfAccountId },
      );
      const queued = stats.queued ?? 0;
      const running = stats.running ?? 0;
      const completed = stats.completed ?? 0;
      return {
        isIndexing: queued + running > 0,
        queued,
        running,
        completed,
      };
    } catch (err) {
      console.warn("Failed to fetch Cloudflare stats:", err);
      return { isIndexing: false, queued: 0, running: 0, completed: 0 };
    }
  },
});

// ─── Internal search (used by agent tool) ──────────────────

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
            max_num_results: 5,
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
