/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { resolveAvailableInterval } from "./appointmentBooking/availability";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
const minute = 60 * 1000;
const day = 24 * 60 * minute;

afterEach(() => {
  vi.useRealTimers();
});

async function setupMaxRoster(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const managerId = await ctx.db.insert("users", {
      workosUserId: "budget-manager", email: "manager@example.com", createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational", name: "Budget", ownerId: managerId,
      workosOrgId: "org_budget", createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId, userId: managerId, role: "owner", createdAt: now,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Budget", provider: "openrouter", model: "test/model", systemPrompt: "Test",
      templateKey: "blank", fileSize: 0, userId: "budget-manager", orgId: "org_budget",
      createdAt: now, updatedAt: now,
    });
    let lastWorkosUserId = "";
    for (let index = 0; index < 96; index += 1) {
      const workosUserId = `budget-user-${index}`;
      const userId = await ctx.db.insert("users", {
        workosUserId, email: `${workosUserId}@example.com`, createdAt: now, updatedAt: now,
      });
      await ctx.db.insert("teamMemberships", {
        teamId, userId, role: "member", createdAt: now,
      });
      await ctx.db.insert("userSchedules", {
        agentId, workosUserId, mode: "manual", manualStatus: "available", timezone: "UTC",
        enabled: true, createdAt: now + index, updatedAt: now,
      });
      await ctx.db.insert("googleCalendarConnections", {
        userId, workosUserId, provider: "google_calendar", primaryCalendarId: "primary",
        timeZone: "UTC", state: "connected", dirtyGeneration: 0, lastSuccessfulSyncAt: now,
        createdAt: now, updatedAt: now,
      });
      const isLast = index === 95;
      const eventStartAt = isLast ? now + 2 * day : now - 20 * day;
      const eventEndAt = isLast ? eventStartAt + day : now - 19 * day;
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId, title: `Budget ${index}`, startAt: eventStartAt, endAt: eventEndAt,
        timeZone: "UTC", status: isLast ? "confirmed" : "cancelled", createdBy: userId,
        createdAt: now, updatedAt: now,
      });
      await ctx.db.insert("calendarEventParticipants", {
        eventId, teamId, participantType: "teamUser", role: "assigned", userId,
        email: `${workosUserId}@example.com`, eventStartAt, createdAt: now, updatedAt: now,
      });
      lastWorkosUserId = workosUserId;
    }
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId, name: "Budget", isActive: true, sortOrder: 0, durationMinutes: 30,
      fields: [], timeSlotPolicy: "offer_slots", salesStyle: "neutral",
      assignmentStrategy: "specific_user", specificWorkosUserId: lastWorkosUserId,
      createdAt: now, updatedAt: now,
    });
    return { now, serviceId, teamId };
  });
}

test("max roster availability preloads within global transaction budgets and finds a late conflict", async () => {
  vi.useFakeTimers();
  const t = convexTest({
    schema,
    modules,
    transactionLimits: {
      databaseQueries: 700,
      documentsWritten: 650,
      functionsScheduled: 1,
    },
  });
  const fixture = await setupMaxRoster(t);
  const checkAvailability = async () => await t.run(async (ctx) => resolveAvailableInterval(ctx, {
    service: (await ctx.db.get(fixture.serviceId)) as Doc<"appointmentServices">,
    teamId: fixture.teamId,
    startAt: fixture.now + day,
    endAt: fixture.now + 31 * day,
  }));

  expect(await checkAvailability()).toBeNull();
  const initial = await t.run((ctx) => ctx.db
    .query("calendarAvailabilityPreloads")
    .withIndex("by_teamId_and_agentId_and_windowStartAt_and_windowEndAt")
    .unique());
  expect(initial).toMatchObject({ state: "pending", phase: "repair", nextUserIndex: 0 });
  await t.mutation(internal.appointmentBooking.availability.continueCalendarAvailabilityPreload, {
    preloadId: initial!._id,
    generation: initial!.generation,
  });
  await t.mutation(internal.appointmentBooking.availability.continueCalendarAvailabilityPreload, {
    preloadId: initial!._id,
    generation: initial!.generation,
  });
  expect(await t.run((ctx) => ctx.db.get(initial!._id))).toMatchObject({
    state: "pending",
    nextUserIndex: 1,
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run((ctx) => ctx.db.get(initial!._id))).toMatchObject({
    state: "ready",
    phase: "load",
    nextUserIndex: 96,
  });
  expect(await checkAvailability()).toBeNull();
});
