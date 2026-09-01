/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import { googleCalendarWriteTestDependencies } from "./googleCalendar/writeTestDependencies";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";
import { createGoogleCalendarBookingSyncFetch } from "./googleCalendarBookingSyncTestHelpers";
import {
  runBookAppointment,
  runCancelBookingSession,
  runUpdateBookingAppointment,
  type GoogleCalendarBookingSyncDependencies,
} from "./googleCalendar/bookingSync";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
type MutationRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
type QueryRef = FunctionReference<"query", "internal", Record<string, unknown>, unknown>;
const googleInternal = internal as unknown as {
  googleCalendar: {
    bookingPrepare: { prepareBook: MutationRef };
    bookingFinalize: { rollbackBook: MutationRef; finalizeBook: MutationRef };
    bookingUpdatePrepare: { prepareUpdate: MutationRef; finalizeUpdate: MutationRef };
    bookingCancelPrepare: { prepareCancel: MutationRef; finalizeCancel: MutationRef };
    eventStore: { applyPage: MutationRef };
    syncRecovery: { recoverInvalidSyncToken: MutationRef; reconcileFullSync: MutationRef };
    syncState: {
      beginSyncRun: MutationRef; failSyncRun: MutationRef; finalizeSyncRun: MutationRef;
      getConnectionForSync: QueryRef; renewSyncRunLease: MutationRef;
    };
    connectionStore: { reserve: MutationRef };
  };
};
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
const startAt = Date.UTC(2026, 6, 1, 9, 0, 0);
const endAt = startAt + 30 * 60 * 1000;
const movedStartAt = startAt + 60 * 60 * 1000;

function createTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  t.registerComponent("workflowReminderWorkpool", workpoolSchema, workpoolModules);
  return t;
}

async function createBookingFixture(t: CalendarTest, options?: {
  connect?: "healthy" | "unhealthy";
  booked?: boolean;
}) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "booking-owner", email: "booking-owner@example.com", createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal", name: "Personal", ownerId: userId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent", provider: "openrouter", model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test", templateKey: "blank", fileSize: 0, userId: "booking-owner", orgId: "",
      createdAt: now, updatedAt: now,
    });
    const userScheduleId = await ctx.db.insert("userSchedules", {
      agentId, workosUserId: "booking-owner", mode: "manual", manualStatus: "available",
      timezone: "UTC", enabled: true, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("userShifts", {
      userScheduleId, dayOfWeek: 3, startMinutes: 9 * 60, endMinutes: 17 * 60,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "", service: "whatsapp", orgAddress: "business", contactAddress: "+60123456789",
      contactName: "Customer", status: options?.booked ? "booked" : "open", assignedAgentId: agentId,
      assignToAiAgent: true, threadId: "thread-booking-sync", lastMessageAt: now, unreadCount: 0,
      createdAt: now, updatedAt: now,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId, name: "Consultation", isActive: true, sortOrder: 0, durationMinutes: 30, fields: [],
      timeSlotPolicy: "offer_slots", salesStyle: "neutral", assignmentStrategy: "balanced",
      createdAt: now, updatedAt: now,
    });
    let connectionId: Id<"googleCalendarConnections"> | undefined;
    if (options?.connect !== undefined) {
      connectionId = await ctx.db.insert("googleCalendarConnections", {
        userId, workosUserId: "booking-owner", provider: "google-calendar", primaryCalendarId: "primary",
        timeZone: "UTC",
        state: options.connect === "healthy" ? "connected" : "needs_reauthorization",
        dirtyGeneration: 0,
        lastSuccessfulSyncAt: options.connect === "healthy" ? now : undefined,
        createdAt: now, updatedAt: now,
      });
    }
    const selectedSlot = {
      startAt, endAt, assignedUserId: userId, assignedWorkosUserId: "booking-owner",
    };
    const confirmationAt = now + 1;
    const customerConfirmationMessageId = await ctx.db.insert("messages", {
      orgId: "", conversationId, service: "whatsapp", orgAddress: "business",
      contactAddress: "+60123456789", direction: "incoming", contentType: "text",
      content: "That time works for me.",
      reactions: [{
        emoji: "✅", source: "ai", actorKey: "booking-agent", actorAgentId: agentId,
        createdAt: confirmationAt, updatedAt: confirmationAt,
      }],
      createdAt: confirmationAt,
    });
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId, agentId, serviceId, status: AppointmentBookingSessionStatus.Confirming,
      collectedFields: {}, proposedSlots: [selectedSlot], selectedSlot, customerConfirmationMessageId,
      createdAt: now, updatedAt: now,
    });
    return { userId, teamId, agentId, conversationId, serviceId, sessionId, connectionId, now };
  });
}

