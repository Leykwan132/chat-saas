/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import type { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { resolveAvailableInterval } from "./appointmentBooking/availability";
import { AVAILABILITY_FRESHNESS_MS } from "./googleCalendar/constants";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
const hour = 60 * 60 * 1000;
afterEach(() => {
  vi.useRealTimers();
});

async function insertUser(
  ctx: Parameters<Parameters<CalendarTest["run"]>[0]>[0],
  workosUserId: string,
  now: number,
) {
  return await ctx.db.insert("users", {
    workosUserId,
    email: `${workosUserId}@example.com`,
    createdAt: now,
    updatedAt: now,
  });
}

async function setupPrivacyFixture(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const externalOwnerId = await insertUser(ctx, "external-owner", now);
    const workspaceOwnerId = await insertUser(ctx, "workspace-owner", now);
    const adminId = await insertUser(ctx, "workspace-admin", now);
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Operations",
      ownerId: workspaceOwnerId,
      workosOrgId: "org_operations",
      memberPermissions: ["calendar:read"],
      createdAt: now,
      updatedAt: now,
    });
    for (const [userId, role] of [
      [externalOwnerId, "member"],
      [workspaceOwnerId, "owner"],
      [adminId, "admin"],
    ] as const) {
      await ctx.db.insert("teamMemberships", { teamId, userId, role, createdAt: now });
      await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    }
    const startAt = now + hour;
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Private interview",
      description: "Candidate compensation discussion",
      location: "Private office",
      link: "https://meet.google.com/private",
      startAt,
      endAt: startAt + hour,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: externalOwnerId,
      externalProvider: "google",
      externalCalendarId: "primary",
      externalEventId: "private_google_event",
      externalICalUID: "private@example.com",
      externalEtag: "private-etag",
      externalHtmlLink: "https://calendar.google.com/private",
      externalOwnerUserId: externalOwnerId,
      externalOrigin: "google",
      externalStatus: "confirmed",
      externalTransparency: "opaque",
      externalCanEdit: true,
      externalSyncState: "synced",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("calendarEventParticipants", {
      eventId,
      teamId,
      participantType: "teamUser",
      role: "assigned",
      userId: externalOwnerId,
      email: "external-owner@example.com",
      displayName: "External Owner",
      eventStartAt: startAt,
      eventEndAt: startAt + hour,
      createdAt: now,
      updatedAt: now,
    });
    return { eventId, startAt };
  });
}

async function listRange(t: CalendarTest, subject: string, startAt: number) {
  return await t.withIdentity({ subject }).query(api.calendarEvents.listForRange, {
    startAt: startAt - hour,
    endAt: startAt + 2 * hour,
  });
}

test("the connection owner receives full Google event details", async () => {
  const t = convexTest(schema, modules);
  const fixture = await setupPrivacyFixture(t);
  const events = await listRange(t, "external-owner", fixture.startAt);

  expect(events).toMatchObject([{
    title: "Private interview",
    description: "Candidate compensation discussion",
    location: "Private office",
    link: "https://meet.google.com/private",
    externalOrigin: "google",
  }]);
  expect((events[0] as { participants: unknown[] }).participants).toHaveLength(1);
});

test("a teammate receives Busy without private fields from the server", async () => {
  const t = convexTest(schema, modules);
  const fixture = await setupPrivacyFixture(t);
  const events = await listRange(t, "workspace-owner", fixture.startAt);
  const details = await t.withIdentity({ subject: "workspace-owner" }).query(
    api.calendarEvents.getAppointmentDetails,
    { eventId: fixture.eventId },
  );
  const editing = await t.withIdentity({ subject: "workspace-owner" }).query(
    api.calendarEvents.getEventForEditing,
    { eventId: fixture.eventId },
  );

  expect(events).toEqual([expect.objectContaining({ title: "Busy" })]);
  expect(events[0]).not.toHaveProperty("description");
  expect(events[0]).not.toHaveProperty("location");
  expect(events[0]).not.toHaveProperty("link");
  expect(events[0]).not.toHaveProperty("externalEventId");
  expect(events[0]).not.toHaveProperty("externalProvider");
  expect(events[0]).not.toHaveProperty("externalOrigin");
  expect(events[0]).not.toHaveProperty("participants");
  expect(details).toMatchObject({ title: "Busy", collectedFields: {}, attendeeNames: [] });
  expect(details).not.toHaveProperty("description");
  expect(details).not.toHaveProperty("link");
  expect(editing).toBeNull();
});

test.each(["workspace-owner", "workspace-admin"])(
  "%s cannot edit or delete a teammate's Google-originated event",
  async (subject) => {
    const t = convexTest(schema, modules);
    const fixture = await setupPrivacyFixture(t);
    const authed = t.withIdentity({ subject });

    await expect(authed.action(api.calendarEvents.update, {
      eventId: fixture.eventId,
      title: "Leaked edit",
    })).rejects.toThrow("Calendar event not found");
    await expect(authed.action(api.calendarEvents.remove, {
      eventId: fixture.eventId,
    })).rejects.toThrow("Calendar event not found");
    expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.title).toBe("Private interview");
  },
);

type AvailabilityFixture = {
  connectionId?: Id<"googleCalendarConnections">;
  ownerId: Id<"users">;
  teams: Array<{ teamId: Id<"teams">; serviceId: Id<"appointmentServices"> }>;
};

