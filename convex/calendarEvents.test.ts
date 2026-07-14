/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createPersonalCalendarFixture(
  t: ReturnType<typeof convexTest>,
  workosUserId: string,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: `${workosUserId}@example.com`,
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
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      service: "manual",
      contactAddress: "",
      name: "Calendar Customer",
      email: "calendar-customer@example.com",
      phone: "+60123456789",
      tags: [],
      source: "manual",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { customerId, teamId, userId };
  });
}

test("personal workspace calendar customer options include personal contacts", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "user-personal-calendar";
  const { customerId } = await createPersonalCalendarFixture(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });

  const options = await authed.query(api.calendarEvents.listCustomerOptions, {});

  expect(options).toEqual([
    expect.objectContaining({
      _id: customerId,
      name: "Calendar Customer",
      email: "calendar-customer@example.com",
      phone: "+60123456789",
      service: "manual",
    }),
  ]);
});

test("generic event creation has no booking lifecycle or conversation log side effects", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "generic-event-owner";
  const fixture = await createPersonalCalendarFixture(t, workosUserId);
  const conversationId = await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      customerId: fixture.customerId,
      status: "open",
      assignToAiAgent: false,
      threadId: "generic-event-thread",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
  const authed = t.withIdentity({ subject: workosUserId });

  const eventId = await authed.mutation(api.calendarEvents.create, {
    title: "Internal event",
    startAt: Date.UTC(2026, 6, 18, 8, 0, 0),
    endAt: Date.UTC(2026, 6, 18, 9, 0, 0),
    timeZone: "UTC",
    customerId: fixture.customerId,
    assignedUserId: fixture.userId,
  });

  const effects = await t.run(async (ctx) => ({
    session: await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", eventId))
      .unique(),
    logs: await ctx.db
      .query("conversationLogs")
      .withIndex("by_conversationId_and_performedAt", (q) =>
        q.eq("conversationId", conversationId),
      )
      .take(10),
  }));
  expect(effects.session).toBeNull();
  expect(effects.logs).toEqual([]);
});
