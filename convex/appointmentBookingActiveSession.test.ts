/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("getActiveBookingSession queries a live confirming session", async () => {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "session-query-owner",
      email: "session-query@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "session-query-owner",
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
      threadId: "thread-session-query",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId,
      name: "Consultation",
      isActive: true,
      sortOrder: 0,
      durationMinutes: 30,
      fields: [],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId,
      agentId,
      serviceId,
      status: "confirming",
      collectedFields: { name: "Ley" },
      createdAt: now,
      updatedAt: now,
    });
    return { conversationId, sessionId };
  });

  const missing = await t.query(internal.appointmentBooking.currentBooking.getActiveBookingSession, {
    conversationId: ids.conversationId,
  });
  const current = await t.query(internal.appointmentBooking.currentBooking.getCurrentBooking, {
    conversationId: ids.conversationId,
  });

  expect(missing).toMatchObject({
    success: true,
    hasActiveSession: true,
    sessionId: ids.sessionId,
    status: "confirming",
  });
  expect(current.success).toBe(false);
  expect(current.hasActiveSession).toBe(true);
  expect(current.message).toContain("confirming");
});

test("getActiveBookingSession reports when no live session exists", async () => {
  const t = convexTest(schema, modules);
  const conversationId = await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      status: "open",
      assignToAiAgent: true,
      threadId: "thread-session-query-empty",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  const result = await t.query(internal.appointmentBooking.currentBooking.getActiveBookingSession, {
    conversationId,
  });
  expect(result).toMatchObject({
    success: false,
    hasActiveSession: false,
  });
});
