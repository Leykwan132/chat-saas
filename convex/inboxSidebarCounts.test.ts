import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { triggers } from "./triggers";

const modules = import.meta.glob("./**/*.ts");

test("sidebar totals include unloaded chats and stay current across edits and deletion", async () => {
  const t = convexTest(schema, modules);
  const client = t.withIdentity({ subject: "sidebar-owner" });
  await client.mutation(api.authUtils.upsertUser, {});
  const summaryId = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "", service: "whatsapp", phoneNumberId: "sidebar", status: "connected",
      connectedByUserId: "sidebar-owner", conversationCount: 61, createdAt: 1, updatedAt: 1,
    });
    let first;
    for (let index = 0; index < 61; index += 1) {
      const conversationId = await ctx.db.insert("conversations", {
        orgId: "", userId: "sidebar-owner", channelId, service: "whatsapp", orgAddress: "test",
        contactAddress: String(index), status: "open", threadId: `sidebar-${index}`, assignToAiAgent: false,
        lastMessageAt: index, unreadCount: 1, createdAt: 1, updatedAt: 1,
      });
      const id = await ctx.db.insert("inboxConversationSummaries", {
        conversationId, channelId, orgId: "", userId: "sidebar-owner", service: "whatsapp",
        status: "open", lastMessageAt: index, unreadCount: 1, assignedUserId: "sidebar-owner",
        tags: ["VIP", "VIP", "客户", "$priority"], leadTemperature: "Hot", isEscalated: false, hasBooking: true,
        isChannelConnected: true, updatedAt: 1,
      });
      first ??= id;
    }
    return first!;
  });
  expect(await client.query(api.inboxEscalationCounts.getSidebarCounts, {})).toBeNull();
  await t.mutation(internal.inboxEscalationCounts.backfill, { cursor: null });
  await t.mutation(internal.inboxEscalationCounts.backfill, { cursor: null });
  const counts = await client.query(api.inboxEscalationCounts.getSidebarCounts, {});
  expect(counts).toMatchObject({ all: 61, unread: 61, assigned_me: 61, booking: 61,
    unassigned: 0, escalated: 0, byPlatform: { whatsapp: 61 }, byLead: { Hot: 61 }, byTag: expect.arrayContaining([{ tag: "VIP", count: 61 }, { tag: "客户", count: 61 }, { tag: "$priority", count: 61 }]) });
  const page = await client.query(api.conversations.listInboxSummariesForCurrentOrg, {
    paginationOpts: { numItems: 25, cursor: null },
  });
  expect(page.page).toHaveLength(25);
  expect(await client.query(api.inboxEscalationCounts.getSidebarCounts, {})).toEqual(counts);
  await t.run(async (ctx) => {
    await triggers.wrapDB(ctx).db.patch(summaryId, {
      unreadCount: 0, assignedUserId: undefined, hasBooking: false, tags: [], leadTemperature: undefined,
    });
  });
  expect(await client.query(api.inboxEscalationCounts.getSidebarCounts, {})).toMatchObject({
    all: 61, unread: 60, assigned_me: 60, unassigned: 1, booking: 60, byTag: expect.arrayContaining([{ tag: "VIP", count: 60 }]), byLead: { Hot: 60 },
  });
  await t.run(async (ctx) => { await triggers.wrapDB(ctx).db.patch(summaryId, { isChannelConnected: false }); });
  expect(await client.query(api.inboxEscalationCounts.getSidebarCounts, {})).toMatchObject({ all: 60, unassigned: 0 });
  await t.run(async (ctx) => { await triggers.wrapDB(ctx).db.delete(summaryId); });
  expect(await client.query(api.inboxEscalationCounts.getSidebarCounts, {})).toMatchObject({ all: 60, unassigned: 0 });
  const outsider = t.withIdentity({ subject: "sidebar-outsider" });
  await outsider.mutation(api.authUtils.upsertUser, {});
  expect(await outsider.query(api.inboxEscalationCounts.getSidebarCounts, {})).toMatchObject({ all: 0 });
});
