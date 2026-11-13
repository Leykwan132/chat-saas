import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { triggers } from "./triggers";
import { reconcileInboxConversationSummaryPage } from "./inboxConversationSummaryMigration";
import { escalatedInboxQuery } from "./inboxEscalationQuery";

const modules = import.meta.glob("./**/*.ts");

test("Escalated retrieves an older case beyond the first inbox page", async () => {
  const t = convexTest(schema, modules);
  const client = t.withIdentity({ subject: "escalation-owner" });
  await client.mutation(api.authUtils.upsertUser, {});
  const escalatedId = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "", service: "whatsapp", phoneNumberId: "test", status: "connected",
      connectedByUserId: "escalation-owner", conversationCount: 61, createdAt: 1, updatedAt: 1,
    });
    let oldest;
    for (let index = 0; index < 61; index += 1) {
      const conversationId = await ctx.db.insert("conversations", {
        orgId: "", userId: "escalation-owner", channelId, service: "whatsapp",
        orgAddress: "test", contactAddress: String(index), status: index === 0 ? "requires_user_input" : "open",
        threadId: `thread-${index}`, assignToAiAgent: false, lastMessageAt: index, unreadCount: 0, createdAt: 1, updatedAt: 1,
      });
      await ctx.db.insert("inboxConversationSummaries", {
        conversationId, channelId, orgId: "", userId: "escalation-owner", service: "whatsapp",
        status: index === 0 ? "requires_user_input" : "open", lastMessageAt: index,
        unreadCount: 0, tags: [], isEscalated: index === 0, hasBooking: false,
        isChannelConnected: true, updatedAt: 1,
      });
      if (index === 0) oldest = conversationId;
    }
    return oldest;
  });
  await t.mutation(internal.inboxEscalationCounts.backfill, { cursor: null });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(1);
  const first = await client.query(api.conversations.listInboxSummariesForCurrentOrg, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  expect(first.page.some((row) => row.conversationId === escalatedId)).toBe(false);
  const filtered = await client.query(api.conversations.listInboxSummariesForCurrentOrg, {
    escalatedOnly: true, paginationOpts: { numItems: 50, cursor: null },
  });
  expect(filtered.page.map((row) => row.conversationId)).toEqual([escalatedId]);
});

test("global count tracks unseen cases, resolution, disconnection and scope changes without double counting", async () => {
  const t = convexTest(schema, modules);
  const client = t.withIdentity({ subject: "counter-owner" });
  await client.mutation(api.authUtils.upsertUser, {});
  const ids = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "", service: "whatsapp", phoneNumberId: "counter", status: "connected",
      connectedByUserId: "counter-owner", conversationCount: 1, createdAt: 1, updatedAt: 1,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Counter", provider: "openrouter", model: "test", systemPrompt: "Help",
      templateKey: "blank", fileSize: 0, userId: "counter-owner", orgId: "", createdAt: 1, updatedAt: 1,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "", userId: "counter-owner", channelId, service: "whatsapp", orgAddress: "test",
      contactAddress: "1", assignedAgentId: agentId, status: "requires_user_input", threadId: "counter", assignToAiAgent: false,
      lastMessageAt: 1, unreadCount: 0, createdAt: 1, updatedAt: 1,
    });
    const summaryId = await ctx.db.insert("inboxConversationSummaries", {
      conversationId, channelId, orgId: "", userId: "counter-owner", assignedAgentId: agentId,
      service: "whatsapp", status: "requires_user_input", lastMessageAt: 1, unreadCount: 0,
      tags: [], isEscalated: true, hasBooking: false, isChannelConnected: true, updatedAt: 1,
    });
    return { summaryId, agentId };
  });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBeNull();
  await t.mutation(internal.inboxEscalationCounts.backfill, { cursor: null });
  await t.mutation(internal.inboxEscalationCounts.backfill, { cursor: null });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(1);
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, { agentId: ids.agentId })).toBe(1);
  const outsider = t.withIdentity({ subject: "other-owner" });
  await outsider.mutation(api.authUtils.upsertUser, {});
  expect(await outsider.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(0);
  const update = async (patch: Partial<import("./_generated/dataModel").Doc<"inboxConversationSummaries">>) => {
    await t.run(async (ctx) => {
      await triggers.wrapDB(ctx).db.patch(ids.summaryId, patch);
    });
  };
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.summaryId, { updatedAt: 2 });
    await reconcileInboxConversationSummaryPage(ctx, { cursor: null, numItems: 100 }, true);
    const repaired = await ctx.db.query("inboxConversationSummaries").unique();
    if (!repaired) throw new Error("Missing repaired summary");
    ids.summaryId = repaired._id;
  });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(1);
  await update({ status: "open" });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(0);
  await update({ status: "requires_user_input", isChannelConnected: false });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(0);
  await update({ isChannelConnected: true, assignedAgentId: undefined });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(1);
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, { agentId: ids.agentId })).toBe(0);
  await update({ orgId: "other-org" });
  expect(await client.query(api.inboxEscalationCounts.getForCurrentOrg, {})).toBe(0);
  await t.run(async (ctx) => {
    expect(await escalatedInboxQuery(ctx, "other-org", "counter-owner").take(10)).toHaveLength(1);
    expect(await escalatedInboxQuery(ctx, "other-org", "counter-owner", ids.agentId).take(10)).toHaveLength(0);
    expect(await escalatedInboxQuery(ctx, "different-org", "counter-owner").take(10)).toHaveLength(0);
    expect(await escalatedInboxQuery(ctx, "", "counter-owner").take(10)).toHaveLength(0);
    expect(await escalatedInboxQuery(ctx, "", "other-owner").take(10)).toHaveLength(0);
  });
  await t.run(async (ctx) => {
    await triggers.wrapDB(ctx).db.delete(ids.summaryId);
  });
  expect(await t.run((ctx) => ctx.db.query("inboxEscalationCountMemberships").collect())).toEqual([]);
});
