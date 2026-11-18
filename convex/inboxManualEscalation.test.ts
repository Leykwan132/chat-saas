import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { manualEscalationFixture } from "../tests/manualEscalationFixture";

test("internal escalation pauses AI, preserves history and assignments, and updates the Inbox", async () => {
  const f = await manualEscalationFixture();
  await f.escalate();
  expect(await f.conversation()).toMatchObject({
    status: "requires_user_input",
    assignToAiAgent: false,
    assignedAgentId: f.agentId,
    assignedUserId: "teammate",
    unreadCount: 3,
    threadId: "thread",
    escalation: {
      question: "Human attention requested",
      context: "Manually escalated by a team member.",
    },
  });
  expect(await f.t.run((ctx) => ctx.db.get(f.messageId))).toMatchObject({
    content: "Hello",
    direction: "incoming",
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("messages").take(10)),
  ).toHaveLength(1);
  expect(
    await f.t.run((ctx) => ctx.db.query("conversationLogs").take(10)),
  ).toMatchObject([
    { action: "escalation_raised", actorType: "user", actorUserId: "teammate" },
  ]);
  expect(
    await f.t.run((ctx) =>
      ctx.db
        .query("inboxConversationSummaries")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", f.conversationId),
        )
        .unique(),
    ),
  ).toMatchObject({ status: "requires_user_input", isEscalated: true });
  expect(
    await f.t.run((ctx) => ctx.db.query("autoDeescalationTimers").take(10)),
  ).toHaveLength(0);
  const jobs = await f.t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").take(20),
  );
  expect(jobs.some((job) => job.name.includes("telegram"))).toBe(false);
});

test("repeated escalation preserves the original reason and timestamp", async () => {
  const f = await manualEscalationFixture();
  await f.escalate();
  const first = await f.conversation();
  await f.escalate();
  expect((await f.conversation())?.escalation).toEqual(first?.escalation);
  expect(
    await f.t.run((ctx) => ctx.db.query("conversationLogs").take(10)),
  ).toHaveLength(1);
});

test("closed conversations cannot be escalated", async () => {
  const f = await manualEscalationFixture();
  await f.t.run((ctx) => ctx.db.patch(f.conversationId, { status: "closed" }));
  await expect(f.escalate()).rejects.toThrow("closed");
  expect((await f.conversation())?.escalation).toBeUndefined();
});

test("manual escalation does not require AI escalation rules or an assigned bot", async () => {
  const f = await manualEscalationFixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.conversationId, { assignedAgentId: undefined }),
  );
  await f.escalate();
  expect((await f.conversation())?.status).toBe("requires_user_input");
});

test("requires authenticated chat-assignment access", async () => {
  const f = await manualEscalationFixture();
  await expect(
    f.t.mutation(api.inboxManualEscalation.escalate, {
      conversationId: f.conversationId,
    }),
  ).rejects.toThrow("Not authenticated");
  await f.t.run((ctx) => ctx.db.patch(f.teamId, { memberPermissions: [] }));
  await expect(f.escalate()).rejects.toThrow("Forbidden");
  expect((await f.conversation())?.status).toBe("open");
});

test("rejects foreign workspace conversations", async () => {
  const f = await manualEscalationFixture();
  await f.t.run((ctx) => ctx.db.patch(f.conversationId, { orgId: "foreign" }));
  await expect(f.escalate()).rejects.toThrow("Conversation not found");
});

test("personal conversations can only be escalated by their owner", async () => {
  const f = await manualEscalationFixture(true);
  await f.escalate();
  expect((await f.conversation())?.status).toBe("requires_user_input");
  await f.t.run((ctx) => ctx.db.patch(f.conversationId, { userId: "other" }));
  await expect(f.escalate()).rejects.toThrow("Conversation not found");
});

test("manual de-escalation atomically clears escalation, resumes AI and preserves chat data", async () => {
  const f = await manualEscalationFixture();
  await f.escalate();
  await f.authed.mutation(api.inboxManualEscalation.deescalate, {
    conversationId: f.conversationId,
  });
  expect(await f.conversation()).toMatchObject({
    status: "open",
    assignToAiAgent: true,
    assignedAgentId: f.agentId,
    assignedUserId: "teammate",
    unreadCount: 3,
  });
  expect((await f.conversation())?.escalation).toBeUndefined();
  expect(
    await f.t.run((ctx) => ctx.db.query("messages").take(10)),
  ).toHaveLength(1);
  expect(
    (await f.t.run((ctx) => ctx.db.query("conversationLogs").take(10))).map(
      (log) => log.action,
    ),
  ).toEqual(["escalation_raised", "escalation_resolved", "ai_enabled"]);
  await f.authed.mutation(api.inboxManualEscalation.deescalate, {
    conversationId: f.conversationId,
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("conversationLogs").take(10)),
  ).toHaveLength(3);
});

test("manual de-escalation rejects missing permissions and foreign ownership", async () => {
  const f = await manualEscalationFixture();
  await f.escalate();
  await f.t.run((ctx) => ctx.db.patch(f.teamId, { memberPermissions: [] }));
  await expect(
    f.authed.mutation(api.inboxManualEscalation.deescalate, {
      conversationId: f.conversationId,
    }),
  ).rejects.toThrow("Forbidden");
  const personal = await manualEscalationFixture(true);
  await personal.escalate();
  await personal.t.run((ctx) =>
    ctx.db.patch(personal.conversationId, { userId: "other" }),
  );
  await expect(
    personal.authed.mutation(api.inboxManualEscalation.deescalate, {
      conversationId: personal.conversationId,
    }),
  ).rejects.toThrow("Conversation not found");
});

test("de-escalating cancels the active countdown", async () => {
  const f = await manualEscalationFixture();
  await f.escalate();
  const conversation = await f.conversation();
  await f.t.run((ctx) =>
    ctx.db.insert("autoDeescalationTimers", {
      conversationId: f.conversationId,
      agentId: f.agentId,
      assignedUserId: "teammate",
      escalatedAt: conversation!.escalation!.escalatedAt,
      lastHumanReplyAt: Date.now(),
      dueAt: Date.now() + 60_000,
      revision: 1,
      configRevision: 1,
    }),
  );
  await f.authed.mutation(api.inboxManualEscalation.deescalate, {
    conversationId: f.conversationId,
  });
  expect(
    await f.t.run((ctx) => ctx.db.query("autoDeescalationTimers").take(10)),
  ).toHaveLength(0);
});
