/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import { runGoogleCalendarSync, type GoogleCalendarSyncDependencies } from "./googleCalendar/syncWorker";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
type MutationRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
type QueryRef = FunctionReference<"query", "internal", Record<string, unknown>, unknown>;
const googleInternal = internal as unknown as {
  googleCalendar: {
    eventStore: { applyPage: MutationRef };
    syncRecovery: { recoverInvalidSyncToken: MutationRef; reconcileFullSync: MutationRef };
    syncState: {
      beginSyncRun: MutationRef; failSyncRun: MutationRef; finalizeSyncRun: MutationRef;
      getConnectionForSync: QueryRef; renewSyncRunLease: MutationRef;
    };
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
const movedStart = "2026-08-15T10:00:00.000Z";
const movedEnd = "2026-08-15T10:30:00.000Z";

afterEach(() => {
  vi.useRealTimers();
});

function syncDependencies(t: CalendarTest): GoogleCalendarSyncDependencies {
  const value = googleInternal.googleCalendar;
  return {
    getConnection: (args) => t.query(value.syncState.getConnectionForSync, args) as never,
    beginRun: (args) => t.mutation(value.syncState.beginSyncRun, args) as never,
    renewRun: (args) => t.mutation(value.syncState.renewSyncRunLease, args) as never,
    applyPage: (args) => t.mutation(value.eventStore.applyPage, args) as never,
    finalizeRun: (args) => t.mutation(value.syncState.finalizeSyncRun, args) as never,
    failRun: (args) => t.mutation(value.syncState.failSyncRun, args) as never,
    recoverInvalidToken: (args) => t.mutation(value.syncRecovery.recoverInvalidSyncToken, args) as never,
    reconcileFullRun: (args) => t.mutation(value.syncRecovery.reconcileFullSync, args) as never,
  };
}

async function createSyncedBooking(t: CalendarTest) {
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  t.registerComponent("workflowReminderWorkpool", workpoolSchema, workpoolModules);
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "sync-owner", email: "sync-owner@example.com", createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal", name: "Personal", ownerId: userId, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent", provider: "openrouter", model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test", templateKey: "blank", fileSize: 0, userId: "sync-owner", orgId: "",
      createdAt: now, updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "", service: "whatsapp", orgAddress: "business", contactAddress: "+60123456789",
      status: "booked", assignedAgentId: agentId, assignToAiAgent: true, threadId: "thread-sync",
      lastMessageAt: now, unreadCount: 0, createdAt: now, updatedAt: now,
    });
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId, title: "Consultation - Customer", startAt, endAt, timeZone: "UTC", status: "confirmed",
      createdBy: userId, agentId, conversationId, bookingSource: "ai", externalProvider: "google",
      externalCalendarId: "primary", externalEventId: "booking_event", externalOwnerUserId: userId,
      externalOrigin: "kilobot", externalStatus: "confirmed", externalTransparency: "opaque",
      externalCanEdit: true, externalSyncState: "synced", createdAt: now, updatedAt: now,
    });
    const participantId = await ctx.db.insert("calendarEventParticipants", {
      eventId, teamId, participantType: "teamUser", role: "assigned", userId,
      email: "sync-owner@example.com", displayName: "Owner", eventStartAt: startAt, eventEndAt: endAt,
      responseStatus: "accepted", createdAt: now, updatedAt: now,
    });
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId, agentId, status: "booked", collectedFields: {},
      selectedSlot: { startAt, endAt, assignedUserId: userId, assignedWorkosUserId: "sync-owner" },
      calendarEventId: eventId, createdAt: now, updatedAt: now,
    });
    const workflowId = await ctx.db.insert("workflows", {
      agentId, orgId: "", userId: "sync-owner", name: "Workflow", createdAt: now, updatedAt: now,
    });
    const reminderId = await ctx.db.insert("workflowAutomationRuns", {
      workflowId, agentId, orgId: "", automationKind: "reminder", subjectType: "appointment",
      subjectKey: String(eventId), deduplicationKey: `reminder:${eventId}`, appointmentId: eventId,
      appointmentStartAt: startAt, conversationId, configurationRevision: 1, activationScope: "futureOnly",
      attempt: 1, scheduledAt: startAt - 3_600_000, status: "scheduled", workIds: [],
      templateSnapshot: { key: "appointment_reminder", name: "appointment_reminder", language: "en_US", category: "UTILITY" },
      createdAt: now, updatedAt: now,
    });
    const connectionId = await ctx.db.insert("googleCalendarConnections", {
      userId, workosUserId: "sync-owner", provider: "google-calendar", primaryCalendarId: "primary",
      timeZone: "UTC", state: "connected", dirtyGeneration: 1, syncToken: "sync_1",
      lastSuccessfulSyncAt: now, createdAt: now, updatedAt: now,
    });
    return { userId, teamId, conversationId, eventId, participantId, sessionId, reminderId, connectionId };
  });
}

