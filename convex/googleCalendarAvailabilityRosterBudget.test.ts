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
    for (let index = 0; index < 100; index += 1) {
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
        userId, workosUserId, provider: "google-calendar", primaryCalendarId: "primary",
        timeZone: "UTC", state: "connected", dirtyGeneration: 0, lastSuccessfulSyncAt: now,
        createdAt: now, updatedAt: now,
      });
      const isLast = index === 99;
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
    return { agentId, now, serviceId, teamId };
  });
}

function availabilityCheck(t: CalendarTest, fixture: Awaited<ReturnType<typeof setupMaxRoster>>) {
  return t.run(async (ctx) => resolveAvailableInterval(ctx, {
    service: (await ctx.db.get(fixture.serviceId)) as Doc<"appointmentServices">,
    teamId: fixture.teamId,
    startAt: fixture.now + day,
    endAt: fixture.now + 31 * day,
  }));
}

async function replaceLastRosterUser(
  t: CalendarTest,
  fixture: Awaited<ReturnType<typeof setupMaxRoster>>,
  replacedWorkosUserId: string,
  suffix: string,
) {
  return await t.run(async (ctx) => {
    const schedules = await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId", (q) => q.eq("agentId", fixture.agentId))
      .take(100);
    const replaced = schedules.find((schedule) => schedule.workosUserId === replacedWorkosUserId);
    if (replaced === undefined) throw new Error("Replacement schedule not found");
    await ctx.db.delete(replaced._id);
    const workosUserId = `replacement-${suffix}`;
    const userId = await ctx.db.insert("users", {
      workosUserId, email: `${workosUserId}@example.com`,
      createdAt: fixture.now, updatedAt: fixture.now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId: fixture.teamId, userId, role: "member", createdAt: fixture.now,
    });
    await ctx.db.insert("userSchedules", {
      agentId: fixture.agentId, workosUserId, mode: "manual", manualStatus: "available",
      timezone: "UTC", enabled: true, createdAt: fixture.now + 100, updatedAt: fixture.now,
    });
    await ctx.db.insert("googleCalendarConnections", {
      userId, workosUserId, provider: "google-calendar", primaryCalendarId: "primary",
      timeZone: "UTC", state: "connected", dirtyGeneration: 0,
      lastSuccessfulSyncAt: fixture.now, createdAt: fixture.now, updatedAt: fixture.now,
    });
    const startAt = fixture.now + 2 * day;
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId, title: `Replacement ${suffix}`, startAt, endAt: startAt + day,
      timeZone: "UTC", status: "confirmed", createdBy: userId,
      createdAt: fixture.now, updatedAt: fixture.now,
    });
    await ctx.db.insert("calendarEventParticipants", {
      eventId, teamId: fixture.teamId, participantType: "teamUser", role: "assigned", userId,
      email: `${workosUserId}@example.com`, eventStartAt: startAt,
      createdAt: fixture.now, updatedAt: fixture.now,
    });
    await ctx.db.patch(fixture.serviceId, {
      specificWorkosUserId: workosUserId,
      updatedAt: fixture.now,
    });
    return { userId, workosUserId };
  });
}

async function preload(t: CalendarTest) {
  return await t.run((ctx) => ctx.db
    .query("calendarAvailabilityPreloads")
    .withIndex("by_teamId_and_agentId_and_windowStartAt_and_windowEndAt")
    .unique());
}

async function finishAvailabilityWorkers(t: CalendarTest) {
  const finish = t.finishAllScheduledFunctions as unknown as (
    advanceTimers: () => void,
    maxIterations: number,
  ) => Promise<void>;
  await finish(vi.runAllTimers, 500);
}

test("exact 100-user availability preloads within global transaction budgets", async () => {
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
  expect(await availabilityCheck(t, fixture)).toBeNull();
  const initial = await preload(t);
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
  await finishAvailabilityWorkers(t);
  expect(await t.run((ctx) => ctx.db.get(initial!._id))).toMatchObject({
    state: "ready",
    phase: "load",
    nextUserIndex: 100,
  });
  expect(await availabilityCheck(t, fixture)).toBeNull();
});

test("roster replacements clean stale generations and ignore obsolete workers", async () => {
  vi.useFakeTimers();
  const t = convexTest({
    schema,
    modules,
    transactionLimits: { databaseQueries: 700, documentsWritten: 650, functionsScheduled: 1 },
  });
  const fixture = await setupMaxRoster(t);
  expect(await availabilityCheck(t, fixture)).toBeNull();
  await finishAvailabilityWorkers(t);
  const initial = await preload(t);
  expect(initial).toMatchObject({ state: "ready", generation: 1, nextUserIndex: 100 });

  const replacementA = await replaceLastRosterUser(t, fixture, "budget-user-99", "a");
  expect(await availabilityCheck(t, fixture)).toBeNull();
  const generationTwo = await preload(t);
  expect(generationTwo).toMatchObject({ state: "pending", generation: 2, nextUserIndex: 0 });

  const replacementB = await replaceLastRosterUser(t, fixture, replacementA.workosUserId, "b");
  expect(await availabilityCheck(t, fixture)).toBeNull();
  const generationThree = await preload(t);
  expect(generationThree).toMatchObject({
    state: "pending",
    phase: "cleanup",
    generation: 3,
    nextUserIndex: 0,
  });
  const currentSnapshotId = await t.run((ctx) => ctx.db.insert("calendarAvailabilityPreloadUsers", {
    preloadId: generationThree!._id,
    teamId: fixture.teamId,
    userId: replacementB.userId,
    generation: 3,
    safe: true,
    intervals: [],
    updatedAt: fixture.now,
  }));
  await t.mutation(internal.appointmentBooking.availability.continueCalendarAvailabilityPreload, {
    preloadId: generationTwo!._id,
    generation: generationTwo!.generation,
  });
  expect(await preload(t)).toMatchObject({ generation: 3, nextUserIndex: 0 });
  expect(await t.run((ctx) => ctx.db.get(currentSnapshotId))).not.toBeNull();
  await t.mutation(internal.appointmentBooking.availability.continueCalendarAvailabilityPreload, {
    preloadId: generationThree!._id,
    generation: generationThree!.generation,
  });
  expect(await preload(t)).toMatchObject({ generation: 3, phase: "cleanup" });
  expect(await t.run((ctx) => ctx.db.get(currentSnapshotId))).not.toBeNull();

  await finishAvailabilityWorkers(t);
  expect(await availabilityCheck(t, fixture)).toBeNull();
  const ready = await preload(t);
  expect(ready).toMatchObject({ state: "ready", generation: 3, nextUserIndex: 100 });
  const snapshots = await t.run((ctx) => ctx.db
    .query("calendarAvailabilityPreloadUsers")
    .withIndex("by_preloadId", (q) => q.eq("preloadId", ready!._id))
    .take(101));
  expect(snapshots).toHaveLength(100);
  expect(snapshots.every((snapshot) => snapshot.generation === 3)).toBe(true);
  expect(snapshots.some((snapshot) =>
    snapshot.intervals.some((interval) => interval.startAt === fixture.now + 2 * day),
  )).toBe(true);
});
