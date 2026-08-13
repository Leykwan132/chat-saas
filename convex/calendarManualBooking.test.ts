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
  const startAt = Date.UTC(2026, 6, 16, 1, 15, 0);
  const endAt = Date.UTC(2026, 6, 16, 2, 0, 0);
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
    const userScheduleId = await ctx.db.insert("userSchedules", {
      agentId,
      workosUserId,
      mode: "scheduled",
      manualStatus: "available",
      timezone: "UTC",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("userShifts", {
      userScheduleId,
      dayOfWeek: 4,
      startMinutes: 0,
      endMinutes: 1440,
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
        { key: "requirements", label: "Requirements", type: "text" },
      ],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, customerId, serviceId, teamId, userId, userScheduleId };
  });
  const authed = t.withIdentity({ subject: workosUserId });
  const selection = {
    agentId: fixture.agentId,
    customerId: fixture.customerId,
    serviceId: fixture.serviceId,
    startAt,
    endAt,
  };
  const options = await authed.query(
    api.appointmentBooking.calendarManualBooking.getCreateOptions,
    { agentId: fixture.agentId },
  );
  expect(options.map((service) => service.serviceId)).toEqual([fixture.serviceId]);

  const beforeNearestSlotRequestAt = Date.now();
  const nearestSlot = await authed.mutation(
    api.appointmentBooking.calendarManualBooking.getNextAvailableSlot,
    {
      agentId: fixture.agentId,
      serviceId: fixture.serviceId,
    },
  );
  expect(nearestSlot).not.toBeNull();
  expect(nearestSlot!.startAt).toBeGreaterThanOrEqual(beforeNearestSlotRequestAt);
  expect(nearestSlot!.startAt - beforeNearestSlotRequestAt).toBeLessThan(31 * 60 * 1000);
  expect(nearestSlot!.endAt - nearestSlot!.startAt).toBe(45 * 60 * 1000);

  await expect(authed.mutation(
    api.appointmentBooking.calendarManualBooking.checkAvailability,
    selection,
  )).resolves.toEqual({ available: true });

  const result = await authed.action(
    api.appointmentBooking.calendarManualBooking.create,
    {
      ...selection,
      collectedFields: {
        date: "2026-07-16",
        time: "1:15am",
      },
      remarks: "  Customer prefers the window seat.  ",
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
    remarks: "Customer prefers the window seat.",
    startAt,
    endAt,
  });
  expect(records.session).toMatchObject({
    customerId: fixture.customerId,
    calendarEventId: result.eventId,
    status: AppointmentBookingSessionStatus.Booked,
    collectedFields: {
      date: "2026-07-16",
      time: "1:15am",
      name: "Calendar Customer",
      phone: "+60123456789",
      email: "customer@example.com",
    },
  });
  expect(records.session).not.toHaveProperty("conversationId");
  expect(records.conversations).toEqual([]);
  expect(records.participants.map((row) => row.role).sort()).toEqual([
    "assigned",
    "customer",
  ]);

  await expect(authed.mutation(
    api.appointmentBooking.calendarManualBooking.checkAvailability,
    selection,
  )).resolves.toEqual({
    available: false,
    message: "That slot is no longer available.",
  });

  const timeOffStartAt = Date.UTC(2026, 6, 16, 3, 0, 0);
  const timeOffEndAt = Date.UTC(2026, 6, 16, 3, 45, 0);
  await t.run(async (ctx) => {
    await ctx.db.insert("userTimeOff", {
      userScheduleId: fixture.userScheduleId,
      startAt: timeOffStartAt,
      endAt: timeOffEndAt,
    });
  });
  await expect(authed.mutation(
    api.appointmentBooking.calendarManualBooking.checkAvailability,
    {
      ...selection,
      startAt: timeOffStartAt,
      endAt: timeOffEndAt,
    },
  )).resolves.toEqual({
    available: false,
    message: "That slot is no longer available.",
  });

  await expect(authed.mutation(
    api.appointmentBooking.statusTransition.updateBookingStatus,
    {
      bookingId: result.eventId,
      status: AppointmentBookingSessionStatus.Completed,
    },
  )).resolves.toEqual({ success: true });
});
