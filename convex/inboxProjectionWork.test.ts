import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import schema from "./schema";
import { triggers } from "./triggers";

const modules = import.meta.glob("./**/*.ts");

async function createFixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "work-reduction",
      service: "whatsapp",
      status: "connected",
      connectedByUserId: "work-reduction-owner",
      conversationCount: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "work-reduction",
      service: "whatsapp",
      source: "whatsapp",
      contactAddress: "+60123456789",
      name: "Customer",
      email: "old@example.com",
      tags: [],
      firstSeenAt: 1,
      lastSeenAt: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "work-reduction",
      channelId,
      customerId,
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      contactName: "Customer",
      threadId: "work-reduction-thread",
      assignToAiAgent: true,
      status: "open",
      unreadCount: 0,
      lastMessageAt: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.insert("inboxConversationSummaries", {
      conversationId,
      customerId,
      channelId,
      orgId: "work-reduction",
      contactName: "Customer",
      service: "whatsapp",
      lastMessageAt: 1,
      unreadCount: 0,
      status: "open",
      tags: [],
      isEscalated: false,
      hasBooking: false,
      isChannelConnected: true,
      updatedAt: 1,
    });
    return { channelId, customerId, conversationId };
  });
  return { t, ...ids };
}

test("channel counter and customer activity changes perform no projection queries", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    const query = vi.spyOn(ctx.db, "query");
    const wrapped = triggers.wrapDB(ctx);
    await wrapped.db.patch(fixture.channelId, { conversationCount: 2 });
    await wrapped.db.patch(fixture.customerId, {
      lastSeenAt: 2,
      lastConversationId: fixture.conversationId,
      updatedAt: 2,
    });
    expect(query).not.toHaveBeenCalled();
  });
});

test("incoming preview and unread changes update the summary without querying search documents", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    const query = vi.spyOn(ctx.db, "query");
    await triggers.wrapDB(ctx).db.patch(fixture.conversationId, {
      lastMessageAt: 2,
      lastMessagePreview: "New incoming message",
      unreadCount: 1,
    });
    expect(query.mock.calls.map(([table]) => table)).not.toContain("inboxChatSearchDocuments");
    const summary = await ctx.db.query("inboxConversationSummaries")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .unique();
    expect(summary).toMatchObject({ unreadCount: 1, lastMessagePreview: "New incoming message" });
  });
});

test("customer email and phone edits update chat search even when the summary name is unchanged", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    await triggers.wrapDB(ctx).db.patch(fixture.customerId, {
      email: "new@example.com",
      phone: "+60111111111",
    });
    const search = await ctx.db.query("inboxChatSearchDocuments")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .unique();
    expect(search?.searchText).toContain("new@example.com");
    expect(search?.searchText).toContain("+60111111111");
    expect(search?.searchText).not.toContain("old@example.com");
  });
});

test("delivery receipts perform no search queries while text edits remain searchable", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    const messageId = await ctx.db.insert("messages", {
      orgId: "work-reduction",
      conversationId: fixture.conversationId,
      channelId: fixture.channelId,
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      direction: "outgoing",
      contentType: "text",
      content: "Original text",
      createdAt: 1,
    });
    const query = vi.spyOn(ctx.db, "query");
    const wrapped = triggers.wrapDB(ctx);
    await wrapped.db.patch(messageId, { status: "delivered", statusUpdatedAt: 2 });
    expect(query).not.toHaveBeenCalled();
    await wrapped.db.patch(messageId, { content: "Edited text" });
    const search = await ctx.db.query("inboxMessageSearchDocuments")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .unique();
    expect(search?.content).toBe("Edited text");
  });
});
