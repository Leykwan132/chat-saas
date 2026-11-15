import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";
import { observeEscalationChange, observeHumanReply } from "./autoDeescalationRuntime";
import type { Doc } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.useRealTimers());

async function fixture(enabled = true) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T01:00:00Z"));
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Agent", provider: "openrouter", model: "test", systemPrompt: "test", templateKey: "blank", fileSize: 0, userId: "owner", orgId: "org", createdAt: now, updatedAt: now,
      autoDeescalation: { enabled, inactivityMinutes: 10, keywords: ["AI can take over"], revision: 1, activationRevision: 1 },
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org", service: "web", orgAddress: "web", contactAddress: "customer", status: "requires_user_input", assignedAgentId: agentId, assignedUserId: "teammate", assignToAiAgent: false, threadId: "thread", lastMessageAt: now, unreadCount: 1, createdAt: now, updatedAt: now,
      escalation: { question: "help", context: "test", escalatedAt: now },
    });
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new Error("Missing fixture");
    await observeEscalationChange(ctx, null, conversation);
    return { agentId, conversationId };
  });
  const timer = () => t.run((ctx) => ctx.db.query("autoDeescalationTimers").withIndex("by_conversationId", (q) => q.eq("conversationId", ids.conversationId)).unique());
  const conversation = () => t.run((ctx) => ctx.db.get(ids.conversationId));
  const reply = (patch: Partial<Doc<"messages">> = {}) => t.run(async (ctx) => {
    const messageId = await ctx.db.insert("messages", {
      orgId: "org", conversationId: ids.conversationId, service: "web", orgAddress: "web", contactAddress: "customer", direction: "outgoing", authorUserId: "teammate", contentType: "text", content: "Working on it", status: "sent", createdAt: Date.now(), ...patch,
    });
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Missing reply");
    await observeHumanReply(ctx, null, message);
    return messageId;
  });
  const expire = async () => {
    const current = await timer();
    if (!current) throw new Error("Missing timer");
    await t.mutation(internal.autoDeescalation.expire, { timerId: current._id, revision: current.revision });
  };
  const process = async (messageId: Doc<"messages">["_id"]) => {
    const message = await t.run((ctx) => ctx.db.get(messageId));
    if (!message) throw new Error("Missing reply");
    await t.mutation(internal.autoDeescalation.processHumanReply, { messageId, timerId: (await timer())!._id, sentAt: message.statusUpdatedAt ?? message.createdAt, activationRevision: (await timer())!.configRevision });
  };
  return { t, ...ids, timer, conversation, reply, expire, process };
}

test("timer opens escalation and enables AI without changing assignments or sending messages", async () => {
  const f = await fixture();
  vi.setSystemTime(Date.now() + 600_000);
  await f.expire();
  expect(await f.conversation()).toMatchObject({ status: "open", assignToAiAgent: true, assignedAgentId: f.agentId, assignedUserId: "teammate" });
  expect((await f.conversation())?.escalation).toBeUndefined();
  expect(await f.t.run((ctx) => ctx.db.query("messages").take(10))).toEqual([]);
  expect(await f.t.run((ctx) => ctx.db.query("conversationLogs").take(10))).toHaveLength(2);
});

test("successful human replies reset the timer and stale timer invocations cannot resolve", async () => {
  const f = await fixture();
  const old = await f.timer();
  vi.setSystemTime(Date.now() + 300_000);
  await f.reply({ contentType: "image", content: "image", mediaUrl: "https://example.com/image" });
  expect((await f.timer())?.dueAt).toBe(Date.now() + 600_000);
  vi.setSystemTime(Date.now() + 300_000);
  await f.t.mutation(internal.autoDeescalation.expire, { timerId: old!._id, revision: old!.revision });
  expect((await f.conversation())?.escalation).toBeDefined();
  vi.setSystemTime(Date.now() + 300_000);
  await f.expire();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
});

test("only a successful teammate text phrase resolves, ignoring case", async () => {
  const f = await fixture();
  const messageId = await f.reply({ content: "All sorted. ai CAN take OVER" });
  await f.process(messageId);
  expect((await f.conversation())?.escalation).toBeUndefined();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
});

test.each([
  { direction: "incoming" as const },
  { agentId: "ai" },
  { status: "failed" as const },
  { status: "queued" as const },
  { workflowAutomationSource: "workflowFollowUp" as const },
  { messageKind: "broadcast" as const },
  { contentType: "image" as const, mediaUrl: "https://example.com/AI can take over" },
  { createdAt: 1 },
])("ignores ineligible keyword message %j", async (patch) => {
  const f = await fixture();
  const normalized = "agentId" in patch ? { agentId: f.agentId } : patch;
  const messageId = await f.reply({ content: "AI can take over", ...normalized });
  await f.process(messageId);
  expect((await f.conversation())?.escalation).toBeDefined();
});

test.each(["disabled", "closed", "reassigned", "resolved", "newEscalation"])("timer ignores %s conversations", async (scenario) => {
  const f = await fixture();
  await f.t.run(async (ctx) => {
    if (scenario === "disabled") await ctx.db.patch(f.agentId, { autoDeescalation: { enabled: false, inactivityMinutes: 10, keywords: [], revision: 2, activationRevision: 2 } });
    if (scenario === "closed") await ctx.db.patch(f.conversationId, { status: "closed" });
    if (scenario === "reassigned") await ctx.db.patch(f.conversationId, { assignedAgentId: undefined });
    if (scenario === "resolved") await ctx.db.patch(f.conversationId, { escalation: undefined, status: "open" });
    if (scenario === "newEscalation") await ctx.db.patch(f.conversationId, { escalation: { question: "new", context: "new", escalatedAt: Date.now() + 1 } });
  });
  vi.setSystemTime(Date.now() + 600_000);
  await f.expire();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});

