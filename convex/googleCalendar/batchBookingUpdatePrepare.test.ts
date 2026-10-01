import { expect, test } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { createTest } from "../appointmentBookingBatchCreate.testFixture";
import { insertCalendarParticipants } from "../appointmentBooking/calendarHelpers";

type Test = ReturnType<typeof createTest>;
const hour = 3_600_000;
const day = (n: number, h: number) => Date.UTC(2028, 0, n, h);

async function createFixture(t: Test) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "update-owner", email: "owner@example.com", createdAt: now, updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal", name: "Personal", ownerId: userId, createdAt: now, updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent", provider: "openrouter", model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test", templateKey: "blank", fileSize: 0, userId: "update-owner", orgId: "",
      createdAt: now, updatedAt: now,
    });
    const scheduleId = await ctx.db.insert("userSchedules", {
      agentId, workosUserId: "update-owner", mode: "manual", manualStatus: "available",
      timezone: "UTC", enabled: true, createdAt: now, updatedAt: now,
    });
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      await ctx.db.insert("userShifts", {
        userScheduleId: scheduleId, dayOfWeek, startMinutes: 0, endMinutes: 1440,
      });
    }
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId, name: "Consultation", isActive: true, sortOrder: 0, durationMinutes: 30, fields: [],
      timeSlotPolicy: "offer_slots", salesStyle: "neutral", assignmentStrategy: "balanced",
      createdAt: now, updatedAt: now,
    });
    const customer = async (address: string) => {
      const customerId = await ctx.db.insert("customers", {
        orgId: "", service: "web", contactAddress: address, name: address, tags: [], source: "web",
        firstSeenAt: now, lastSeenAt: now, createdAt: now, updatedAt: now,
      });
      const conversationId = await ctx.db.insert("conversations", {
        orgId: "", service: "web", orgAddress: "business", contactAddress: address, customerId,
        status: "booked", assignedAgentId: agentId, assignToAiAgent: true, threadId: `thread-${address}`,
        lastMessageAt: now, unreadCount: 0, createdAt: now, updatedAt: now,
      });
      return { customerId, conversationId };
    };
    const mine = await customer("mine");
    const other = await customer("other");
    return { teamId, userId, agentId, serviceId, conversationId: mine.conversationId, mine, other };
  });
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;
type Owner = { customerId: Id<"customers">; conversationId: Id<"conversations"> };

async function book(
  ctx: MutationCtx,
  fixture: Fixture,
  owner: Owner,
  startAt: number,
  durationMs: number,
  status: "booked" | "completed" = "booked",
) {
  const now = Date.now();
  const endAt = startAt + durationMs;
  const eventId = await ctx.db.insert("calendarEvents", {
    teamId: fixture.teamId, title: "Consultation", startAt, endAt, timeZone: "UTC", status: "confirmed",
    createdBy: fixture.userId, agentId: fixture.agentId, conversationId: owner.conversationId,
    appointmentServiceId: fixture.serviceId, bookingSource: "ai", createdAt: now, updatedAt: now,
  });
  await ctx.db.insert("appointmentBookingSessions", {
    conversationId: owner.conversationId, agentId: fixture.agentId, serviceId: fixture.serviceId,
    status, collectedFields: { name: "Kwan" }, calendarEventId: eventId, createdAt: now, updatedAt: now,
  });
  const [customer, user] = await Promise.all([ctx.db.get(owner.customerId), ctx.db.get(fixture.userId)]);
  await insertCalendarParticipants(ctx, {
    eventId, teamId: fixture.teamId, customer: customer!, assignedUser: user!, bookingDisplayName: "Kwan",
    eventStartAt: startAt, eventEndAt: endAt, now,
  });
  return eventId;
}

async function snapshot(t: Test) {
  return await t.run(async (ctx) => ({
    events: (await ctx.db.query("calendarEvents").collect())
      .map((event) => [event._id, event.startAt, event.endAt] as const),
    sessions: (await ctx.db.query("appointmentBookingSessions").collect()).length,
    batches: await ctx.db.query("appointmentBookingUpdateBatches").collect(),
  }));
}

