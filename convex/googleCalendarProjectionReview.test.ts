/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { expect, test } from "vitest";
import type { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { resolveAvailableInterval } from "./appointmentBooking/availability";
import { loadGoogleCalendarHealthByUser } from "./googleCalendar/availability";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
const hour = 60 * 60 * 1000;

async function setup(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const staffId = await ctx.db.insert("users", {
      workosUserId: "review-staff", email: "staff@example.com", createdAt: now, updatedAt: now,
    });
    const managerId = await ctx.db.insert("users", {
      workosUserId: "review-manager", email: "manager@example.com", createdAt: now, updatedAt: now,
    });
    const teams = [];
    for (const suffix of ["a", "b"]) {
      const teamId = await ctx.db.insert("teams", {
        type: "organizational", name: `Review ${suffix}`, ownerId: managerId,
        workosOrgId: `org_review_${suffix}`, createdAt: now, updatedAt: now,
      });
      const membershipId = await ctx.db.insert("teamMemberships", {
        teamId, userId: staffId, role: "admin", createdAt: now,
      });
      await ctx.db.insert("teamMemberships", {
        teamId, userId: managerId, role: "owner", createdAt: now,
      });
      const agentId = await ctx.db.insert("agents", {
        name: `Review ${suffix}`, provider: "openrouter", model: "test/model",
        systemPrompt: "Test", templateKey: "blank", fileSize: 0,
        userId: "review-manager", orgId: `org_review_${suffix}`, createdAt: now, updatedAt: now,
      });
      const userScheduleId = await ctx.db.insert("userSchedules", {
        agentId, workosUserId: "review-staff", mode: "manual", manualStatus: "available",
        timezone: "UTC", enabled: true, createdAt: now, updatedAt: now,
      });
      for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
        await ctx.db.insert("userShifts", {
          userScheduleId, dayOfWeek, startMinutes: 0, endMinutes: 24 * 60,
        });
      }
      const serviceId = await ctx.db.insert("appointmentServices", {
        agentId, name: "Review", isActive: true, sortOrder: 0, durationMinutes: 30,
        fields: [], timeSlotPolicy: "offer_slots", salesStyle: "neutral",
        assignmentStrategy: "balanced", createdAt: now, updatedAt: now,
      });
      teams.push({ membershipId, serviceId, teamId });
    }
    await ctx.db.patch(managerId, { activeTeamId: teams[0]!.teamId, updatedAt: now });
    await ctx.db.patch(staffId, { activeTeamId: teams[0]!.teamId, updatedAt: now });
    await ctx.db.insert("googleCalendarConnections", {
      userId: staffId, workosUserId: "review-staff", provider: "google-calendar",
      primaryCalendarId: "primary", timeZone: "UTC", state: "connected", dirtyGeneration: 0,
      lastSuccessfulSyncAt: now, createdAt: now, updatedAt: now,
    });
    return { managerId, now, staffId, teams };
  });
}

async function addGoogleEvent(
  t: CalendarTest,
  fixture: Awaited<ReturnType<typeof setup>>,
  args: { startAt: number; endAt: number; allDay?: boolean; canEdit?: boolean },
) {
  return await t.run(async (ctx) => {
    const eventIds = [];
    for (const { teamId } of fixture.teams) {
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId, title: "Private Google event", description: "Secret", startAt: args.startAt,
        endAt: args.endAt, timeZone: "UTC", allDay: args.allDay, status: "confirmed",
        createdBy: fixture.staffId, externalProvider: "google", externalCalendarId: "primary",
        externalEventId: "review-event", externalOwnerUserId: fixture.staffId,
        externalOrigin: "google", externalStatus: "confirmed", externalTransparency: "opaque",
        externalCanEdit: args.canEdit ?? true, externalSyncState: "synced",
        createdAt: fixture.now, updatedAt: fixture.now,
      });
      await ctx.db.insert("calendarEventParticipants", {
        eventId, teamId, participantType: "teamUser", role: "assigned", userId: fixture.staffId,
        email: "staff@example.com", eventStartAt: args.startAt,
        eventEndAt: args.endAt,
        createdAt: fixture.now, updatedAt: fixture.now,
      });
      eventIds.push(eventId);
    }
    return eventIds;
  });
}