type BookingTestDependencies = GoogleCalendarBookingSyncDependencies & {
  refreshCount(): number;
};

function bookingDependencies(
  t: CalendarTest,
  provider: typeof fetch,
): BookingTestDependencies {
  const stores = googleInternal.googleCalendar;
  let refreshCount = 0;
  const write = googleCalendarWriteTestDependencies(t, provider, Date.now);
  return {
    prepareBook: (args) => t.mutation(stores.bookingPrepare.prepareBook, args) as never,
    rollbackBook: (args) => t.mutation(stores.bookingFinalize.rollbackBook, args) as never,
    finalizeBook: (args) => t.mutation(stores.bookingFinalize.finalizeBook, args) as never,
    prepareUpdate: (args) => t.mutation(stores.bookingUpdatePrepare.prepareUpdate, args) as never,
    finalizeUpdate: (args) => t.mutation(stores.bookingUpdatePrepare.finalizeUpdate, args) as never,
    prepareCancel: (args) => t.mutation(stores.bookingCancelPrepare.prepareCancel, args) as never,
    finalizeCancel: (args) => t.mutation(stores.bookingCancelPrepare.finalizeCancel, args) as never,
    refresh: async () => {
      refreshCount += 1;
    },
    write,
    refreshCount: () => refreshCount,
  } as BookingTestDependencies;
}

test("a never-connected assignee creates the existing local-only booking", async () => {
  const t = createTest();
  const fixture = await createBookingFixture(t);
  const result = await runBookAppointment(
    { conversationId: fixture.conversationId, serviceId: fixture.serviceId, startAt },
    bookingDependencies(t, createGoogleCalendarBookingSyncFetch()),
  );
  expect(result).toMatchObject({ success: true });
  const rows = await t.run(async (ctx) => ({
    conversation: await ctx.db.get(fixture.conversationId),
    events: await ctx.db.query("calendarEvents").take(5),
  }));
  expect(rows.conversation?.status).toBe("booked");
  expect(rows.events).toHaveLength(1);
  expect(rows.events[0]?.externalProvider).toBeUndefined();
});

test("a connected assignee is refreshed, then Google creation succeeds before the booking reports success", async () => {
  const t = createTest();
  const fixture = await createBookingFixture(t, { connect: "healthy" });
  const deps = bookingDependencies(t, createGoogleCalendarBookingSyncFetch());
  const result = await runBookAppointment(
    { conversationId: fixture.conversationId, serviceId: fixture.serviceId, startAt },
    deps,
  );
  expect(result).toMatchObject({ success: true });
  expect(deps.refreshCount()).toBeGreaterThan(0);
  const event = await t.run(async (ctx) => (await ctx.db.query("calendarEvents").take(1))[0]);
  expect(event?.externalOrigin).toBe("kilobot");
  expect(event?.externalEventId).toEqual(expect.any(String));
  expect(event?.externalSyncState).toBe("synced");
  expect((await t.run((ctx) => ctx.db.get(fixture.conversationId)))?.status).toBe("booked");
});

test("a connected but unhealthy assignee returns needs_reauthorization and creates neither a local booking nor confirmation", async () => {
  const t = createTest();
  const fixture = await createBookingFixture(t, { connect: "unhealthy" });
  const result = await runBookAppointment(
    { conversationId: fixture.conversationId, serviceId: fixture.serviceId, startAt },
    bookingDependencies(t, createGoogleCalendarBookingSyncFetch()),
  );
  expect(result).toMatchObject({ success: false, kind: "needs_reauthorization" });
  expect(await t.run(async (ctx) => (await ctx.db.query("calendarEvents").take(1)))).toHaveLength(0);
  expect((await t.run((ctx) => ctx.db.get(fixture.conversationId)))?.status).toBe("open");
});