function prepare(
  t: Test,
  conversationId: Id<"conversations">,
  updates: Array<{ bookingId: Id<"calendarEvents">; startAt: number }>,
) {
  return t.mutation(internal.googleCalendar.batchBookingUpdatePrepare.prepareBatchUpdate, {
    conversationId, updates, refreshed: false,
  });
}

test("reschedules two bookings in place, preserving durations and completed eligibility", async () => {
  const t = createTest();
  const fixture = await createFixture(t);
  const [short, long] = await t.run(async (ctx) => [
    await book(ctx, fixture, fixture.mine, day(3, 10), hour / 2),
    await book(ctx, fixture, fixture.mine, day(5, 10), hour, "completed"),
  ]);
  const result = await prepare(t, fixture.conversationId, [
    { bookingId: short!, startAt: day(4, 14) },
    { bookingId: long!, startAt: day(6, 9) },
  ]);
  expect(result).toMatchObject({ kind: "completed", result: { success: true } });
  const after = await snapshot(t);
  expect(after.events).toEqual([
    [short, day(4, 14), day(4, 14) + hour / 2],
    [long, day(6, 9), day(6, 10)],
  ]);
  expect(after.sessions).toBe(2);
  expect(after.batches.map((batch) => batch.status)).toEqual(["updated"]);
});

test("swaps two bookings without treating their old times as conflicts", async () => {
  const t = createTest();
  const fixture = await createFixture(t);
  const [first, second] = await t.run(async (ctx) => [
    await book(ctx, fixture, fixture.mine, day(3, 10), hour / 2),
    await book(ctx, fixture, fixture.mine, day(3, 11), hour / 2),
  ]);
  const result = await prepare(t, fixture.conversationId, [
    { bookingId: first!, startAt: day(3, 11) },
    { bookingId: second!, startAt: day(3, 10) },
  ]);
  expect(result).toMatchObject({ kind: "completed", result: { success: true } });
  expect((await snapshot(t)).events.map(([, startAt]) => startAt)).toEqual([day(3, 11), day(3, 10)]);
});

test("rejects duplicate booking ids before any change", async () => {
  const t = createTest();
  const fixture = await createFixture(t);
  const id = await t.run(async (ctx) => await book(ctx, fixture, fixture.mine, day(3, 10), hour / 2));
  const before = await snapshot(t);
  const result = await prepare(t, fixture.conversationId, [
    { bookingId: id, startAt: day(4, 10) },
    { bookingId: id, startAt: day(5, 10) },
  ]);
  expect(result).toMatchObject({ kind: "failed", result: { success: false } });
  expect(await snapshot(t)).toEqual(before);
});

test.each(["other customer", "cancelled", "imported", "unavailable"] as const)(
  "a %s target rejects the whole request and changes nothing",
  async (kind) => {
    const t = createTest();
    const fixture = await createFixture(t);
    const [valid, target] = await t.run(async (ctx) => {
      const valid = await book(ctx, fixture, fixture.mine, day(3, 10), hour / 2);
      const owner = kind === "other customer" ? fixture.other : fixture.mine;
      const target = await book(ctx, fixture, owner, day(5, 10), hour / 2);
      if (kind === "cancelled") await ctx.db.patch(target, { status: "cancelled" });
      if (kind === "imported") await ctx.db.patch(target, { externalOrigin: "google" });
      if (kind === "unavailable") await book(ctx, fixture, fixture.other, day(7, 10), hour / 2);
      return [valid, target];
    });
    const before = await snapshot(t);
    const result = await prepare(t, fixture.conversationId, [
      { bookingId: valid, startAt: day(4, 10) },
      { bookingId: target, startAt: day(7, 10) },
    ]);
    expect(result).toMatchObject({
      kind: "failed",
      result: { success: false, failures: [{ bookingId: target }] },
    });
    expect(await snapshot(t)).toEqual(before);
  },
);
