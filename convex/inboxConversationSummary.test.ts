/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  refreshInboxSummariesForCalendarEvent,
  refreshInboxSummariesForCustomer,
  upsertInboxConversationSummary,
} from "./inboxConversationSummary";
import schema from "./schema";
import { triggers } from "./triggers";

const modules = import.meta.glob("./**/*.ts");

async function createFixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "inbox-summary-owner",
      email: "inbox-summary@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Inbox summary",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Inbox agent",
      provider: "openrouter",
      model: "test-model",
      systemPrompt: "Help.",
      templateKey: "blank",
      fileSize: 0,
      userId: "inbox-summary-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      phoneNumberId: "inbox-summary-phone",
      status: "connected",
      connectedByUserId: "inbox-summary-owner",
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      userId: "inbox-summary-owner",
      agentId,
      service: "whatsapp",
      contactAddress: "+60123456789",
      name: "Ada",
      tags: ["VIP"],
      leadTemperature: "Hot",
      source: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      userId: "inbox-summary-owner",
      channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      contactName: "Ada Lovelace",
      customerId,
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "inbox-summary-thread",
      lastMessageAt: now,
      lastMessagePreview: "Hello",
      unreadCount: 2,
      createdAt: now,
      updatedAt: now,
    });
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Ada booking",
      startAt: now + 60_000,
      endAt: now + 120_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("appointmentBookingSessions", {
      conversationId,
      customerId,
      agentId,
      status: "booked",
      calendarEventId: eventId,
      collectedFields: {},
      createdAt: now,
      updatedAt: now,
    });
    return { conversationId, customerId, eventId };
  });
  return { t, ...ids };
}

test("builds one compact connected Inbox row from a conversation and customer", async () => {
  const fixture = await createFixture();
  await fixture.t.run((ctx) => upsertInboxConversationSummary(ctx, fixture.conversationId));

  const summary = await fixture.t.run((ctx) =>
    ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .unique(),
  );

  expect(summary).toMatchObject({
    conversationId: fixture.conversationId,
    contactName: "Ada",
    tags: ["VIP"],
    leadTemperature: "Hot",
    hasBooking: true,
    isEscalated: false,
    isChannelConnected: true,
  });
});

test("removes the row when its conversation is deleted", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    await upsertInboxConversationSummary(ctx, fixture.conversationId);
    await ctx.db.delete(fixture.conversationId);
    await upsertInboxConversationSummary(ctx, fixture.conversationId);
  });

  const summary = await fixture.t.run((ctx) =>
    ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .unique(),
  );
  expect(summary).toBeNull();
});

test("refreshes every linked row after customer tag and temperature changes", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    await upsertInboxConversationSummary(ctx, fixture.conversationId);
    await ctx.db.patch(fixture.customerId, {
      tags: ["Returning"],
      leadTemperature: "Warm",
    });
    await refreshInboxSummariesForCustomer(ctx, fixture.customerId);
  });

  const summaries = await fixture.t.run((ctx) =>
    ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_customerId", (q) => q.eq("customerId", fixture.customerId))
      .collect(),
  );
  expect(summaries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ tags: ["Returning"], leadTemperature: "Warm" }),
    ]),
  );
});

test("clears the booking marker after its calendar event is cancelled", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    await upsertInboxConversationSummary(ctx, fixture.conversationId);
    await ctx.db.patch(fixture.eventId, { status: "cancelled" });
    await refreshInboxSummariesForCalendarEvent(ctx, fixture.eventId);
  });

  const summary = await fixture.t.run((ctx) =>
    ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .unique(),
  );
  expect(summary).toMatchObject({ hasBooking: false });
});

test("keeps a summary current through trigger-wrapped source writes", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    const triggerCtx = triggers.wrapDB(ctx);
    await triggerCtx.db.patch(fixture.conversationId, { unreadCount: 0 });
    await triggerCtx.db.patch(fixture.customerId, {
      tags: ["Current"],
      leadTemperature: "Cold",
    });
    await triggerCtx.db.patch(fixture.eventId, { status: "cancelled" });
  });

  const summary = await fixture.t.run((ctx) =>
    ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .unique(),
  );
  expect(summary).toMatchObject({
    unreadCount: 0,
    tags: ["Current"],
    leadTemperature: "Cold",
    hasBooking: false,
  });
});

test("paginates connected summaries for the current workspace", async () => {
  const fixture = await createFixture();
  await fixture.t.run((ctx) => upsertInboxConversationSummary(ctx, fixture.conversationId));
  const client = fixture.t.withIdentity({ subject: "inbox-summary-owner" });
  await client.mutation(api.authUtils.upsertUser, {});

  const page = await client.query(api.conversations.listInboxSummariesForCurrentOrg, {
    paginationOpts: { numItems: 2, cursor: null },
  });

  expect(page.page).toEqual([
    expect.objectContaining({ conversationId: fixture.conversationId }),
  ]);
});
