/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createAvailabilityFixture(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "batch-availability-owner",
      email: "owner@example.com",
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
      userId: "batch-availability-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const scheduleId = await ctx.db.insert("userSchedules", {
      agentId,
      workosUserId: "batch-availability-owner",
      mode: "manual",
      manualStatus: "available",
      timezone: "UTC",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      await ctx.db.insert("userShifts", {
        userScheduleId: scheduleId,
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
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-batch-availability",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const messageId = await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      service: "whatsapp",
      externalId: "batch-request",
      orgAddress: "business",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "Book all five dates",
      agentMessageId: "batch-request-agent-message",
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
      assignmentStrategy: "balanced",
      assignedWorkosUserIds: ["batch-availability-owner"],
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert("workflows", {
      agentId,
      orgId: "",
      userId: "batch-availability-owner",
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
    return { agentId, conversationId, messageId, scheduleId, serviceId, userId };
  });
}

const requestedStarts = [
  Date.UTC(2028, 0, 1, 14),
  Date.UTC(2028, 0, 3, 14),
  Date.UTC(2028, 0, 5, 14),
  Date.UTC(2028, 0, 8, 14),
  Date.UTC(2028, 0, 9, 14),
];

test("five available requested times create one confirmed pending batch", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createAvailabilityFixture(t);

  const availability = await t.mutation(
    internal.appointmentBooking.sessions.checkAvailability,
    {
      conversationId: fixture.conversationId,
      serviceId: fixture.serviceId,
      preferredStartAts: requestedStarts,
      customerRequestAgentMessageId: "batch-request-agent-message",
    },
  );

  expect(availability).toMatchObject({
    success: true,
    allAvailable: true,
    missingFields: ["Customer Name", "Phone Number"],
    readyForBooking: false,
  });
  expect(availability.requested).toHaveLength(5);
  const batch = await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("appointmentBookingBatches")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .take(2);
    return rows[0];
  });
  expect(batch).toMatchObject({
    status: "collecting",
    customerConfirmationMessageId: fixture.messageId,
  });
  expect(batch?.requestedSlots.map((slot) => slot.startAt)).toEqual(requestedStarts);

  const details = await t.mutation(
    internal.appointmentBooking.sessions.startBookingSession,
    {
      conversationId: fixture.conversationId,
      serviceId: fixture.serviceId,
      collectedFields: { name: "Aisha", phone: "+60123456789" },
    },
  );
  expect(details).toMatchObject({
    bookingKind: "batch",
    status: "confirming",
    readyForBooking: true,
  });
});

test("a batch takes over an unbooked single session and keeps its customer details", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createAvailabilityFixture(t);
  const sessionId = await t.run((ctx) => ctx.db.insert("appointmentBookingSessions", {
    conversationId: fixture.conversationId,
    agentId: fixture.agentId,
    serviceId: fixture.serviceId,
    status: "collecting",
    collectedFields: { name: "Aisha" },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  const availability = await t.mutation(
    internal.appointmentBooking.sessions.checkAvailability,
    {
      conversationId: fixture.conversationId,
      serviceId: fixture.serviceId,
      preferredStartAts: requestedStarts,
    },
  );

  expect(availability).toMatchObject({ success: true, allAvailable: true, missingFields: ["Phone Number"] });
  const rows = await t.run(async (ctx) => ({
    session: await ctx.db.get(sessionId),
    batch: await ctx.db
      .query("appointmentBookingBatches")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .first(),
  }));
  expect(rows.session?.status).toBe("cancelled");
  expect(rows.batch?.collectedFields).toEqual({ name: "Aisha" });
});

test("one unavailable requested time prevents creation of the entire batch", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createAvailabilityFixture(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("userTimeOff", {
      userScheduleId: fixture.scheduleId,
      startAt: requestedStarts[2]!,
      endAt: requestedStarts[2]! + 30 * 60 * 1000,
      label: "Unavailable",
    });
  });

  const result = await t.mutation(
    internal.appointmentBooking.sessions.checkAvailability,
    {
      conversationId: fixture.conversationId,
      serviceId: fixture.serviceId,
      preferredStartAts: requestedStarts,
      customerRequestAgentMessageId: "batch-request-agent-message",
    },
  );

  expect(result).toMatchObject({
    success: true,
    allAvailable: false,
    unavailable: [requestedStarts[2]],
  });
  const batches = await t.run(async (ctx) =>
    ctx.db
      .query("appointmentBookingBatches")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .take(2),
  );
  expect(batches).toEqual([]);
});

test.each([
  { name: "empty", starts: [] },
  { name: "duplicate", starts: [requestedStarts[0]!, requestedStarts[0]!] },
  { name: "past", starts: [0, requestedStarts[1]!] },
  { name: "more than ten", starts: Array.from({ length: 11 }, (_, index) => requestedStarts[0]! + index * 86_400_000) },
  { name: "overlapping", starts: [requestedStarts[0]!, requestedStarts[0]! + 15 * 60 * 1000] },
])("rejects $name batch availability input", async ({ starts }) => {
  const t = convexTest(schema, modules);
  const fixture = await createAvailabilityFixture(t);
  const result = await t.mutation(
    internal.appointmentBooking.sessions.checkAvailability,
    {
      conversationId: fixture.conversationId as Id<"conversations">,
      serviceId: fixture.serviceId as Id<"appointmentServices">,
      preferredStartAts: starts,
    },
  );
  expect(result).toMatchObject({ success: false, allAvailable: false });
});