async function setupAvailabilityFixture(t: CalendarTest, connected = true): Promise<AvailabilityFixture> {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const ownerId = await insertUser(ctx, connected ? "connected-staff" : "local-staff", now);
    const managerId = await insertUser(ctx, `${connected ? "connected" : "local"}-manager`, now);
    const teams = [];
    for (const suffix of ["a", "b"]) {
      const workosOrgId = `org_${connected ? "connected" : "local"}_${suffix}`;
      const teamId = await ctx.db.insert("teams", {
        type: "organizational", name: `Team ${suffix}`, ownerId: managerId, workosOrgId,
        createdAt: now, updatedAt: now,
      });
      await ctx.db.insert("teamMemberships", { teamId, userId: ownerId, role: "member", createdAt: now });
      await ctx.db.insert("teamMemberships", { teamId, userId: managerId, role: "owner", createdAt: now });
      const agentId = await ctx.db.insert("agents", {
        name: `Agent ${suffix}`, provider: "openrouter", model: "test/model", systemPrompt: "Test",
        templateKey: "blank", fileSize: 0, userId: `${connected ? "connected" : "local"}-manager`,
        orgId: workosOrgId, createdAt: now, updatedAt: now,
      });
      await ctx.db.insert("userSchedules", {
        agentId, workosUserId: connected ? "connected-staff" : "local-staff",
        mode: "manual", manualStatus: "available", timezone: "UTC", enabled: true,
        createdAt: now, updatedAt: now,
      });
      const serviceId = await ctx.db.insert("appointmentServices", {
        agentId, name: "Consultation", isActive: true, sortOrder: 0, durationMinutes: 30,
        fields: [], timeSlotPolicy: "offer_slots", salesStyle: "neutral",
        assignmentStrategy: "balanced", createdAt: now, updatedAt: now,
      });
      teams.push({ teamId, serviceId });
    }
    const connectionId = connected ? await ctx.db.insert("googleCalendarConnections", {
      userId: ownerId, workosUserId: "connected-staff", provider: "google_calendar",
      primaryCalendarId: "primary", timeZone: "UTC", state: "connected", dirtyGeneration: 0,
      lastSuccessfulSyncAt: now, createdAt: now, updatedAt: now,
    }) : undefined;
    return { connectionId, ownerId, teams };
  });
}

async function availability(
  t: CalendarTest,
  fixture: AvailabilityFixture,
  teamIndex: number,
  startAt: number,
) {
  const team = fixture.teams[teamIndex]!;
  return await t.run(async (ctx) => await resolveAvailableInterval(ctx, {
    service: (await ctx.db.get(team.serviceId)) as Doc<"appointmentServices">,
    teamId: team.teamId,
    startAt,
    endAt: startAt + 30 * 60 * 1000,
  }));
}

async function insertGoogleBlock(
  t: CalendarTest,
  fixture: AvailabilityFixture,
  startAt: number,
  transparency: "opaque" | "transparent",
  status: "confirmed" | "cancelled",
) {
  await t.run(async (ctx) => {
    for (const { teamId } of fixture.teams) {
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId, title: "Private block", startAt, endAt: startAt + hour, timeZone: "UTC", status,
        createdBy: fixture.ownerId, externalProvider: "google", externalCalendarId: "primary",
        externalEventId: `${transparency}_${status}`, externalOwnerUserId: fixture.ownerId,
        externalOrigin: "google", externalStatus: status, externalTransparency: transparency,
        externalCanEdit: true, externalSyncState: "synced", createdAt: startAt, updatedAt: startAt,
      });
      await ctx.db.insert("calendarEventParticipants", {
        eventId, teamId, participantType: "teamUser", role: "assigned", userId: fixture.ownerId,
        email: "connected-staff@example.com", eventStartAt: startAt, createdAt: startAt, updatedAt: startAt,
        eventEndAt: startAt + hour,
      });
    }
  });
}

test("one user connection blocks the same slot in two eligible workspaces", async () => {
  const now = Date.now();
  const t = convexTest(schema, modules);
  const fixture = await setupAvailabilityFixture(t);
  await insertGoogleBlock(t, fixture, now + hour, "opaque", "confirmed");

  expect(await availability(t, fixture, 0, now + hour)).toBeNull();
  expect(await availability(t, fixture, 1, now + hour)).toBeNull();
});

test.each([
  ["transparent", "confirmed"],
  ["opaque", "cancelled"],
] as const)("%s %s Google events do not block availability", async (transparency, status) => {
  const now = Date.now();
  const t = convexTest(schema, modules);
  const fixture = await setupAvailabilityFixture(t);
  await insertGoogleBlock(t, fixture, now + hour, transparency, status);

  expect(await availability(t, fixture, 0, now + hour)).not.toBeNull();
});

test("users with no Google connection retain local-only availability", async () => {
  const now = Date.now();
  const t = convexTest(schema, modules);
  const fixture = await setupAvailabilityFixture(t, false);

  expect(await availability(t, fixture, 0, now + hour)).not.toBeNull();
});

test("ever-enabled stale or failed connections fail closed at the freshness boundary", async () => {
  const now = Date.UTC(2026, 7, 13, 12, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const t = convexTest(schema, modules);
  const fixture = await setupAvailabilityFixture(t);
  const connectionId = fixture.connectionId!;
  await t.run((ctx) => ctx.db.patch(connectionId, {
    lastSuccessfulSyncAt: now - AVAILABILITY_FRESHNESS_MS,
  }));

  expect(await availability(t, fixture, 0, now + hour)).not.toBeNull();
  await t.run((ctx) => ctx.db.patch(connectionId, {
    lastSuccessfulSyncAt: now - AVAILABILITY_FRESHNESS_MS - 1,
  }));
  expect(await availability(t, fixture, 0, now + hour)).toBeNull();
  await t.run((ctx) => ctx.db.patch(connectionId, {
    lastSuccessfulSyncAt: now,
    lastErrorKind: "retryable",
  }));
  expect(await availability(t, fixture, 0, now + hour)).toBeNull();
});
