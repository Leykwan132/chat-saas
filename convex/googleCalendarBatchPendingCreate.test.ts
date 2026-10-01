/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import { createFixture, createTest, starts } from "./appointmentBookingBatchCreate.testFixture";
import { googleCalendarWriteTestDependencies } from "./googleCalendar/writeTestDependencies";
import { runCreateGoogleCalendarEvent } from "./googleCalendar/writeExecution";
import { createGoogleCalendarBookingSyncFetch } from "./googleCalendarBookingSyncTestHelpers";

test("a pending agent batch is created on Google instead of stored only in Kilobot", async () => {
  const t = createTest();
  const fixture = await createFixture(t);
  await t.run(async (ctx) => {
    const now = Date.now();
    const team = await ctx.db.query("teams").first();
    if (team === null) throw new Error("Team not found");
    for (const userId of fixture.userIds) {
      const user = await ctx.db.get(userId);
      if (user === null) throw new Error("Assigned teammate not found");
      await ctx.db.insert("teamMemberships", {
        teamId: team._id, userId, role: "owner", createdAt: now,
      });
      await ctx.db.insert("googleCalendarConnections", {
        userId,
        workosUserId: user.workosUserId,
        provider: "google-calendar",
        primaryCalendarId: "primary",
        timeZone: "UTC",
        state: "connected",
        dirtyGeneration: 0,
        lastSuccessfulSyncAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  const args = {
    conversationId: fixture.conversationId,
    serviceId: fixture.serviceId,
    startAts: starts,
  };
  const blocked = await t.mutation(internal.googleCalendar.batchBookingPrepare.prepareBatchBook, {
    ...args,
    refreshed: false,
  });
  expect(blocked.kind).toBe("needs_refresh");
  const prepared = await t.mutation(internal.googleCalendar.batchBookingPrepare.prepareBatchBook, {
    ...args,
    refreshed: true,
  });
  if (prepared.kind !== "prepared") throw new Error("Google Calendar booking prepare did not finish");
  const eventIds = prepared.writes.map((write) => write.calendarEventId);
  await t.run(async (ctx) => {
    const batch = await ctx.db.query("appointmentBookingBatches").first();
    if (batch === null) throw new Error("Prepared booking batch could not be found");
    await ctx.db.patch(batch._id, { status: "confirming", updatedAt: Date.now() });
  });
  const retried = await t.mutation(internal.googleCalendar.batchBookingPrepare.prepareBatchBook, {
    ...args,
    refreshed: true,
  });
  if (retried.kind !== "prepared") throw new Error("Google Calendar booking prepare did not finish");
  expect(retried.writes.map((write) => write.calendarEventId)).toEqual(eventIds);
  expect(retried.writes.every((write) => write.kind === "google")).toBe(true);
  const posts: string[] = [];
  const fetchImplementation: typeof fetch = async (input, init) => {
    posts.push((init?.method ?? "GET").toUpperCase());
    return await createGoogleCalendarBookingSyncFetch()(input, init);
  };
  for (const write of retried.writes) {
    if (write.connectionId === undefined) throw new Error("Google connection is required");
    const result = await runCreateGoogleCalendarEvent({
      connectionId: write.connectionId,
      calendarEventId: write.calendarEventId,
      operationKey: write.operationKey,
      event: write.event,
      now: write.now,
    }, googleCalendarWriteTestDependencies(t, fetchImplementation, Date.now));
    expect(result.kind).toBe("success");
  }
  expect(posts.filter((method) => method === "POST")).toHaveLength(starts.length);
  const events = await t.run(async (ctx) => await ctx.db.query("calendarEvents").collect());
  expect(events).toHaveLength(starts.length);
  expect(events.every((event) =>
    event.externalSyncState === "synced" && event.externalEventId !== undefined
  )).toBe(true);
});
