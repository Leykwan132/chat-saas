/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
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

const starts = [1, 3, 5, 8, 9].map((day) => Date.UTC(2028, 0, day, 14));

async function createFixture(t: ReturnType<typeof convexTest>) {
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

function createTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  return t;
}

test("creates all five local bookings atomically with chronological round robin", async () => {
  vi.useFakeTimers();
  const t = createTest();
  const fixture = await createFixture(t);
  const result = await t.action(
    internal.appointmentBooking.bookAppointments.bookAppointments,
    { conversationId: fixture.conversationId, serviceId: fixture.serviceId, startAts: starts },
  );
  expect(result).toMatchObject({ success: true });
  expect(result.bookings).toHaveLength(5);
  expect(result.bookings.map((booking) => booking.assignedTo)).toEqual([
    "Owner", "Teammate", "Owner", "Teammate", "Owner",
  ]);
  const confirmation = await t.mutation(
    internal.appointmentBooking.confirmations.sendBatchBookingConfirmation,
    { conversationId: fixture.conversationId },
  );
  expect(confirmation).toMatchObject({ success: true });
  expect(confirmation.confirmationMessage?.match(/Your booking is confirmed!/g)).toHaveLength(5);
  expect(confirmation.confirmationMessage?.match(/Booking reference:/g)).toHaveLength(5);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const state = await t.run(async (ctx) => ({
    batch: (await ctx.db.query("appointmentBookingBatches").collect())[0],
    conversation: await ctx.db.get(fixture.conversationId),
    events: await ctx.db.query("calendarEvents").collect(),
    participants: await ctx.db.query("calendarEventParticipants").collect(),
    sessions: await ctx.db.query("appointmentBookingSessions").collect(),
    logs: await ctx.db.query("conversationLogs").collect(),
  }));
  expect(state.events).toHaveLength(5);
  expect(state.participants).toHaveLength(10);
  expect(state.sessions).toHaveLength(5);
  expect(state.logs.filter((row) => row.action === "event_booked")).toHaveLength(5);
  expect(state.batch).toMatchObject({ status: "booked" });
  expect(state.batch?.calendarEventIds).toHaveLength(5);
  expect(state.batch?.sessionIds).toHaveLength(5);
  expect(state.conversation?.status).toBe("booked");
  vi.useRealTimers();
});

test("creates no child records when any confirmed slot becomes unavailable", async () => {
  const t = createTest();
  const fixture = await createFixture(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("userTimeOff", {
      userScheduleId: fixture.scheduleIds[0]!,
      startAt: starts[4]!,
      endAt: starts[4]! + 30 * 60 * 1000,
      label: "Unavailable",
    });
    await ctx.db.insert("userTimeOff", {
      userScheduleId: fixture.scheduleIds[1]!,
      startAt: starts[4]!,
      endAt: starts[4]! + 30 * 60 * 1000,
      label: "Unavailable",
    });
  });
  const result = await t.action(internal.appointmentBooking.bookAppointments.bookAppointments, {
    conversationId: fixture.conversationId,
    serviceId: fixture.serviceId,
    startAts: starts,
  });
  expect(result).toMatchObject({ success: false });
  const counts = await t.run(async (ctx) => ({
    events: (await ctx.db.query("calendarEvents").collect()).length,
    sessions: (await ctx.db.query("appointmentBookingSessions").collect()).length,
  }));
  expect(counts).toEqual({ events: 0, sessions: 0 });
});

test.each([{ startAts: starts.slice(0, 4) }, { startAts: [...starts].reverse() }])(
  "rejects a partial or reordered confirmed list",
  async ({ startAts }) => {
    const t = createTest();
    const fixture = await createFixture(t);
    const result = await t.action(internal.appointmentBooking.bookAppointments.bookAppointments, {
      conversationId: fixture.conversationId,
      serviceId: fixture.serviceId,
      startAts,
    });
    expect(result).toMatchObject({ success: false });
    expect(await t.run(async (ctx) => (await ctx.db.query("calendarEvents").collect()).length)).toBe(0);
  },
);
