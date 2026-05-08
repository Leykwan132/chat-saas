"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { Workpool } from "@convex-dev/workpool";
import { uploadToCF, deleteFromCF, scrapeMarkdown, scrapeLinks } from "./cloudflare";

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

export const linkDiscovererPool = new Workpool(components.linkDiscovererWorkpool, {
  maxParallelism: 2,
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
    agentId: v.optional(v.string()),
    orgId: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let fileContent: File;
    let fileSize: number;

    // Use the Convex entryId as a stable unique suffix to prevent CF filename collisions
    const uid = args.entryId.slice(-8);

    switch (args.entryType) {
      case "text": {
        const title = args.title?.trim() ?? "";
        const content = args.content?.trim() ?? "";
        fileContent = new File([`${title}\n\n${content}`], `${title}_${uid}.txt`, { type: "text/plain" });
        fileSize = fileContent.size;
        break;
      }
      case "file": {
        const fileName = args.fileName ?? "";
        const bytes = args.fileBytes ?? new ArrayBuffer(0);
        // Insert uid before the extension: e.g. report.pdf → report_abc12345.pdf
        const dotIdx = fileName.lastIndexOf(".");
        const uniqueName = dotIdx > -1
          ? `${fileName.slice(0, dotIdx)}_${uid}${fileName.slice(dotIdx)}`
          : `${fileName}_${uid}`;
        fileContent = new File([bytes], uniqueName);
        fileSize = fileContent.size;
        break;
      }
      case "qa": {
        const q = args.question?.trim() ?? "";
        const a = args.answer?.trim() ?? "";
        const safeName = q.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
        fileContent = new File([`Q: ${q}\nA: ${a}`], `${safeName}_${uid}.txt`, { type: "text/plain" });
        fileSize = fileContent.size;
        break;
      }
      default:
        throw new Error(`Unknown entry type: ${args.entryType}`);
    }

    const cfItemId = await uploadToCF(fileContent, {
      agent_id: args.agentId ?? "",
      org_id: args.orgId ?? "",
      user_id: args.userId ?? "",
    });

    return { cfItemId, fileSize };
  },
});

// ─── CF Delete Worker ─────────────────────────────────────

export const cfDeleteWorker = internalAction({
  args: {
    cfItemId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (args.cfItemId) {
      await deleteFromCF(args.cfItemId);
    }
    return { deleted: true };
  },
});

// ─── Web Scraper Worker ───────────────────────────────────

export const webScraperWorker = internalAction({
  args: {
    entryId: v.string(),
    url: v.string(),
    parentUrl: v.optional(v.string()),
    agentId: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const markdown = await scrapeMarkdown(args.url);
    const safeName = args.url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const markdownBlob = new File([markdown], `${safeName}.md`, { type: "text/markdown" });
    const fileSize = markdownBlob.size;

    const cfItemId = await uploadToCF(markdownBlob, {
      agent_id: args.agentId,
      org_id: args.orgId,
      user_id: args.userId,
    });

    return { url: args.url, cfItemId, fileSize };
  },
});

// ─── Link Discoverer Worker ────────────────────────────────

export const linkDiscovererWorker = internalAction({
  args: {
    entryId: v.string(),
    url: v.string(),
  },
  handler: async (_ctx, args) => {
    let links: string[] = [];
    try {
      links = await scrapeLinks(args.url);
    } catch (err) {
      console.warn(`Failed to scrape links from ${args.url}:`, err);
    }
    const uniqueLinks = [...new Set([args.url, ...links])].slice(0, 20);

    return { links: uniqueLinks, sourceUrl: args.url };
  },
});
