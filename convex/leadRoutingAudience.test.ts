import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.useRealTimers());

async function fixture() {
  const t = convexTest(schema, modules);
  const workosUserId = "audience-owner";
  const agentId = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId, email: "owner@example.com", createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal", name: "Personal", ownerId: userId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    return ctx.db.insert("agents", {
      name: "Audience agent", provider: "openrouter", model: "test", systemPrompt: "Test",
      templateKey: "blank", fileSize: 0, userId: workosUserId, orgId: "",
      createdAt: now, updatedAt: now,
    });
  });
  const authed = t.withIdentity({ subject: workosUserId });
  return { t, agentId, authed };
}

test("existing agents reply to all customers until an audience is selected", async () => {
  const f = await fixture();
  expect(await f.authed.query(api.leadRouting.settings.getForAgent, { agentId: f.agentId }))
    .toMatchObject({ aiReplyAudience: "all" });
});

test("new customer cutoff survives republishing and includes new contacts from ads", async () => {
  const f = await fixture();
  vi.useFakeTimers();
  const publishedAt = Date.now() + 1000;
  const insertConversation = (createdAt: number) => {
    vi.setSystemTime(createdAt);
    return f.t.run(async (ctx) => {
    const customerId = await ctx.db.insert("customers", {
      orgId: "", service: "whatsapp", source: "whatsapp", contactAddress: String(createdAt),
      tags: [], firstSeenAt: createdAt, lastSeenAt: createdAt, createdAt, updatedAt: createdAt,
    });
    return ctx.db.insert("conversations", {
      orgId: "", service: "whatsapp", orgAddress: "phone", contactAddress: String(createdAt),
      customerId, assignedAgentId: f.agentId, assignToAiAgent: true, status: "open",
      threadId: "thread", lastMessageAt: createdAt, unreadCount: 0, createdAt, updatedAt: createdAt,
    });
    });
  };
  const oldId = await insertConversation(publishedAt - 1);
  vi.setSystemTime(publishedAt);
  await f.authed.mutation(api.leadRouting.settings.updateForAgent, { agentId: f.agentId, aiReplyAudience: "new" });
  const newId = await insertConversation(publishedAt + 1);
  expect(await f.authed.query(api.conversations.get, { conversationId: oldId }))
    .toMatchObject({ aiReplyAudienceEligible: false });
  expect(await f.t.query(internal.leadRouting.audience.canReplyToConversation, { conversationId: oldId })).toBe(false);
  expect(await f.t.query(internal.leadRouting.audience.canReplyToConversation, { conversationId: newId })).toBe(true);
  vi.setSystemTime(publishedAt + 5000);
  await f.authed.mutation(api.leadRouting.settings.updateForAgent, { agentId: f.agentId, aiReplyAudience: "new", aiEnabledOnInbound: false });
  expect(await f.authed.query(api.leadRouting.settings.getForAgent, { agentId: f.agentId }))
    .toMatchObject({ aiReplyAudience: "new", aiNewCustomersSince: publishedAt });
  expect(await f.t.query(internal.leadRouting.audience.canReplyToConversation, { conversationId: newId })).toBe(true);
});

test("ads audience excludes unknown and post sources but remembers confirmed ad customers", async () => {
  const f = await fixture();
  await f.authed.mutation(api.leadRouting.settings.updateForAgent, { agentId: f.agentId, aiReplyAudience: "ads" });
  const { conversationId, customerId, messageId } = await f.t.run(async (ctx) => {
    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      orgId: "", service: "whatsapp", source: "whatsapp", contactAddress: "123",
      tags: [], firstSeenAt: now, lastSeenAt: now, createdAt: now, updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "", service: "whatsapp", orgAddress: "phone", contactAddress: "123", customerId,
      assignedAgentId: f.agentId, assignToAiAgent: true, status: "open", threadId: "thread",
      lastMessageAt: now, unreadCount: 0, createdAt: now, updatedAt: now,
    });
    const messageId = await ctx.db.insert("messages", { orgId: "", service: "whatsapp",
      conversationId, orgAddress: "phone", contactAddress: "123", direction: "incoming",
      contentType: "text", content: "Hi", createdAt: now });
    return { conversationId, customerId, messageId };
  });
  const eligible = () => f.t.query(internal.leadRouting.audience.canReplyToConversation, { conversationId });
  expect(await eligible()).toBe(false);
  await f.t.run((ctx) => ctx.db.patch(customerId, { firstReferral: {
    service: "whatsapp", messageId, receivedAt: Date.now(), referral: { sourceType: "post" },
  } }));
  expect(await eligible()).toBe(false);
  await f.t.run((ctx) => ctx.db.patch(customerId, { latestAdReferral: {
    service: "whatsapp", messageId, receivedAt: Date.now(), referral: { sourceType: "ad", sourceId: "ad-a" },
  } }));
  expect(await eligible()).toBe(true);
  await f.authed.mutation(api.leadRouting.settings.updateForAgent, { agentId: f.agentId, aiReplyAudience: "all" });
  await f.t.run((ctx) => ctx.db.patch(customerId, { latestAdReferral: undefined }));
  expect(await eligible()).toBe(true);
});
