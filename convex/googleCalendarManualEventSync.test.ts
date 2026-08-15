import { convexTest } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { runPreparedCalendarEventCreate } from "./googleCalendar/calendarEventCreateSync";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type PrepareCreateRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
const prepareCreate = (internal as unknown as {
  googleCalendar: { calendarEventCreatePrepare: { prepareCreate: PrepareCreateRef } };
}).googleCalendar.calendarEventCreatePrepare.prepareCreate;

const connectionId = "connection_1" as Id<"googleCalendarConnections">;
const eventId = "event_1" as Id<"calendarEvents">;

const input = {
  title: "Planning session",
  startAt: Date.UTC(2026, 7, 15, 9, 0, 0),
  endAt: Date.UTC(2026, 7, 15, 10, 0, 0),
  timeZone: "UTC",
  customerId: "customer_1" as Id<"customers">,
  assignedUserId: "user_1" as Id<"users">,
};

const googlePreparation = {
  kind: "google" as const,
  connectionId,
  calendarEventId: eventId,
  operationKey: `calendar:${eventId}:create`,
  event: {
    summary: input.title,
    start: { dateTime: new Date(input.startAt).toISOString(), timeZone: input.timeZone },
    end: { dateTime: new Date(input.endAt).toISOString(), timeZone: input.timeZone },
  },
  now: input.startAt,
};

async function createConnectedFixture() {
  const t = convexTest(schema, modules);
  const workosUserId = "manual-event-owner";
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "manual-event-owner@example.com",
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
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      service: "manual",
      contactAddress: "+60123456789",
      email: "customer@example.com",
      name: "Calendar customer",
      phone: "+60123456789",
      tags: [],
      source: "manual",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const connectionId = await ctx.db.insert("googleCalendarConnections", {
      userId,
      workosUserId,
      provider: "google-calendar",
      primaryCalendarId: "primary",
      timeZone: "UTC",
      state: "connected",
      dirtyGeneration: 0,
      lastSuccessfulSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, customerId, connectionId };
  });
  return { t, workosUserId, ...fixture };
}

test("a never-connected creator keeps a manual event local", async () => {
  const write = vi.fn();
  const result = await runPreparedCalendarEventCreate(input, {
    prepare: vi.fn().mockResolvedValue({ kind: "local", eventId }),
    refresh: vi.fn(),
    write,
    rollback: vi.fn(),
  });

  expect(result).toBe(eventId);
  expect(write).not.toHaveBeenCalled();
});

test("a connected creator refreshes once then writes Google", async () => {
  const refresh = vi.fn();
  const write = vi.fn().mockResolvedValue({ kind: "success", externalEventId: "google_1" });
  const prepare = vi.fn()
    .mockResolvedValueOnce({ kind: "needs_refresh", connectionId })
    .mockResolvedValueOnce(googlePreparation);

  const result = await runPreparedCalendarEventCreate(input, {
    prepare,
    refresh,
    write,
    rollback: vi.fn(),
  });

  expect(result).toBe(eventId);
  expect(refresh).toHaveBeenCalledWith({ connectionId });
  expect(write).toHaveBeenCalledWith(expect.objectContaining({
    calendarEventId: eventId,
    operationKey: `calendar:${eventId}:create`,
  }));
});

test("a failed Google write removes its pending event", async () => {
  const rollback = vi.fn();

  await expect(runPreparedCalendarEventCreate(input, {
    prepare: vi.fn().mockResolvedValue(googlePreparation),
    refresh: vi.fn(),
    write: vi.fn().mockResolvedValue({ kind: "failed", message: "Google Calendar request failed" }),
    rollback,
  })).rejects.toThrow("Google Calendar request failed");

  expect(rollback).toHaveBeenCalledWith({ eventId });
});

test("connected preparation persists a pending event owned by its creator", async () => {
  const fixture = await createConnectedFixture();
  const authed = fixture.t.withIdentity({ subject: fixture.workosUserId });
  const prepared = await authed.mutation(prepareCreate, {
    ...input,
    customerId: fixture.customerId,
    assignedUserId: fixture.userId,
    refreshed: true,
  }) as typeof googlePreparation;

  expect(prepared).toMatchObject({
    kind: "google",
    connectionId: fixture.connectionId,
  });
  const event = await fixture.t.run(async (ctx) => await ctx.db.get(prepared.calendarEventId));
  expect(event).toMatchObject({
    externalOwnerUserId: fixture.userId,
    externalOrigin: "kilobot",
    externalSyncState: "pending",
  });
});
