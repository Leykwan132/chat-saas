/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
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

export const starts = [1, 3, 5, 8, 9].map((day) => Date.UTC(2028, 0, day, 14));

export async function createFixture(t: ReturnType<typeof convexTest>) {
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const workosUserIds = ["batch-owner", "batch-teammate"];
    const userIds = [];
    for (const [index, workosUserId] of workosUserIds.entries()) {
      userIds.push(await ctx.db.insert("users", {
        workosUserId,
        email: `${workosUserId}@example.com`,
        firstName: index === 0 ? "Owner" : "Teammate",
        createdAt: now,
        updatedAt: now,
      }));
    }
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userIds[0]!,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userIds[0]!, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserIds[0]!,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const scheduleIds = [];
    for (const [index, workosUserId] of workosUserIds.entries()) {
      const scheduleId = await ctx.db.insert("userSchedules", {
        agentId,
        workosUserId,
        mode: "manual",
        manualStatus: "available",
        timezone: "UTC",
        enabled: true,
        createdAt: now + index,
        updatedAt: now,
      });
      scheduleIds.push(scheduleId);
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
        await ctx.db.insert("userShifts", {
          userScheduleId: scheduleId,
          dayOfWeek,
          startMinutes: 0,
          endMinutes: 1440,
        });
      }
    }
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "batch-create-thread",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      service: "whatsapp",
      externalId: "batch-confirmation",
      orgAddress: "business",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "Yes, book all five",
      agentMessageId: "batch-confirmation-message",
      createdAt: now + 1,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId,
      name: "Consultation",
      isActive: true,
      sortOrder: 0,
      durationMinutes: 30,
      fields: [
        { key: "name", label: "Customer Name", type: "text" },
        { key: "phone", label: "Phone Number", type: "phone" },
      ],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "round_robin",
      assignedWorkosUserIds: workosUserIds,
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert("workflows", {
      agentId,
      orgId: "",
      userId: workosUserIds[0]!,
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
    return { agentId, conversationId, scheduleIds, serviceId, userIds };
  });
  await t.mutation(internal.appointmentBooking.sessions.checkAvailability, {
    conversationId: fixture.conversationId,
    serviceId: fixture.serviceId,
    preferredStartAts: starts,
    customerRequestAgentMessageId: "batch-confirmation-message",
  });
  await t.mutation(internal.appointmentBooking.sessions.startBookingSession, {
    conversationId: fixture.conversationId,
    serviceId: fixture.serviceId,
    collectedFields: { name: "Aisha", phone: "+60123456789" },
  });
  return fixture;
}

export function createTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  return t;
}
