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

async function createFixture(status: "booked" | "editing") {
  const t = convexTest(schema, modules);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "cancel-user",
      email: "cancel@example.com",
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
      userId: "cancel-user",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "biz",
      contactAddress: "customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-cancel",
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
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Consultation - Customer",
      startAt: now + 3600000,
      endAt: now + 5400000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      agentId,
      conversationId,
      appointmentServiceId: serviceId,
      bookingSource: "ai",
      createdAt: now,
      updatedAt: now,
    });
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId,
      agentId,
      serviceId,
      status,
      collectedFields: {},
      calendarEventId: eventId,
      createdAt: now,
      updatedAt: now,
    });
    return { conversationId, eventId, sessionId };
  });
  return { t, ...ids };
}

test("cancelBookingSession cancels an existing confirmed appointment", async () => {
  const { t, conversationId, eventId, sessionId } = await createFixture("booked");

  const result = await t.action(internal.appointmentBooking.cancellations.cancelBookingSession, {
    conversationId,
  });

  expect(result.success).toBe(true);
  const rows = await t.run(async (ctx) => ({
    event: await ctx.db.get(eventId),
    session: await ctx.db.get(sessionId),
  }));
  expect(rows.event?.status).toBe("cancelled");
  expect(rows.session?.status).toBe("cancelled");
});

test("cancelBookingSession cancels an edit without cancelling the appointment", async () => {
  const { t, conversationId, eventId, sessionId } = await createFixture("editing");

  const result = await t.action(internal.appointmentBooking.cancellations.cancelBookingSession, {
    conversationId: conversationId as Id<"conversations">,
  });

  expect(result.success).toBe(true);
  const rows = await t.run(async (ctx) => ({
    event: await ctx.db.get(eventId),
    session: await ctx.db.get(sessionId),
  }));
  expect(rows.event?.status).toBe("confirmed");
  expect(rows.session?.status).toBe("booked");
});