async function insertBookedEvent(
  t: CalendarTest,
  fixture: Awaited<ReturnType<typeof createBookingFixture>>,
) {
  return await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId, title: "Consultation - Customer", startAt, endAt, timeZone: "UTC",
      status: "confirmed", createdBy: fixture.userId, agentId: fixture.agentId,
      conversationId: fixture.conversationId, appointmentServiceId: fixture.serviceId,
      bookingSource: "ai", externalProvider: "google", externalCalendarId: "primary",
      externalEventId: "existing_event", externalOwnerUserId: fixture.userId, externalOrigin: "kilobot",
      externalStatus: "confirmed", externalTransparency: "opaque", externalCanEdit: true,
      externalSyncState: "synced", externalEtag: '"etag_1"', createdAt: fixture.now, updatedAt: fixture.now,
    });
    await ctx.db.insert("calendarEventParticipants", {
      eventId, teamId: fixture.teamId, participantType: "teamUser", role: "assigned",
      userId: fixture.userId, email: "booking-owner@example.com", displayName: "Owner",
      eventStartAt: startAt, eventEndAt: endAt, responseStatus: "accepted",
      createdAt: fixture.now, updatedAt: fixture.now,
    });
    await ctx.db.patch(fixture.sessionId, {
      calendarEventId: eventId,
      status: AppointmentBookingSessionStatus.Editing,
      updatedAt: fixture.now,
    });
    return eventId;
  });
}

test("updating a connected booking reports conflict without changing the local booking session", async () => {
  const t = createTest();
  const fixture = await createBookingFixture(t, { connect: "healthy", booked: true });
  const eventId = await insertBookedEvent(t, fixture);
  const deps = bookingDependencies(t, async (_input, init) => {
    if (init?.method === "GET") {
      return Response.json({
        id: "existing_event", status: "confirmed", summary: "Consultation - Customer",
        etag: '"etag_2"', organizer: { self: true },
        start: { dateTime: new Date(startAt).toISOString(), timeZone: "UTC" },
        end: { dateTime: new Date(endAt).toISOString(), timeZone: "UTC" },
      });
    }
    return new Response(null, { status: 412 });
  });
  const result = await runUpdateBookingAppointment(
    { conversationId: fixture.conversationId, serviceId: fixture.serviceId, startAt: movedStartAt },
    deps,
  );
  expect(result).toMatchObject({ success: false, kind: "conflict" });
  const rows = await t.run(async (ctx) => ({
    event: await ctx.db.get(eventId),
    session: await ctx.db.get(fixture.sessionId),
  }));
  expect(rows.event?.startAt).toBe(startAt);
  expect(rows.session?.status).toBe("editing");
  expect(rows.session?.selectedSlot?.startAt).toBe(startAt);
});

test("cancelling a connected booking reports success only after Google deletion succeeds", async () => {
  const failingTest = createTest();
  const failingFixture = await createBookingFixture(failingTest, { connect: "healthy", booked: true });
  const failingEventId = await insertBookedEvent(failingTest, failingFixture);
  await failingTest.run((ctx) => ctx.db.patch(failingFixture.sessionId, {
    status: AppointmentBookingSessionStatus.Booked, updatedAt: failingFixture.now,
  }));
  const failing = await runCancelBookingSession(
    { conversationId: failingFixture.conversationId },
    bookingDependencies(failingTest, async () => new Response(null, { status: 500 })),
  );
  expect(failing).toMatchObject({ success: false, kind: "retryable" });
  expect((await failingTest.run((ctx) => ctx.db.get(failingEventId)))?.status).toBe("confirmed");
  expect((await failingTest.run((ctx) => ctx.db.get(failingFixture.sessionId)))?.status).toBe("booked");

  const t = createTest();
  const fixture = await createBookingFixture(t, { connect: "healthy", booked: true });
  const eventId = await insertBookedEvent(t, fixture);
  await t.run((ctx) => ctx.db.patch(fixture.sessionId, {
    status: AppointmentBookingSessionStatus.Booked, updatedAt: fixture.now,
  }));
  const succeeding = await runCancelBookingSession(
    { conversationId: fixture.conversationId },
    bookingDependencies(t, async () => new Response(null, { status: 204 })),
  );
  expect(succeeding).toMatchObject({ success: true });
  expect((await t.run((ctx) => ctx.db.get(eventId)))?.status).toBe("cancelled");
  expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe("cancelled");
});
