import { expect, it } from "vitest";
import { internal } from "../_generated/api";
import { fixture, principal } from "../../tests/integrationFixture";
import { upsertInboxConversationSummary } from "../inboxConversationSummary";
import { integrationResultSchema } from "../../shared/integrations/contracts";

async function snapshotFixture() {
  const setup = await fixture();
  await setup.t.run(async (ctx) => {
    await ctx.db.patch(setup.ids.conversationId, { unreadCount: 3 });
    await upsertInboxConversationSummary(ctx, setup.ids.conversationId);
    const channelId = await ctx.db.insert("channels", {
      orgId: principal.orgId,
      service: "instagram",
      status: "connected",
      connectedByUserId: principal.subject,
      conversationCount: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: principal.orgId,
      userId: principal.subject,
      channelId,
      service: "instagram",
      orgAddress: "org",
      contactAddress: "customer",
      contactName: "Instagram customer",
      status: "requires_user_input",
      assignedAgentId: setup.ids.agentId,
      assignToAiAgent: false,
      threadId: "instagram",
      lastMessageAt: Date.now() + 1000,
      unreadCount: 2,
      createdAt: 1,
      updatedAt: 1,
    });
    await upsertInboxConversationSummary(ctx, conversationId);
  });
  await setup.t.mutation(internal.inboxEscalationCounts.backfill, {
    cursor: null,
  });
  return setup;
}

it("returns exact inbox counts, channel breakdown and newest conversations", async () => {
  const { t, ids } = await snapshotFixture();
  const operation = { operation: "get_agent_snapshot", agentId: ids.agentId };
  const read = async () =>
    integrationResultSchema.parse(
      JSON.parse(
        await t.query(internal.integrations.queries.executeRead, {
          principal,
          operation,
        }),
      ),
    );
  const result = await read();
  expect(result).toMatchObject({
    operation: "get_agent_snapshot",
    workspace: { name: "Test" },
    snapshot: {
      agentId: ids.agentId,
      name: "Support",
      totalChats: 2,
      unreadChats: 2,
      unreadMessages: 5,
      escalatedChats: 1,
      unassignedChats: 2,
      chatsWithBookings: 0,
      byPlatform: { whatsapp: 1, instagram: 1 },
      byStatus: { open: 1, requires_user_input: 1 },
    },
    items: [
      { contactName: "Instagram customer", service: "instagram" },
      { conversationId: ids.conversationId, service: "whatsapp" },
    ],
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.conversationId, {
      unreadCount: 0,
      status: "closed",
    });
    await upsertInboxConversationSummary(ctx, ids.conversationId);
  });
  expect(await read()).toMatchObject({
    snapshot: { unreadChats: 1, unreadMessages: 2, byStatus: { closed: 1 } },
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.channelId, { status: "disconnected" });
    await upsertInboxConversationSummary(ctx, ids.conversationId);
  });
  expect(await read()).toMatchObject({
    snapshot: { totalChats: 1, byPlatform: { whatsapp: 0, instagram: 1 } },
  });
  await t.mutation(internal.inboxEscalationCounts.backfill, { cursor: null });
  expect(await read()).toMatchObject({
    snapshot: { totalChats: 1, unreadMessages: 2 },
  });
});

it("denies snapshots before initialization and blocks foreign agents and revoked consent", async () => {
  const { t, ids, connectionId } = await fixture();
  const args = {
    principal,
    operation: { operation: "get_agent_snapshot", agentId: ids.agentId },
  };
  await expect(
    t.query(internal.integrations.queries.executeRead, args),
  ).rejects.toThrow("SNAPSHOT_NOT_READY");
  await expect(
    t.query(internal.integrations.queries.executeRead, {
      ...args,
      operation: { ...args.operation, agentId: ids.foreignAgentId },
    }),
  ).rejects.toThrow("NOT_FOUND");
  await t.mutation(internal.integrations.connections.revokePilotConnection, {
    connectionId,
  });
  await expect(
    t.query(internal.integrations.queries.executeRead, args),
  ).rejects.toThrow("CONNECTION_APPROVAL_REQUIRED");
});

it("scopes Personal snapshot counts to the agent owner and returns empty activity honestly", async () => {
  const { t, ids } = await snapshotFixture();
  await t.run(async (ctx) => {
    await ctx.db.insert("teams", {
      name: "Personal",
      type: "personal",
      ownerId: ids.userId,
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.patch(ids.agentId, { orgId: "" });
  });
  const args = {
    principal,
    operation: { operation: "get_agent_snapshot", agentId: ids.agentId },
  };
  const empty = JSON.parse(
    await t.query(internal.integrations.queries.executeRead, args),
  );
  expect(empty).toMatchObject({
    workspace: { name: "Personal" },
    snapshot: { totalChats: 0, unreadMessages: 0, lastActivityAt: null },
    items: [],
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.conversationId, { orgId: "", unreadCount: 7 });
    await ctx.db.patch(ids.channelId, { orgId: "" });
    await upsertInboxConversationSummary(ctx, ids.conversationId);
  });
  expect(
    JSON.parse(await t.query(internal.integrations.queries.executeRead, args)),
  ).toMatchObject({ snapshot: { totalChats: 1, unreadMessages: 7 } });
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.conversationId, { userId: "user_other" });
    await upsertInboxConversationSummary(ctx, ids.conversationId);
  });
  expect(
    JSON.parse(await t.query(internal.integrations.queries.executeRead, args)),
  ).toMatchObject({
    snapshot: { totalChats: 0, unreadMessages: 0 },
    items: [],
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.agentId, { userId: "user_other" });
  });
  await expect(
    t.query(internal.integrations.queries.executeRead, args),
  ).rejects.toThrow("NOT_FOUND");
});