async function available(
  t: CalendarTest,
  fixture: Awaited<ReturnType<typeof setup>>,
  teamIndex: number,
  startAt: number,
) {
  const team = fixture.teams[teamIndex]!;
  return await t.run(async (ctx) => resolveAvailableInterval(ctx, {
    service: (await ctx.db.get(team.serviceId)) as Doc<"appointmentServices">,
    teamId: team.teamId,
    startAt,
    endAt: startAt + 30 * 60 * 1000,
  }));
}

test("a departed external owner is inaccessible and nonblocking only in that workspace", async () => {
  const t = convexTest(schema, modules);
  const fixture = await setup(t);
  const slot = fixture.now + 3 * 24 * hour;
  const eventIds = await addGoogleEvent(t, fixture, { startAt: slot, endAt: slot + hour });
  await t.run((ctx) => ctx.db.delete(fixture.teams[0]!.membershipId));
  const manager = t.withIdentity({ subject: "review-manager" });

  expect(await manager.query(api.calendarEvents.getAppointmentDetails, { eventId: eventIds[0]! })).toBeNull();
  expect(await manager.query(api.calendarEvents.getEventForEditing, { eventId: eventIds[0]! })).toBeNull();
  expect(await available(t, fixture, 0, slot)).not.toBeNull();
  expect(await available(t, fixture, 1, slot)).toBeNull();
  await t.run((ctx) => ctx.db.patch(fixture.managerId, {
    activeTeamId: fixture.teams[1]!.teamId,
    updatedAt: fixture.now,
  }));
  expect(await manager.query(api.calendarEvents.getAppointmentDetails, {
    eventId: eventIds[1]!,
  })).toMatchObject({ title: "Busy" });
});

test.each([
  ["long event", false, 3 * 24 * hour],
  ["all-day event", true, 4 * 24 * hour],
] as const)("%s starting more than 24 hours earlier blocks an overlap", async (_name, allDay, duration) => {
  const t = convexTest(schema, modules);
  const fixture = await setup(t);
  const slot = fixture.now + 5 * 24 * hour;
  await addGoogleEvent(t, fixture, {
    startAt: slot - duration,
    endAt: slot + hour,
    allDay,
  });

  expect(await available(t, fixture, 0, slot)).toBeNull();
});

test.each([true, false])(
  "an imported event with externalCanEdit=%s cannot mutate the cache without Google write-through",
  async (externalCanEdit) => {
    const t = convexTest(schema, modules);
    const fixture = await setup(t);
    const [eventId] = await addGoogleEvent(t, fixture, {
      startAt: fixture.now + hour,
      endAt: fixture.now + 2 * hour,
      canEdit: externalCanEdit,
    });
    const owner = t.withIdentity({ subject: "review-staff" });
    const expected = externalCanEdit
      ? "Google Calendar credential is unavailable"
      : "Calendar event not found";

    await expect(owner.action(api.calendarEvents.update, {
      eventId: eventId as Id<"calendarEvents">,
      title: "Cache-only edit",
    })).rejects.toThrow(expected);
    await expect(owner.action(api.calendarEvents.remove, {
      eventId: eventId as Id<"calendarEvents">,
    })).rejects.toThrow(expected);
    expect(await t.run((ctx) => ctx.db.get(eventId as Id<"calendarEvents">))).toMatchObject({
      title: "Private Google event",
    });
  },
);

test("connection health is queried once per distinct roster user", async () => {
  const t = convexTest({ schema, modules, transactionLimits: { databaseQueries: 1 } });
  const { now, userId } = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "health-user", email: "health@example.com", createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("googleCalendarConnections", {
      userId, workosUserId: "health-user", provider: "google-calendar",
      primaryCalendarId: "primary", timeZone: "UTC", state: "connected", dirtyGeneration: 0,
      lastSuccessfulSyncAt: now, createdAt: now, updatedAt: now,
    });
    return { now, userId };
  });

  const health = await t.run(async (ctx) => {
    const byUser = await loadGoogleCalendarHealthByUser(ctx, [userId, userId, userId]);
    return byUser.get(userId);
  });
  expect(health).toBe(true);
});
