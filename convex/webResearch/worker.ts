"use node";

import Perplexity from "@perplexity-ai/perplexity_ai";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { persistWebMarkdown } from "./persist";
import { requireResearchMarkdown } from "./markdown";
import {
  WEB_RESEARCH_MAX_STEPS,
  WEB_RESEARCH_MODEL,
  WEBSITE_RESEARCH_INSTRUCTIONS,
} from "./prompt";

function perplexityApiKey() {
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }
  return apiKey;
}

function summarizeOutputItems(output: unknown) {
  if (!Array.isArray(output)) {
    return { kind: typeof output, length: output == null ? 0 : 1 };
  }
  return output.map((item, index) => {
    if (!item || typeof item !== "object") {
      return { index, type: typeof item };
    }
    const record = item as Record<string, unknown>;
    return {
      index,
      type: record.type,
      status: record.status,
      name: record.name,
      keys: Object.keys(record),
    };
  });
}

async function researchWebsiteMarkdown(websiteUrl: string) {
  const client = new Perplexity({ apiKey: perplexityApiKey() });
  const input = `
Website: ${websiteUrl}

Research this website and its relevant internal pages.

Build a comprehensive customer-facing knowledge base.

The website may belong to any industry or vertical.

Focus on information that would help an AI chatbot accurately answer
questions from visitors, prospects, or customers of this organization.

Return Markdown only.
`.trim();

  console.log("[web-research] perplexity request", {
    websiteUrl,
    model: WEB_RESEARCH_MODEL,
    maxSteps: WEB_RESEARCH_MAX_STEPS,
    tools: ["web_search", "fetch_url"],
    instructionChars: WEBSITE_RESEARCH_INSTRUCTIONS.length,
    input,
  });

  const startedAt = Date.now();
  const response = await client.responses.create({
    model: WEB_RESEARCH_MODEL,
    instructions: WEBSITE_RESEARCH_INSTRUCTIONS,
    input,
    tools: [
      { type: "web_search" },
      { type: "fetch_url" },
    ],
    max_steps: WEB_RESEARCH_MAX_STEPS,
  });
  const elapsedMs = Date.now() - startedAt;

  console.log("[web-research] perplexity response meta", {
    websiteUrl,
    elapsedMs,
    id: response.id,
    status: response.status,
    model: response.model,
    error: response.error ?? null,
    usage: response.usage ?? null,
    outputCount: Array.isArray(response.output) ? response.output.length : null,
    outputItems: summarizeOutputItems(response.output),
    outputTextType: typeof response.output_text,
    outputTextChars: response.output_text?.length ?? 0,
    outputTextEmpty: !response.output_text?.trim(),
  });
  console.log("[web-research] perplexity output_text start");
  console.log(response.output_text);
  console.log("[web-research] perplexity output_text end");
  console.log("[web-research] perplexity output json", JSON.stringify(response.output, null, 2));

  const markdown = requireResearchMarkdown(response.output_text);
  console.log("[web-research] perplexity markdown accepted", {
    websiteUrl,
    markdownChars: markdown.length,
    markdownPreview: markdown.slice(0, 500),
    looksLikeToolCall: markdown.includes("fetch_url") || markdown.includes("tool_calls"),
  });
  return markdown;
}

export const researchWebsite = internalAction({
  args: {
    entryId: v.string(),
    url: v.string(),
    agentId: v.string(),
    orgId: v.string(),
  },
  returns: v.object({
    url: v.string(),
    ragEntryId: v.optional(v.string()),
    fileSize: v.number(),
    markdownR2Key: v.string(),
  }),
  handler: async (ctx, args) => {
    console.log("[web-research] worker start", args);
    const existing = await ctx.runQuery(internal.knowledgeBase.internalGetWebEntry, {
      entryId: args.entryId as never,
    });
    const markdown = await researchWebsiteMarkdown(args.url);
    const result = await persistWebMarkdown(ctx, {
      ...args,
      markdown,
      previousMarkdownR2Key: existing?.markdownR2Key,
    });
    console.log("[web-research] worker done", result);
    return result;
  },
});
