import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { withInboxHandling } from "./inboxHandling";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
async function fixture(personal = false) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      name: "Inbox",
      type: personal ? "personal" : "organizational",
      ownerId: userId,
      ...(personal ? {} : { workosOrgId: "org" }),
      createdAt: now,
      updatedAt: now,
    });
    const membershipId = await ctx.db.insert("teamMemberships", {
      userId,
      teamId,
      role: "member",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    const agentId = await ctx.db.insert("agents", {
      name: "Agent",
      provider: "openrouter",
      model: "test",
      systemPrompt: "test",
      templateKey: "blank",
      fileSize: 0,
      userId: "owner",
      orgId: personal ? "personal" : "org",
      createdAt: now,
      updatedAt: now,
      autoDeescalation: {
        enabled: true,
        inactivityMinutes: 10,
        keywords: [],
        revision: 1,
        activationRevision: 1,
      },
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: personal ? "personal" : "org",
      userId: "owner",
      service: "web",
      orgAddress: "web",
      contactAddress: "customer",
      status: "requires_user_input",
      assignedAgentId: agentId,
      assignedUserId: "teammate",
      assignToAiAgent: false,
      threadId: "thread",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
      escalation: { question: "help", context: "test", escalatedAt: now },
    });
    const timerId = await ctx.db.insert("autoDeescalationTimers", {
      conversationId,
      agentId,
      assignedUserId: "teammate",
      escalatedAt: now,
      lastHumanReplyAt: now,
      dueAt: now + 600_000,
      revision: 1,
      configRevision: 1,
    });
    return { conversationId, timerId, agentId, teamId, membershipId, now };
  });
  const authed = t.withIdentity({ subject: "owner" });
  const read = () =>
    authed.query(api.inboxEscalationTimer.get, {
      conversationId: ids.conversationId,
    });
  return { t, ...ids, read };
}

test("returns actual start and deadline and follows human-reply resets", async () => {
  const f = await fixture();
  expect(await f.read()).toEqual({ startedAt: f.now, dueAt: f.now + 600_000 });
  await f.t.run((ctx) =>
    ctx.db.patch(f.timerId, {
      lastHumanReplyAt: f.now + 300_000,
      dueAt: f.now + 900_000,
      revision: 2,
    }),
  );
  expect(await f.read()).toEqual({
    startedAt: f.now + 300_000,
    dueAt: f.now + 900_000,
  });
});

test("no timer means no countdown, even with enabled settings", async () => {
  const f = await fixture();
  await f.t.run((ctx) => ctx.db.delete(f.timerId));
  expect(await f.read()).toBeNull();
});

test.each([
  { status: "closed" },
  { escalation: undefined },
  { assignToAiAgent: true },
  { assignedUserId: "other" },
  { assignedAgentId: undefined },
  { escalation: { question: "new", context: "new", escalatedAt: 1 } },
] satisfies Partial<Doc<"conversations">>[])(
  "hides stale timers after conversation change %j",
  async (patch) => {
    const f = await fixture();
    await f.t.run((ctx) => ctx.db.patch(f.conversationId, patch));
    expect(await f.read()).toBeNull();
  },
);

test.each([
  { enabled: false, activationRevision: 1 },
  { enabled: true, activationRevision: 2 },
])("hides disabled and invalidated timers %j", async (config) => {
  const f = await fixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.agentId, {
      autoDeescalation: {
        ...config,
        inactivityMinutes: 10,
        keywords: [],
        revision: 2,
      },
    }),
  );
  expect(await f.read()).toBeNull();
});

test("normal AI-resume timers are never presented as escalation timers", async () => {
  const f = await fixture();
  await f.t.run((ctx) => ctx.db.patch(f.timerId, { scope: "normal" }));
  expect(await f.read()).toBeNull();
});

test("retains overdue deadline until the server confirms resolution", async () => {
  const f = await fixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.timerId, {
      lastHumanReplyAt: f.now - 900_000,
      dueAt: f.now - 300_000,
    }),
  );
  expect(await f.read()).toEqual({
    startedAt: f.now - 900_000,
    dueAt: f.now - 300_000,
  });
});

test("rejects unauthenticated reads", async () => {
  const f = await fixture();
  await expect(
    f.t.query(api.inboxEscalationTimer.get, {
      conversationId: f.conversationId,
    }),
  ).rejects.toThrow("Not authenticated");
});

test("does not reveal a foreign workspace timer", async () => {
  const f = await fixture();
  await f.t.run((ctx) => ctx.db.patch(f.conversationId, { orgId: "foreign" }));
  expect(await f.read()).toBeNull();
});

test("requires chat-read permission", async () => {
  const f = await fixture();
  await f.t.run((ctx) => ctx.db.patch(f.teamId, { memberPermissions: [] }));
  await expect(f.read()).rejects.toThrow("Forbidden");
});

test("personal timers are restricted to their owner", async () => {
  const f = await fixture(true);
  expect(await f.read()).not.toBeNull();
  await f.t.run((ctx) => ctx.db.patch(f.conversationId, { userId: "other" }));
  expect(await f.read()).toBeNull();
});

test("board countdown follows the same escalation timer and human-reply resets", async () => {
  const f = await fixture();
  const readBoard = () =>
    f.t.run(async (ctx) => {
      const conversation = (await ctx.db.get(f.conversationId))!;
      return withInboxHandling(ctx, {
        conversationId: f.conversationId,
        orgId: conversation.orgId,
        userId: conversation.userId,
      } as Doc<"inboxConversationSummaries">);
    });
  expect(await readBoard()).toMatchObject({
    handling: "attention",
    aiResumeAt: f.now + 600_000,
    aiResumeStartedAt: f.now,
  });
  await f.t.run((ctx) =>
    ctx.db.patch(f.timerId, {
      lastHumanReplyAt: f.now + 300_000,
      dueAt: f.now + 900_000,
    }),
  );
  expect(await readBoard()).toMatchObject({
    aiResumeAt: f.now + 900_000,
    aiResumeStartedAt: f.now + 300_000,
  });
  await f.t.run((ctx) => ctx.db.delete(f.timerId));
  expect(await readBoard()).toMatchObject({
    aiResumeAt: null,
    aiResumeStartedAt: null,
  });
});
