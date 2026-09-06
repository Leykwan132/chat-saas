/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("confirmBookingSlot uses the customer message without waiting for a reaction", async () => {
  const t = convexTest(schema, modules);
  const startAt = Date.UTC(2028, 6, 1, 9, 0, 0);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "confirm-retry-owner",
      email: "confirm-retry@example.com",
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
      userId: "confirm-retry-owner",
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
      threadId: "thread-confirm-retry",
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
    const offeredAt = now;
    const confirmationMessageId = await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      service: "whatsapp",
      externalId: "confirm-retry-message",
      orgAddress: "business",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "Yes",
      createdAt: offeredAt + 1,
    });
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId,
      agentId,
      serviceId,
      status: "confirming",
      collectedFields: {},
      proposedSlots: [{
        startAt,
        endAt: startAt + 30 * 60 * 1000,
        assignedUserId: userId,
        assignedWorkosUserId: "confirm-retry-owner",
        assignedDisplayName: "Owner",
      }],
      createdAt: offeredAt,
      updatedAt: offeredAt,
    });
    return { conversationId, serviceId, sessionId, confirmationMessageId, offeredAt };
  });

  const first = await t.mutation(internal.appointmentBooking.sessions.confirmBookingSlot, {
    conversationId: ids.conversationId,
    serviceId: ids.serviceId,
    startAt,
  });
  const second = await t.mutation(internal.appointmentBooking.sessions.confirmBookingSlot, {
    conversationId: ids.conversationId,
    serviceId: ids.serviceId,
    startAt,
  });
  const session = await t.run(async (ctx) => await ctx.db.get(ids.sessionId));

  expect(first.success).toBe(true);
  expect(second.success).toBe(true);
  expect(session?.status).toBe("confirming");
  expect(session?.updatedAt).toBe(ids.offeredAt);
  expect(session?.customerConfirmationMessageId).toBe(ids.confirmationMessageId);
});
