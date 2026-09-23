/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { upsertInboxConversationSummary } from "./inboxConversationSummary";
import { reconcileInboxConversationSummaryPage } from "./inboxConversationSummaryMigration";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("reconciliation reports and repairs a stale summary", async () => {
  const t = convexTest(schema, modules);
  const conversationId = await t.run(async (ctx) => {
    const now = Date.now();
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-summary-reconciliation",
      service: "whatsapp",
      phoneNumberId: "summary-reconciliation-phone",
      status: "connected",
      connectedByUserId: "summary-reconciliation-owner",
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("conversations", {
      orgId: "org-summary-reconciliation",
      channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      status: "open",
      assignToAiAgent: false,
      threadId: "summary-reconciliation-thread",
      lastMessageAt: now,
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  });
  await t.run(async (ctx) => {
    await upsertInboxConversationSummary(ctx, conversationId);
    const summary = await ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .unique();
    if (summary === null) throw new Error("Expected summary");
    await ctx.db.patch(summary._id, { unreadCount: 99 });
  });

  const audit = await t.run((ctx) =>
    reconcileInboxConversationSummaryPage(ctx, { cursor: null, numItems: 10 }, false),
  );
  expect(audit).toMatchObject({ stale: 1, repaired: 0 });

  const repair = await t.run((ctx) =>
    reconcileInboxConversationSummaryPage(ctx, { cursor: null, numItems: 10 }, true),
  );
  expect(repair).toMatchObject({ stale: 1, repaired: 1 });
});
