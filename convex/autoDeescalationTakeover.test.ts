import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";
import { triggers } from "./triggers";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.useRealTimers());

async function fixture(enabled = true) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-17T01:00:00Z"));
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Agent",
      provider: "openrouter",
      model: "test",
      systemPrompt: "test",
      templateKey: "blank",
      fileSize: 0,
      userId: "owner",
      orgId: "org",
      createdAt: now,
      updatedAt: now,
      autoDeescalation: {
        enabled,
        inactivityMinutes: 10,
        keywords: [],
        revision: 1,
        activationRevision: 1,
      },
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, conversationId };
  });
  const timer = () =>
    t.run((ctx) =>
      ctx.db
        .query("autoDeescalationTimers")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", ids.conversationId),
        )
        .unique(),
    );
  const conversation = () => t.run((ctx) => ctx.db.get(ids.conversationId));
  const reply = () =>
    t.run(async (raw) => {
      const ctx = triggers.wrapDB(raw);
      await ctx.db.patch(ids.conversationId, { assignToAiAgent: false });
      await ctx.db.insert("messages", {
        orgId: "org",
        conversationId: ids.conversationId,
        service: "whatsapp",
        orgAddress: "business",
        contactAddress: "customer",
        direction: "outgoing",
        contentType: "text",
        content: "Helping you",
        status: "sent",
        createdAt: Date.now(),
      });
    });
  return { t, ...ids, timer, conversation, reply };
}

test("direct WhatsApp takeover resumes AI ten minutes after the human reply", async () => {
  const f = await fixture();
  expect(await f.timer()).toBeNull();
  await f.reply();
  expect((await f.timer())?.dueAt).toBe(Date.now() + 600_000);
  expect((await f.conversation())?.escalation).toBeUndefined();
  vi.advanceTimersByTime(599_999);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
  vi.advanceTimersByTime(1);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
  expect(await f.timer()).toBeNull();
  const logs = await f.t.run((ctx) =>
    ctx.db.query("conversationLogs").take(10),
  );
  expect(logs.map((log) => log.action)).toEqual(["ai_enabled"]);
});

test("another WhatsApp human reply resets the direct takeover timer", async () => {
  const f = await fixture();
  await f.reply();
  const old = await f.timer();
  expect(old).not.toBeNull();
  vi.setSystemTime(Date.now() + 300_000);
  await f.reply();
  expect((await f.timer())?.dueAt).toBe(Date.now() + 600_000);
  vi.setSystemTime(Date.now() + 300_000);
  await f.t.mutation(internal.autoDeescalation.expire, {
    timerId: old!._id,
    revision: old!.revision,
  });
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});

test("disabled auto de-escalation leaves direct takeovers paused", async () => {
  const f = await fixture(false);
  await f.reply();
  expect(await f.timer()).toBeNull();
});

test.each(["resume", "close", "reassign", "escalate"])(
  "direct takeover timer is invalidated by %s",
  async (scenario) => {
    const f = await fixture();
    await f.reply();
    expect(await f.timer()).not.toBeNull();
    await f.t.run(async (raw) => {
      const ctx = triggers.wrapDB(raw);
      if (scenario === "resume")
        await ctx.db.patch(f.conversationId, { assignToAiAgent: true });
      if (scenario === "close")
        await ctx.db.patch(f.conversationId, { status: "closed" });
      if (scenario === "reassign")
        await ctx.db.patch(f.conversationId, { assignedUserId: "another" });
      if (scenario === "escalate")
        await ctx.db.patch(f.conversationId, {
          escalation: {
            question: "help",
            context: "new",
            escalatedAt: Date.now(),
          },
        });
    });
    expect(await f.timer()).toBeNull();
  },
);

test("customer messages do not reset a direct takeover timer", async () => {
  const f = await fixture();
  await f.reply();
  const original = await f.timer();
  vi.setSystemTime(Date.now() + 300_000);
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.insert("messages", {
      orgId: "org",
      conversationId: f.conversationId,
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "customer",
      direction: "incoming",
      contentType: "text",
      content: "Any update?",
      createdAt: Date.now(),
    });
  });
  expect(await f.timer()).toEqual(original);
});

test("historical human replies cannot arm a timer or resume AI", async () => {
  const f = await fixture();
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(f.conversationId, { assignToAiAgent: false });
    await ctx.db.insert("messages", {
      orgId: "org",
      conversationId: f.conversationId,
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "customer",
      direction: "outgoing",
      contentType: "text",
      content: "AI can take over",
      status: "sent",
      isHistorical: true,
      createdAt: Date.now() - 3_600_000,
    });
  });
  expect(await f.timer()).toBeNull();
  vi.advanceTimersByTime(600_000);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});

test("a reply while AI remains enabled cannot attach a timer to a later manual pause", async () => {
  const f = await fixture();
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
      content: "Helping you",
      status: "sent",
      createdAt: Date.now(),
    });
  });
  expect(await f.timer()).toBeNull();
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.patch(f.conversationId, { assignToAiAgent: false });
  });
  vi.advanceTimersByTime(600_000);
  await f.t.finishInProgressScheduledFunctions();
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});