test("a Google webhook move updates participant time indexes, booking-session selected slot, reminders, and audit action", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 7, 13, 9));
  const t = convexTest(schema, modules);
  const fixture = await createSyncedBooking(t);
  await runGoogleCalendarSync({
    connectionId: fixture.connectionId,
    now: Date.now(),
    dependencies: syncDependencies(t),
    listPage: async () => ({
      items: [{
        id: "booking_event", status: "confirmed", summary: "Consultation - Customer",
        etag: '"moved"', organizer: { self: true },
        start: { dateTime: movedStart, timeZone: "UTC" },
        end: { dateTime: movedEnd, timeZone: "UTC" },
      }],
      nextSyncToken: "sync_2",
    }),
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const rows = await t.run(async (ctx) => ({
    event: await ctx.db.get(fixture.eventId),
    participant: await ctx.db.get(fixture.participantId),
    session: await ctx.db.get(fixture.sessionId),
    reminder: await ctx.db.get(fixture.reminderId),
    logs: await ctx.db.query("conversationLogs")
      .withIndex("by_conversationId_and_performedAt", (q) => q.eq("conversationId", fixture.conversationId))
      .take(20),
    messages: await ctx.db.query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", fixture.conversationId))
      .take(5),
  }));
  expect(rows.event?.startAt).toBe(Date.parse(movedStart));
  expect(rows.participant?.eventStartAt).toBe(Date.parse(movedStart));
  expect(rows.session?.selectedSlot?.startAt).toBe(Date.parse(movedStart));
  expect(rows.reminder?.status).toBe("cancelled");
  expect(rows.logs.some((log) => log.action === "event_updated" && (log.metadata as { externalCalendarChange?: boolean })?.externalCalendarChange === true)).toBe(true);
  expect(rows.messages).toHaveLength(0);
});

test("a Google deletion cancels the session, reminders, and booked conversation state without sending a customer message", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 7, 13, 9));
  const t = convexTest(schema, modules);
  const fixture = await createSyncedBooking(t);
  await runGoogleCalendarSync({
    connectionId: fixture.connectionId,
    now: Date.now(),
    dependencies: syncDependencies(t),
    listPage: async () => ({
      items: [{
        id: "booking_event", status: "cancelled", organizer: { self: true },
      }],
      nextSyncToken: "sync_2",
    }),
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const rows = await t.run(async (ctx) => ({
    event: await ctx.db.get(fixture.eventId),
    session: await ctx.db.get(fixture.sessionId),
    reminder: await ctx.db.get(fixture.reminderId),
    conversation: await ctx.db.get(fixture.conversationId),
    messages: await ctx.db.query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", fixture.conversationId))
      .take(5),
  }));
  expect(rows.event?.status).toBe("cancelled");
  expect(rows.session?.status).toBe("cancelled");
  expect(rows.reminder?.status).toBe("cancelled");
  expect(rows.conversation?.status).toBe("open");
  expect(rows.messages).toHaveLength(0);
});
