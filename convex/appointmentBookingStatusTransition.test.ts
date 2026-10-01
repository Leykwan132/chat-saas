/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { runBookingStatusChange } from "./appointmentBooking/statusTransition";

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

  await authed.action(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "no_show",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe("no_show");
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");

  await authed.action(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "cancelled",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("cancelled");

  await authed.action(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "booked",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");
});

test("rejects a booking owned by another team without changing either row", async () => {
  const { t, workosUserId, fixture } = await createFixture();
  await t.run((ctx) => ctx.db.patch(fixture.eventId, { teamId: fixture.otherTeamId }));
  const authed = t.withIdentity({ subject: workosUserId });

  await expect(authed.action(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "cancelled",
  })).rejects.toThrow("Booking not found");

  expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe("booked");
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");
});

test("cancelling a Google-linked booking deletes it from Google before changing Kilobot", async () => {
  const calls: string[] = [];
  const result = await runBookingStatusChange(
    { bookingId: "event" as Id<"calendarEvents">, status: "cancelled" },
    {
      validate: async () => {
        calls.push("validate");
        return { googleCancellationNeeded: true };
      },
      cancelInGoogle: async ({ eventId }) => calls.push(`google:${eventId}`),
      apply: async () => {
        calls.push("apply");
        return { success: true };
      },
    },
  );
  expect(result).toEqual({ success: true });
  expect(calls).toEqual(["validate", "google:event", "apply"]);
});

test("a failed Google deletion leaves the Kilobot booking unchanged", async () => {
  const applied: string[] = [];
  await expect(runBookingStatusChange(
    { bookingId: "event" as Id<"calendarEvents">, status: "cancelled" },
    {
      validate: async () => ({ googleCancellationNeeded: true }),
      cancelInGoogle: async () => {
        throw new Error("Google Calendar is temporarily unavailable.");
      },
      apply: async () => {
        applied.push("apply");
        return { success: true };
      },
    },
  )).rejects.toThrow("temporarily unavailable");
  expect(applied).toEqual([]);
});

test("only a cancellation of a live Google event needs a Google deletion", async () => {
  const { t, workosUserId, fixture } = await createFixture();
  const authed = t.withIdentity({ subject: workosUserId });
  const validate = (status: "cancelled" | "completed" | "booked") =>
    authed.query(internal.appointmentBooking.statusTransition.validateBookingStatusChange, {
      bookingId: fixture.eventId,
      status,
    });

  expect(await validate("cancelled")).toEqual({ googleCancellationNeeded: false });
  await t.run((ctx) => ctx.db.patch(fixture.eventId, {
    externalProvider: "google",
    externalEventId: "google-event",
    externalOrigin: "kilobot",
    externalStatus: "confirmed",
  }));
  expect(await validate("cancelled")).toEqual({ googleCancellationNeeded: true });
  expect(await validate("completed")).toEqual({ googleCancellationNeeded: false });

  await t.run((ctx) => ctx.db.patch(fixture.eventId, { status: "cancelled", externalStatus: "cancelled" }));
  expect(await validate("cancelled")).toEqual({ googleCancellationNeeded: false });
  await expect(validate("booked")).rejects.toThrow("removed from Google Calendar");
});
