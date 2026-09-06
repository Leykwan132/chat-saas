/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const workpoolModules = {
  complete: () => import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
  config: () => import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
  crons: () => import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
  danger: () => import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
  kick: () => import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
  lib: () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
  logging: () => import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
  loop: () => import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
  recovery: () => import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
  stats: () => import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
  worker: () => import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

test("bookAppointment marks the conversation as booked", async () => {
  const t = convexTest(schema, modules);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  const startAt = Date.UTC(2028, 6, 1, 9, 0, 0);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "booking-owner",
      email: "booking-owner@example.com",
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
      userId: "booking-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const userScheduleId = await ctx.db.insert("userSchedules", {
      agentId,
      workosUserId: "booking-owner",
      mode: "manual",
      manualStatus: "available",
      timezone: "UTC",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      await ctx.db.insert("userShifts", {
        userScheduleId,
        dayOfWeek,
        startMinutes: 0,
        endMinutes: 24 * 60,
      });
    }
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      contactName: "Customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-booking-status",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const previousMessageId = await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      service: "whatsapp",
      externalId: "booking-previous-message",
      orgAddress: "business",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "I would like to book an appointment.",
      createdAt: now + 1,
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
      assignedWorkosUserIds: ["booking-owner"],
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert("workflows", {
      agentId,
      orgId: "",
      userId: "booking-owner",
      name: "Booking workflow",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("workflowNodes", {
      workflowId,
      kind: "bookAppointment",
      title: "Book appointment",
      description: "",
      allowedAppointmentServiceIds: [serviceId],
      isReady: true,
      positionX: 0,
      positionY: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("appointmentBookingSessions", {
      conversationId,
      agentId,
      serviceId,
      status: "collecting",
      collectedFields: {},
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, conversationId, previousMessageId, serviceId };
  });

  const unconfirmedResult = await t.action(internal.appointmentBooking.bookAppointment.bookAppointment, {
    conversationId: ids.conversationId as Id<"conversations">,
    serviceId: ids.serviceId as Id<"appointmentServices">,
    startAt,
  });

  expect(unconfirmedResult.success).toBe(false);
  expect(unconfirmedResult.message).toContain("customer must confirm");

  const availability = await t.mutation(internal.appointmentBooking.sessions.checkAvailability, {
    conversationId: ids.conversationId as Id<"conversations">,
    serviceId: ids.serviceId as Id<"appointmentServices">,
    preferredStartAt: startAt,
  });

  expect(availability.success).toBe(true);

  const offeredResult = await t.action(internal.appointmentBooking.bookAppointment.bookAppointment, {
    conversationId: ids.conversationId as Id<"conversations">,
    serviceId: ids.serviceId as Id<"appointmentServices">,
    startAt,
  });

  expect(offeredResult.success).toBe(false);
  expect(offeredResult.message).toContain("customer must confirm");

  const staleConfirmation = await t.mutation(internal.appointmentBooking.sessions.confirmBookingSlot, {
    conversationId: ids.conversationId as Id<"conversations">,
    serviceId: ids.serviceId as Id<"appointmentServices">,
    startAt,
  });

  expect(staleConfirmation.success).toBe(false);
  expect(staleConfirmation.message).toContain("after availability was offered");

  const confirmationMessageId = await t.run(async (ctx) => await ctx.db.insert("messages", {
    orgId: "",
    conversationId: ids.conversationId,
    service: "whatsapp",
    externalId: "booking-confirmation-message",
    orgAddress: "business",
    contactAddress: "+60123456789",
    direction: "incoming",
    contentType: "text",
    content: "Yes, that time works for me.",
    createdAt: Date.now() + 1000,
  }));

  const confirmation = await t.mutation(internal.appointmentBooking.sessions.confirmBookingSlot, {
    conversationId: ids.conversationId as Id<"conversations">,
    serviceId: ids.serviceId as Id<"appointmentServices">,
    startAt,
  });

  expect(confirmation.success).toBe(true);
  const confirmedSession = await t.run(async (ctx) => {
    const sessions = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", ids.conversationId))
      .collect();
    return sessions[0];
  });
  expect(confirmedSession?.customerConfirmationMessageId).toBe(confirmationMessageId);

  const result = await t.action(internal.appointmentBooking.bookAppointment.bookAppointment, {
    conversationId: ids.conversationId as Id<"conversations">,
    serviceId: ids.serviceId as Id<"appointmentServices">,
    startAt,
  });

  expect(result.success).toBe(true);
  const conversation = await t.run(async (ctx) => await ctx.db.get(ids.conversationId));
  expect(conversation?.status).toBe("booked");
});
