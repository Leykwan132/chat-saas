/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";

const modules = import.meta.glob("./**/*.ts");

test("creates and transitions a customer-direct Calendar booking without a conversation", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "calendar-booking-owner";
  const startAt = Date.UTC(2026, 6, 16, 9, 15, 0);
  const endAt = Date.UTC(2026, 6, 16, 10, 0, 0);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "calendar-booking@example.com",
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
      name: "Calendar Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("userSchedules", {
      agentId,
      workosUserId,
      mode: "manual",
      manualStatus: "available",
      timezone: "UTC",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      service: "manual",
      contactAddress: "",
      name: "Calendar Customer",
      email: "customer@example.com",
      phone: "+60123456789",
      searchText: "calendar customer customer@example.com +60123456789",
      tags: [],
      source: "manual",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId,
      name: "Consultation",
      isActive: true,
      sortOrder: 0,
      durationMinutes: 45,
      timeZone: "UTC",
      fields: [
        { key: "date", label: "Booking Date", type: "date" },
        { key: "time", label: "Booking Time", type: "time" },
      ],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, customerId, serviceId, teamId, userId };
  });
  const authed = t.withIdentity({ subject: workosUserId });
  const selection = {
    agentId: fixture.agentId,
    customerId: fixture.customerId,
    serviceId: fixture.serviceId,
    startAt,
    endAt,
  };

  await expect(authed.mutation(
    api.appointmentBooking.calendarManualBooking.checkAvailability,
    selection,
  )).resolves.toEqual({ available: true });

  const result = await authed.mutation(
    api.appointmentBooking.calendarManualBooking.create,
    {
      ...selection,
      collectedFields: {
        name: "Calendar Customer",
        phone: "+60123456789",
        date: "2026-07-16",
        time: "9:15am",
      },
    },
  );

  const records = await t.run(async (ctx) => ({
    event: await ctx.db.get(result.eventId),
    session: await ctx.db.get(result.sessionId),
    conversations: await ctx.db.query("conversations").take(10),
    participants: await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", result.eventId))
      .take(10),
  }));
  expect(records.event).toMatchObject({
    teamId: fixture.teamId,
    agentId: fixture.agentId,
    appointmentServiceId: fixture.serviceId,
    bookingSource: "manual",
    startAt,
    endAt,
  });
  expect(records.session).toMatchObject({
    customerId: fixture.customerId,
    calendarEventId: result.eventId,
    status: AppointmentBookingSessionStatus.Booked,
  });
  expect(records.session).not.toHaveProperty("conversationId");
  expect(records.conversations).toEqual([]);
  expect(records.participants.map((row) => row.role).sort()).toEqual([
    "assigned",
    "customer",
  ]);

  await expect(authed.mutation(
    api.appointmentBooking.statusTransition.updateBookingStatus,
    {
      bookingId: result.eventId,
      status: AppointmentBookingSessionStatus.Completed,
    },
  )).resolves.toEqual({ success: true });
});