test("disabled feature never starts a timer", async () => {
  const f = await fixture(false);
  expect(await f.timer()).toBeNull();
});

test("scheduled inactivity job actually resumes AI at its deadline", async () => {
  const f = await fixture();
  vi.advanceTimersByTime(599_999);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
  vi.advanceTimersByTime(1);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
  expect(await f.timer()).toBeNull();
});

test("message trigger resumes after the human persistence transaction finishes", async () => {
  const f = await fixture();
  const { triggers } = await import("./triggers");
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.insert("messages", {
      orgId: "org", conversationId: f.conversationId, service: "web", orgAddress: "web", contactAddress: "customer", direction: "outgoing", authorUserId: "teammate", contentType: "text", content: "AI can take over", status: "sent", createdAt: Date.now(),
    });
    await ctx.db.patch(f.conversationId, { assignToAiAgent: false });
  });
  vi.advanceTimersByTime(0);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
  expect((await f.conversation())?.escalation).toBeUndefined();
});

test("conversation trigger arms new escalations and cancels timers on manual resolve", async () => {
  const f = await fixture();
  const { triggers } = await import("./triggers");
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(f.conversationId, { escalation: undefined, status: "open" });
  });
  expect(await f.timer()).toBeNull();
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(f.conversationId, { escalation: { question: "again", context: "again", escalatedAt: Date.now() + 1 }, status: "requires_user_input" });
  });
  expect((await f.timer())?.escalatedAt).toBe(Date.now() + 1);
});

test("queued to sent transition processes once and delivery receipts never reset inactivity", async () => {
  const f = await fixture();
  const { triggers } = await import("./triggers");
  const messageId = await f.reply({ status: "queued", content: "Still working" });
  const initial = await f.timer();
  vi.setSystemTime(Date.now() + 60_000);
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(messageId, { status: "sent" });
  });
  const sent = await f.timer();
  expect(sent!.revision).toBe(initial!.revision + 1);
  vi.setSystemTime(Date.now() + 60_000);
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(messageId, { status: "delivered" });
  });
  expect((await f.timer())?.revision).toBe(sent!.revision);
});

test("editing enabled settings keeps an existing inactivity deadline alive", async () => {
  const f = await fixture();
  await f.t.run((ctx) => ctx.db.patch(f.agentId, { autoDeescalation: { enabled: true, inactivityMinutes: 20, keywords: ["Done"], revision: 2, activationRevision: 1 } }));
  vi.setSystemTime(Date.now() + 600_000);
  await f.expire();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
});

test("reassigning the human owner invalidates the old timer", async () => {
  const f = await fixture();
  await f.t.run((ctx) => ctx.db.patch(f.conversationId, { assignedUserId: "another-teammate" }));
  vi.setSystemTime(Date.now() + 600_000);
  await f.expire();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});

test("a delayed queued reply resets inactivity from successful send time", async () => {
  const f = await fixture();
  const { triggers } = await import("./triggers");
  const messageId = await f.reply({ status: "queued", createdAt: Date.now() - 60000 });
  vi.setSystemTime(Date.now() + 300_000);
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(messageId, { status: "sent", statusUpdatedAt: Date.now() });
  });
  expect((await f.timer())?.dueAt).toBe(Date.now() + 600_000);
});

test("a deferred phrase job cannot resolve a newer escalation", async () => {
  const f = await fixture();
  const { triggers } = await import("./triggers");
  const messageId = await f.reply({ content: "AI can take over" });
  const oldTimer = await f.timer();
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(f.conversationId, { escalation: undefined, status: "open" });
    await ctx.db.patch(f.conversationId, { escalation: { question: "new", context: "new", escalatedAt: Date.now() + 1 }, status: "requires_user_input" });
  });
  await f.t.mutation(internal.autoDeescalation.processHumanReply, { messageId, timerId: oldTimer!._id, sentAt: Date.now(), activationRevision: oldTimer!.configRevision });
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
  expect((await f.conversation())?.escalation?.question).toBe("new");
});

test("turning auto de-escalation off and back on never revives an old deadline", async () => {
  const f = await fixture();
  await f.t.run((ctx) => ctx.db.patch(f.agentId, { autoDeescalation: { enabled: true, inactivityMinutes: 10, keywords: [], revision: 3, activationRevision: 3 } }));
  vi.setSystemTime(Date.now() + 600_000);
  await f.expire();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});

test("human replies from connected-channel echoes can use trigger phrases", async () => {
  const f = await fixture();
  const messageId = await f.reply({ authorUserId: undefined, content: "AI can take over" });
  await f.process(messageId);
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
});

test("a phrase queued before disabling cannot resolve after re-enabling", async () => {
  const f = await fixture();
  const messageId = await f.reply({ content: "AI can take over" });
  const oldTimer = await f.timer();
  await f.t.run((ctx) => ctx.db.patch(f.agentId, { autoDeescalation: { enabled: true, inactivityMinutes: 10, keywords: ["AI can take over"], revision: 3, activationRevision: 3 } }));
  await f.reply({ content: "Still helping" });
  await f.t.mutation(internal.autoDeescalation.processHumanReply, { messageId, timerId: oldTimer!._id, sentAt: Date.now(), activationRevision: oldTimer!.configRevision });
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});
