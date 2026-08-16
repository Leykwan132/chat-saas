/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { expect, test } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { generateSlots, resolveAvailableInterval } from "./appointmentBooking/availability";
import { syncCalendarEventAvailabilityIntervals } from "./calendarAvailabilityIntervals";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

async function setup(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "interval-user", email: "interval@example.com", createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational", name: "Intervals", ownerId: userId,
      workosOrgId: "org_intervals", createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Intervals", provider: "openrouter", model: "test/model", systemPrompt: "Test",
      templateKey: "blank", fileSize: 0, userId: "interval-user", orgId: "org_intervals",
      createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("userSchedules", {
      agentId, workosUserId: "interval-user", mode: "manual", manualStatus: "available",
      timezone: "UTC", enabled: true, createdAt: now, updatedAt: now,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId, name: "Intervals", isActive: true, sortOrder: 0, durationMinutes: 30,
      fields: [], timeSlotPolicy: "offer_slots", salesStyle: "neutral",
      assignmentStrategy: "balanced", createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("googleCalendarConnections", {
      userId, workosUserId: "interval-user", provider: "google-calendar", primaryCalendarId: "primary",
      timeZone: "UTC", state: "connected", dirtyGeneration: 0, lastSuccessfulSyncAt: now,
      createdAt: now, updatedAt: now,
    });
    return { now, serviceId, teamId, userId };
  });
}

async function addLegacyEvents(
  t: CalendarTest,
  fixture: Awaited<ReturnType<typeof setup>>,
  args: {
    count: number;
    startAt: number;
    endAt: number;
    indexed?: boolean;
    status?: "confirmed" | "cancelled";
  },
) {
  await t.run(async (ctx) => {
    for (let index = 0; index < args.count; index += 1) {
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId: fixture.teamId, title: `Legacy ${index}`, startAt: args.startAt + index,
        endAt: args.endAt + index, timeZone: "UTC", status: args.status ?? "confirmed",
        createdBy: fixture.userId, createdAt: fixture.now, updatedAt: fixture.now,
      });
      await ctx.db.insert("calendarEventParticipants", {
        eventId, teamId: fixture.teamId, participantType: "teamUser", role: "assigned",
        userId: fixture.userId, email: "interval@example.com", eventStartAt: args.startAt + index,
        createdAt: fixture.now, updatedAt: fixture.now,
      });
      if (args.indexed) await syncCalendarEventAvailabilityIntervals(ctx, eventId, fixture.now);
    }
  });
}

async function available(
  t: CalendarTest,
  fixture: Awaited<ReturnType<typeof setup>>,
  startAt: number,
) {
  return await t.run(async (ctx) => resolveAvailableInterval(ctx, {
    service: (await ctx.db.get(fixture.serviceId)) as Doc<"appointmentServices">,
    teamId: fixture.teamId,
    startAt,
    endAt: startAt + 30 * minute,
  }));
}

test(">100 historical cancelled legacy assignments do not block a future interval", async () => {
  const t = convexTest(schema, modules);
  const fixture = await setup(t);
  const slot = fixture.now + 10 * day;
  await addLegacyEvents(t, fixture, {
    count: 110, startAt: fixture.now - 20 * day, endAt: fixture.now - 19 * day, status: "cancelled",
  });

  expect(await available(t, fixture, slot)).not.toBeNull();
});

test(">100 maintained future intervals outside the requested window do not block", async () => {
  const t = convexTest(schema, modules);
  const fixture = await setup(t);
  const slot = fixture.now + day;
  await addLegacyEvents(t, fixture, {
    count: 110, startAt: slot + 10 * day, endAt: slot + 10 * day + hour, indexed: true,
  });

  expect(await available(t, fixture, slot)).not.toBeNull();
});

test.each([
  ["long", false, 5 * day],
  ["all-day", true, 8 * day],
] as const)("a real overlapping %s interval remains blocking", async (_name, allDay, duration) => {
  const t = convexTest(schema, modules);
  const fixture = await setup(t);
  const slot = fixture.now + 12 * day;
  await addLegacyEvents(t, fixture, {
    count: 105, startAt: slot + 10 * day, endAt: slot + 10 * day + hour, indexed: true,
  });
  await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId, title: "Overlap", startAt: slot - duration, endAt: slot + hour,
      timeZone: "UTC", allDay, status: "confirmed", createdBy: fixture.userId,
      createdAt: fixture.now, updatedAt: fixture.now,
    });
    await ctx.db.insert("calendarEventParticipants", {
      eventId, teamId: fixture.teamId, participantType: "teamUser", role: "assigned",
      userId: fixture.userId, email: "interval@example.com", eventStartAt: slot - duration,
      createdAt: fixture.now, updatedAt: fixture.now,
    });
    await syncCalendarEventAvailabilityIntervals(ctx, eventId, fixture.now);
  });

  expect(await available(t, fixture, slot)).toBeNull();
});

test("legacy availability repair progresses in bounded runtime pages", async () => {
  const t = convexTest(schema, modules);
  const fixture = await setup(t);
  const slot = fixture.now + 10 * day;
  await addLegacyEvents(t, fixture, {
    count: 180, startAt: fixture.now - 20 * day, endAt: fixture.now - 19 * day, status: "cancelled",
  });

  expect(await available(t, fixture, slot)).toBeNull();
  expect(await available(t, fixture, slot)).not.toBeNull();
  const remaining = await t.run((ctx) => ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_availabilityIndexedAt", (q) => q
      .eq("teamId", fixture.teamId).eq("role", "assigned").eq("userId", fixture.userId)
      .eq("availabilityIndexedAt", undefined))
    .take(1));
  expect(remaining).toHaveLength(0);
});

test("multi-slot generation stays within one window-level query budget", async () => {
  const t = convexTest({ schema, modules, transactionLimits: { databaseQueries: 18 } });
  const fixture = await setup(t);
  const rangeStartAt = Math.ceil((fixture.now + day) / (30 * minute)) * 30 * minute;
  await t.run(async (ctx) => {
    const startAt = rangeStartAt + 2 * hour;
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId, title: "Indexed Google interval", startAt, endAt: startAt + hour,
      timeZone: "UTC", status: "confirmed", createdBy: fixture.userId,
      externalProvider: "google", externalCalendarId: "primary", externalEventId: "query-budget",
      externalOwnerUserId: fixture.userId, externalOrigin: "google", externalStatus: "confirmed",
      externalTransparency: "opaque", externalSyncState: "synced",
      createdAt: fixture.now, updatedAt: fixture.now,
    });
    await ctx.db.insert("calendarEventParticipants", {
      eventId, teamId: fixture.teamId, participantType: "teamUser", role: "assigned",
      userId: fixture.userId, email: "interval@example.com", eventStartAt: startAt,
      eventEndAt: startAt + hour, createdAt: fixture.now, updatedAt: fixture.now,
    });
    await syncCalendarEventAvailabilityIntervals(ctx, eventId, fixture.now);
  });
  const slots = await t.run(async (ctx) => generateSlots(ctx, {
    service: (await ctx.db.get(fixture.serviceId)) as Doc<"appointmentServices">,
    teamId: fixture.teamId,
    rangeStartAt,
    rangeEndAt: rangeStartAt + 8 * hour,
    limit: 8,
  }));

  expect(slots).toHaveLength(8);
});
