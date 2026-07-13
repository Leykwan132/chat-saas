/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const createFixture = async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "booking-status-owner";
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "status-owner@example.com",
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
    const otherTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Other",
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
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "status-thread",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Consultation",
      startAt: now + 3_600_000,
      endAt: now + 5_400_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      agentId,
      conversationId,
      bookingSource: "manual",
      createdAt: now,
      updatedAt: now,
    });
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId,
      agentId,
      status: "booked",
      collectedFields: {},
      calendarEventId: eventId,
      createdAt: now,
      updatedAt: now,
    });
    return { eventId, sessionId, teamId, otherTeamId };
  });
  return { t, workosUserId, fixture };
};

test("updates the booking session and calendar event statuses together", async () => {
  const { t, workosUserId, fixture } = await createFixture();
  const authed = t.withIdentity({ subject: workosUserId });

  await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "no_show",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe("no_show");
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");

  await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "cancelled",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("cancelled");

  await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "booked",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");
});

test("rejects a booking owned by another team without changing either row", async () => {
  const { t, workosUserId, fixture } = await createFixture();
  await t.run((ctx) => ctx.db.patch(fixture.eventId, { teamId: fixture.otherTeamId }));
  const authed = t.withIdentity({ subject: workosUserId });

  await expect(authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "cancelled",
  })).rejects.toThrow("Booking not found");

  expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe("booked");
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");
});
