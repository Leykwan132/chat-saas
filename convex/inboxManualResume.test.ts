import { afterEach, expect, test, vi } from "vitest";
import { makeFunctionReference } from "convex/server";
import { manualEscalationFixture } from "../tests/manualEscalationFixture";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const setResume = makeFunctionReference<
  "mutation",
  { conversationId: Id<"conversations">; minutes: number },
  null
>("inboxManualResume:set");
const expire = makeFunctionReference<
  "mutation",
  {
    conversationId: Id<"conversations">;
    revision: number;
    dueAt: number;
    agentId: Id<"agents">;
    assignedUserId?: string;
    escalatedAt?: number;
  },
  null
>("inboxManualResume:expire");
afterEach(() => vi.useRealTimers());

test("per-chat schedule stays paused until due and a newer choice invalidates the old job", async () => {
  vi.useFakeTimers();
  const f = await manualEscalationFixture();
  await f.authed.mutation(setResume, {
    conversationId: f.conversationId,
    minutes: 5,
  });
  const first = (await f.conversation())!;
  expect(first.assignToAiAgent).toBe(false);
  expect(first.manualAiResumeAt).toBe(Date.now() + 300000);
  const oldJob = {
    conversationId: f.conversationId,
    agentId: f.agentId,
    assignedUserId: "teammate",
    revision: first.manualAiResumeRevision!,
    dueAt: first.manualAiResumeAt!,
  };
  await f.authed.mutation(setResume, {
    conversationId: f.conversationId,
    minutes: 10,
  });
  vi.setSystemTime(oldJob.dueAt);
  await f.t.mutation(expire, oldJob);
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
  const second = (await f.conversation())!;
  vi.setSystemTime(second.manualAiResumeAt!);
  await f.t.mutation(expire, {
    ...oldJob,
    dueAt: second.manualAiResumeAt!,
    revision: second.manualAiResumeRevision!,
  });
  expect((await f.conversation())?.assignToAiAgent).toBe(true);
  expect((await f.conversation())?.manualAiResumeAt).toBeUndefined();
});

test("resume now clears schedule and escalation without sending a message", async () => {
  const f = await manualEscalationFixture();
  await f.escalate();
  await f.authed.mutation(setResume, {
    conversationId: f.conversationId,
    minutes: 3,
  });
  expect((await f.conversation())?.escalation).toBeDefined();
  await f.authed.mutation(setResume, {
    conversationId: f.conversationId,
    minutes: 0,
  });
  const conversation = await f.conversation();
  expect(conversation?.assignToAiAgent).toBe(true);
  expect(conversation?.manualAiResumeAt).toBeUndefined();
  expect(conversation?.escalation).toBeUndefined();
  const messages = await f.t.run((ctx) =>
    ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", f.conversationId),
      )
      .collect(),
  );
  expect(messages).toHaveLength(1);
});

test("rejects invalid durations and unauthorized edits", async () => {
  const f = await manualEscalationFixture();
  for (const minutes of [-1, 0.5, 10081]) {
    await expect(
      f.authed.mutation(setResume, {
        conversationId: f.conversationId,
        minutes,
      }),
    ).rejects.toThrow();
  }
  await f.t.run(async (ctx) => {
    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_teamId", (q) => q.eq("teamId", f.teamId))
      .first();
    if (!membership) throw new Error("Missing membership");
    await ctx.db.patch(f.teamId, { memberPermissions: ["chats:read"] });
  });
  await expect(
    f.authed.mutation(setResume, {
      conversationId: f.conversationId,
      minutes: 5,
    }),
  ).rejects.toThrow("Forbidden");
});

test("each conversation keeps its own schedule and closing cancels it", async () => {
  const f = await manualEscalationFixture();
  const secondId = await f.t.run(async (ctx) => {
    const source = await ctx.db.get(f.conversationId);
    if (!source) throw new Error("Missing conversation");
    const { _id, _creationTime, ...fields } = source;
    return await ctx.db.insert("conversations", {
      ...fields,
      contactAddress: "second",
    });
  });
  await f.authed.mutation(setResume, {
    conversationId: f.conversationId,
    minutes: 5,
  });
  await f.authed.mutation(setResume, { conversationId: secondId, minutes: 15 });
  const secondDueAt = await f.t.run(
    async (ctx) => (await ctx.db.get(secondId))?.manualAiResumeAt,
  );
  await f.authed.mutation(setResume, {
    conversationId: f.conversationId,
    minutes: 0,
  });
  expect(
    await f.t.run(
      async (ctx) => (await ctx.db.get(secondId))?.manualAiResumeAt,
    ),
  ).toBe(secondDueAt);
  await f.t.run(async (ctx) => {
    const { observeEscalationChange } =
      await import("./autoDeescalationRuntime");
    const before = await ctx.db.get(secondId);
    await ctx.db.patch(secondId, { status: "closed" });
    await observeEscalationChange(ctx, before, await ctx.db.get(secondId));
  });
  expect(
    await f.t.run(
      async (ctx) => (await ctx.db.get(secondId))?.manualAiResumeAt,
    ),
  ).toBeNull();
});

test("explicit schedule takes precedence over agent inactivity and keyword timers", async () => {
  const f = await manualEscalationFixture();
  await f.t.run(async (ctx) => {
    await ctx.db.patch(f.agentId, {
      autoResume: {
        enabled: true,
        inactivityMinutes: 1,
        keywords: ["Done"],
        revision: 1,
        activationRevision: 1,
      },
    });
  });
  await f.authed.mutation(setResume, {
    conversationId: f.conversationId,
    minutes: 15,
  });
  await f.t.run(async (ctx) => {
    const messageId = await ctx.db.insert("messages", {
      orgId: "org",
      conversationId: f.conversationId,
      service: "web",
      orgAddress: "web",
      contactAddress: "visitor",
      direction: "outgoing",
      authorUserId: "teammate",
      contentType: "text",
      content: "Done",
      status: "sent",
      createdAt: Date.now(),
    });
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Missing message");
    const { observeHumanReply } = await import("./autoDeescalationRuntime");
    await observeHumanReply(ctx, null, message);
    const timer = await ctx.db
      .query("autoDeescalationTimers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", f.conversationId),
      )
      .unique();
    expect(timer).toBeNull();
  });
  expect((await f.conversation())?.assignToAiAgent).toBe(false);
});
