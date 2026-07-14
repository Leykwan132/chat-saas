/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("manual booking checks and revalidates the exact selected slot", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "manual-booking-owner";
  const startAt = Date.UTC(2026, 6, 14, 9, 11, 0);
  const endAt = Date.UTC(2026, 6, 14, 10, 26, 0);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "manual-booking@example.com",
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
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      contactName: "Customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-manual-booking",
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
    return { userId, teamId, conversationId, serviceId };
  });
  const authed = t.withIdentity({ subject: workosUserId });
  const selection = {
    conversationId: fixture.conversationId,
    serviceId: fixture.serviceId,
    startAt,
    endAt,
  };

  await expect(authed.mutation(
    api.appointmentBooking.manualBooking.checkAvailability,
    selection,
  )).resolves.toEqual({ available: true });

  await t.run(async (ctx) => {
    const now = Date.now();
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId,
      title: "Existing booking",
      startAt,
      endAt,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: fixture.userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("calendarEventParticipants", {
      eventId,
      teamId: fixture.teamId,
      participantType: "teamUser",
      role: "assigned",
      userId: fixture.userId,
      email: "manual-booking@example.com",
      eventStartAt: startAt,
      createdAt: now,
      updatedAt: now,
    });
  });

  await expect(authed.mutation(
    api.appointmentBooking.manualBooking.checkAvailability,
    selection,
  )).resolves.toEqual({
    available: false,
    message: "That slot is no longer available.",
  });
  await expect(authed.mutation(api.appointmentBooking.manualBooking.create, {
    ...selection,
    collectedFields: { date: "2026-07-14", time: "9:11 AM" },
  })).rejects.toThrow("That slot is no longer available.");

  await expect(authed.mutation(
    api.appointmentBooking.manualBooking.checkAvailability,
    { ...selection, endAt: startAt },
  )).rejects.toThrow("End time must be after start time.");
});
