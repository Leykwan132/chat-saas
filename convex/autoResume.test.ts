import { afterEach, expect, test, vi } from "vitest";
import { normalReplyFixture } from "./autoResume.testUtils";
import { internal } from "./_generated/api";

afterEach(() => vi.useRealTimers());

test("normal business echo resumes AI at its own deadline without sending a reply or resolving escalation", async () => {
  const f = await normalReplyFixture();
  await f.reply();
  expect(await f.timer()).toMatchObject({
    scope: "normal",
    dueAt: Date.now() + 300_000,
  });
  vi.advanceTimersByTime(300_000);
  await f.t.finishInProgressScheduledFunctions();
  expect(await f.conversation()).toMatchObject({
    status: "open",
    assignToAiAgent: true,
    assignedUserId: "teammate",
  });
  expect(await f.timer()).toBeNull();
  expect(
    await f.t.run((ctx) => ctx.db.query("messages").take(10)),
  ).toHaveLength(1);
  const logs = await f.t.run((ctx) =>
    ctx.db.query("conversationLogs").take(10),
  );
  expect(logs.map((log) => log.action)).toEqual(["ai_enabled"]);
});

test("normal human replies restart the timer and stale jobs do not enable AI", async () => {
  const f = await normalReplyFixture();
  await f.reply({ authorUserId: "teammate", service: "web" });
  const original = await f.timer();
  expect(original).not.toBeNull();
  vi.setSystemTime(Date.now() + 60_000);
  await f.reply({
    contentType: "image",
    mediaUrl: "https://example.com/image",
  });
  expect((await f.timer())?.dueAt).toBe(Date.now() + 300_000);
  vi.setSystemTime(Date.now() + 240_000);
  await f.t.mutation(internal.autoDeescalation.expire, {
    timerId: original!._id,
    revision: original!.revision,
  });
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
  vi.setSystemTime(Date.now() + 60_000);
  await f.expire();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
});

test("normal keywords resume only normal chats after the human persistence transaction", async () => {
  const f = await normalReplyFixture();
  const { triggers } = await import("./triggers");
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.insert("messages", {
      orgId: "org",
      conversationId: f.conversationId,
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "customer",
      direction: "outgoing",
      contentType: "text",
      content: "All DONE",
      status: "sent",
      createdAt: Date.now(),
    });
    await ctx.db.patch(f.conversationId, { assignToAiAgent: false });
  });
  vi.advanceTimersByTime(0);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
});

test("normal auto resume cannot bypass escalation even when its keyword matches", async () => {
  const f = await normalReplyFixture();
  await f.reply({ content: "Done" });
  const original = await f.timer();
  expect(original).not.toBeNull();
  await f.patchConversation({
    escalation: { question: "help", context: "test", escalatedAt: Date.now() },
    status: "requires_user_input",
  });
  expect(await f.timer()).toBeNull();
  await f.reply({ content: "Done" });
  expect(await f.timer()).toBeNull();
  vi.advanceTimersByTime(300_000);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});

test.each(["closed", "reassigned", "manualResume", "disableAndEnable"])(
  "normal timer cannot resume after %s",
  async (scenario) => {
    const f = await normalReplyFixture();
    await f.reply();
    const original = await f.timer();
    expect(original).not.toBeNull();
    if (scenario === "closed") await f.patchConversation({ status: "closed" });
    if (scenario === "reassigned")
      await f.patchConversation({ assignedUserId: "another" });
    if (scenario === "manualResume") {
      await f.patchConversation({ assignToAiAgent: true });
      await f.patchConversation({ assignToAiAgent: false });
    }
    if (scenario === "disableAndEnable")
      await f.t.run((ctx) =>
        ctx.db.patch(f.agentId, {
          autoResume: {
            enabled: true,
            inactivityMinutes: 5,
            keywords: [],
            revision: 3,
            activationRevision: 3,
          },
        }),
      );
    vi.setSystemTime(Date.now() + 300_000);
    await f.t.mutation(internal.autoDeescalation.expire, {
      timerId: original!._id,
      revision: original!.revision,
    });
    expect((await f.conversation())?.assignToAiAgent).toBe(false);
  },
);

test("disabled normal auto resume leaves ordinary conversations paused", async () => {
  const f = await normalReplyFixture(false);
  await f.reply({ content: "Done" });
  expect(await f.timer()).toBeNull();
});

test.each([
  { direction: "incoming" as const },
  { status: "queued" as const },
  { status: "failed" as const },
  { messageKind: "broadcast" as const },
  { workflowAutomationSource: "workflowFollowUp" as const },
  { revokedAt: 1 },
  { createdAt: 1 },
])("normal auto resume ignores ineligible reply %j", async (patch) => {
  const f = await normalReplyFixture();
  await f.reply({ content: "Done", ...patch });
  expect(await f.timer()).toBeNull();
});

test("AI replies do not arm or reset normal human-reply timers", async () => {
  const f = await normalReplyFixture();
  await f.reply({ agentId: f.agentId });
  expect(await f.timer()).toBeNull();
  await f.reply();
  const current = await f.timer();
  vi.setSystemTime(Date.now() + 60_000);
  await f.reply({ agentId: f.agentId });
  expect(await f.timer()).toEqual(current);
});

test("normal queued replies start on successful send and receipts do not restart inactivity", async () => {
  const f = await normalReplyFixture();
  const messageId = await f.reply({
    status: "queued",
    createdAt: Date.now() - 60_000,
  });
  expect(await f.timer()).toBeNull();
  const { triggers } = await import("./triggers");
  vi.setSystemTime(Date.now() + 60_000);
  await f.t.run(async (ctx) => {
    await triggers
      .wrapDB(ctx)
      .db.patch(messageId, { status: "sent", statusUpdatedAt: Date.now() });
  });
  const current = await f.timer();
  expect(current?.dueAt).toBe(Date.now() + 300_000);
  vi.setSystemTime(Date.now() + 60_000);
  await f.t.run(async (ctx) => {
    await triggers.wrapDB(ctx).db.patch(messageId, { status: "read" });
  });
  expect(await f.timer()).toEqual(current);
});

test("escalated human replies use the escalation duration and keywords exclusively", async () => {
  const f = await normalReplyFixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.agentId, {
      autoDeescalation: {
        enabled: true,
        inactivityMinutes: 30,
        keywords: ["Escalation resolved"],
        revision: 1,
        activationRevision: 1,
      },
    }),
  );
  await f.patchConversation({
    escalation: { question: "help", context: "test", escalatedAt: Date.now() },
    status: "requires_user_input",
  });
  await f.reply({ content: "Done" });
  expect((await f.timer())?.dueAt).toBe(Date.now() + 1_800_000);
  vi.advanceTimersByTime(300_000);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
  await f.reply({ content: "Escalation resolved" });
  vi.advanceTimersByTime(0);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
  expect((await f.conversation())?.escalation).toBeUndefined();
});
