/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import {
  createOrReplaceActiveBatch,
  getActiveBatch,
  getActiveBookingState,
} from "./appointmentBooking/batchStore";
import { getOrCreateSession } from "./appointmentBooking/sessionStore";

const modules = import.meta.glob("./**/*.ts");

async function createConversationFixture(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "batch-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-batch-store",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, conversationId, now };
  });
}

test("an active batch is the conversation booking state", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createConversationFixture(t);
  const batchId = await t.run(async (ctx) => {
    const batch = await createOrReplaceActiveBatch(ctx, {
      conversationId: fixture.conversationId,
      agentId: fixture.agentId,
      collectedFields: { name: "Aisha" },
      requestedSlots: [],
    });
    const active = await getActiveBatch(ctx, fixture.conversationId);
    const state = await getActiveBookingState(ctx, fixture.conversationId);
    expect(active?._id).toBe(batch._id);
    expect(state).toMatchObject({ kind: "batch", row: { _id: batch._id } });
    return batch._id;
  });

  const result = await t.query(
    internal.appointmentBooking.currentBooking.getActiveBookingSession,
    { conversationId: fixture.conversationId },
  );

  expect(result).toMatchObject({
    success: true,
    hasActiveSession: true,
    bookingKind: "batch",
    batchId,
    status: "collecting",
  });
});

test("an active batch blocks a new single booking session", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createConversationFixture(t);

  await expect(t.run(async (ctx) => {
    await createOrReplaceActiveBatch(ctx, {
      conversationId: fixture.conversationId,
      agentId: fixture.agentId,
      collectedFields: {},
      requestedSlots: [],
    });
    await getOrCreateSession(ctx, fixture.conversationId, fixture.agentId);
  })).rejects.toThrow("active batch");
});

test("an active single booking session blocks a new batch", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createConversationFixture(t);

  await expect(t.run(async (ctx) => {
    await getOrCreateSession(ctx, fixture.conversationId, fixture.agentId);
    await createOrReplaceActiveBatch(ctx, {
      conversationId: fixture.conversationId,
      agentId: fixture.agentId,
      collectedFields: {},
      requestedSlots: [],
    });
  })).rejects.toThrow("active booking session");
});
