/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("retains the R2 key when a web worker completes", async () => {
  const t = convexTest(schema, modules);
  const { entryId } = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Web Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "user_web_owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const entryId = await ctx.db.insert("webEntries", {
      agentId,
      url: "https://example.com/pricing",
      fileSize: 0,
      status: "gettingMarkdown",
      userId: "user_web_owner",
      orgId: "",
      createdAt: now,
    });
    return { entryId };
  });

  await t.mutation(internal.knowledgeBase.webScraperComplete, {
    workId: "work-1",
    context: { entryId },
    result: {
      kind: "success",
      returnValue: {
        url: "https://example.com/pricing",
        cfItemId: "cf-pricing",
        fileSize: 2048,
        markdownR2Key: "web-markdown/org_web/agent_web/pricing.md",
      },
    },
  });

  const result = await t.run(async (ctx) => {
    const entry = await ctx.db.get(entryId);
    return {
      status: entry?.status,
      markdownR2Key: entry?.markdownR2Key,
    };
  });

  expect(result).toEqual({
    status: "completed",
    markdownR2Key: "web-markdown/org_web/agent_web/pricing.md",
  });
});
