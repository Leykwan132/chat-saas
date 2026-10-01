/// <reference types="vite/client" />
import { expect, test } from "vitest";
import type { FunctionReference } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";
import { createTest } from "./appointmentBookingBatchCreate.testFixture";
import { executeDeleteCalendarEvent } from "./googleCalendar/agentTools";
import { runCancelBookingSession, type GoogleCalendarBookingSyncDependencies } from "./googleCalendar/bookingSync";

type MutationRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
const stores = (internal as unknown as {
  googleCalendar: { bookingCancelPrepare: { prepareCancel: MutationRef; finalizeCancel: MutationRef } };
}).googleCalendar.bookingCancelPrepare;
const startAt = Date.UTC(2026, 9, 14, 3);

async function createFixture(t: ReturnType<typeof createTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "cancel-owner", email: "cancel-owner@example.com", createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal", name: "Personal", ownerId: userId, createdAt: now, updatedAt: now,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent", provider: "openrouter", model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test", templateKey: "blank", fileSize: 0, userId: "cancel-owner", orgId: "",
      createdAt: now, updatedAt: now,
    });
    const conversation = (contactAddress: string) => ctx.db.insert("conversations", {
      orgId: "", service: "whatsapp", orgAddress: "business", contactAddress, contactName: "Customer",
      status: "booked", assignedAgentId: agentId, assignToAiAgent: true, threadId: `thread-${contactAddress}`,
      lastMessageAt: now, unreadCount: 0, createdAt: now, updatedAt: now,
    });
    const conversationId = await conversation("+60111111111");
    const otherConversationId = await conversation("+60222222222");
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId, name: "Consultation", isActive: true, sortOrder: 0, durationMinutes: 30, fields: [],
      timeSlotPolicy: "offer_slots", salesStyle: "neutral", assignmentStrategy: "balanced",
      createdAt: now, updatedAt: now,
    });
    const book = async (owner: Id<"conversations">) => {
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId, title: "Consultation - Customer", startAt, endAt: startAt + 30 * 60 * 1000,
        timeZone: "UTC", status: "confirmed", createdBy: userId, agentId, conversationId: owner,
        appointmentServiceId: serviceId, bookingSource: "ai", externalOrigin: "kilobot",
        createdAt: now, updatedAt: now,
      });
      await ctx.db.insert("appointmentBookingSessions", {
        conversationId: owner, agentId, serviceId, status: AppointmentBookingSessionStatus.Booked,
        collectedFields: {}, calendarEventId: eventId, createdAt: now, updatedAt: now,
      });
      return eventId;
    };
    const bookingId = await book(conversationId);
    const secondBookingId = await book(conversationId);
    const otherBookingId = await book(otherConversationId);
    const pendingSessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId, agentId, serviceId, status: AppointmentBookingSessionStatus.Collecting,
      collectedFields: {}, createdAt: now + 1, updatedAt: now + 1,
    });
    return { conversationId, bookingId, secondBookingId, otherBookingId, pendingSessionId };
  });
}

function syncDependencies(t: ReturnType<typeof createTest>) {
  return {
    prepareCancel: (args) => t.mutation(stores.prepareCancel, args) as never,
    finalizeCancel: (args) => t.mutation(stores.finalizeCancel, args) as never,
    refresh: async () => undefined,
    write: {} as GoogleCalendarBookingSyncDependencies["write"],
  } satisfies Pick<GoogleCalendarBookingSyncDependencies, "prepareCancel" | "finalizeCancel" | "refresh" | "write">;
}

function cancelDependencies(t: ReturnType<typeof createTest>) {
  const booking = syncDependencies(t);
  return {
    cancelBooking: (args: { conversationId: Id<"conversations">; bookingId: Id<"calendarEvents"> }) =>
      runCancelBookingSession(args, booking),
  };
}

async function statusOf(t: ReturnType<typeof createTest>, eventId: Id<"calendarEvents">) {
  return (await t.run((ctx) => ctx.db.get(eventId)))?.status;
}

test("cancels the named booking even while another booking session is in progress", async () => {
  const t = createTest();
  const fixture = await createFixture(t);

  const result = await executeDeleteCalendarEvent(
    { conversationId: fixture.conversationId, bookingIds: [fixture.bookingId], confirmed: true },
    cancelDependencies(t),
  );

  expect(result).toMatchObject({ success: true });
  expect(await statusOf(t, fixture.bookingId)).toBe("cancelled");
  expect(await statusOf(t, fixture.secondBookingId)).toBe("confirmed");
});

test("cancelBooking stops an in-progress session that has no booking yet", async () => {
  const t = createTest();
  const fixture = await createFixture(t);

  const result = await runCancelBookingSession({ conversationId: fixture.conversationId }, syncDependencies(t));

  expect(result).toMatchObject({ success: true, message: "Booking session stopped. No booking was made." });
  expect((await t.run((ctx) => ctx.db.get(fixture.pendingSessionId)))?.status).toBe("cancelled");
  expect(await statusOf(t, fixture.bookingId)).toBe("confirmed");
});

test("cancels several bookings in one call", async () => {
  const t = createTest();
  const fixture = await createFixture(t);

  const result = await executeDeleteCalendarEvent(
    {
      conversationId: fixture.conversationId,
      bookingIds: [fixture.bookingId, fixture.secondBookingId],
      confirmed: true,
    },
    cancelDependencies(t),
  );

  expect(result).toMatchObject({ success: true, message: "Cancelled 2 of 2 bookings." });
  expect(await statusOf(t, fixture.bookingId)).toBe("cancelled");
  expect(await statusOf(t, fixture.secondBookingId)).toBe("cancelled");
});

test("reports each booking outcome and never cancels another customer's booking", async () => {
  const t = createTest();
  const fixture = await createFixture(t);

  const result = await executeDeleteCalendarEvent(
    {
      conversationId: fixture.conversationId,
      bookingIds: [fixture.bookingId, fixture.otherBookingId],
      confirmed: true,
    },
    cancelDependencies(t),
  );

  expect(result).toMatchObject({
    success: false,
    bookings: [
      { bookingId: fixture.bookingId, success: true },
      { bookingId: fixture.otherBookingId, success: false, message: "No active booking to cancel." },
    ],
  });
  expect(await statusOf(t, fixture.otherBookingId)).toBe("confirmed");
});

test("rejects duplicate booking IDs before cancelling anything", async () => {
  const t = createTest();
  const fixture = await createFixture(t);

  const result = await executeDeleteCalendarEvent(
    {
      conversationId: fixture.conversationId,
      bookingIds: [fixture.bookingId, fixture.bookingId],
      confirmed: true,
    },
    cancelDependencies(t),
  );

  expect(result).toMatchObject({ success: false, kind: "invalid_request" });
  expect(await statusOf(t, fixture.bookingId)).toBe("confirmed");
});
