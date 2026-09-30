/// <reference types="vite/client" />
import { expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import { createFixture, createTest, starts } from "./appointmentBookingBatchCreateFixture";

test("creates all five local bookings atomically with chronological round robin", async () => {
  vi.useFakeTimers();
  const t = createTest();
  const fixture = await createFixture(t);
  const result = await t.action(
    internal.appointmentBooking.bookAppointments.bookAppointments,
    { conversationId: fixture.conversationId, serviceId: fixture.serviceId, startAts: starts },
  );
  expect(result).toMatchObject({ success: true });
  expect(result.bookings).toHaveLength(5);
  expect(result.bookings.map((booking) => booking.assignedTo)).toEqual([
    "Owner", "Teammate", "Owner", "Teammate", "Owner",
  ]);
  const confirmation = await t.mutation(
    internal.appointmentBooking.confirmations.sendBatchBookingConfirmation,
    { conversationId: fixture.conversationId },
  );
  expect(confirmation).toMatchObject({ success: true });
  expect(confirmation.confirmationMessage).toContain("Your bookings are confirmed!");
  expect(confirmation.confirmationMessage).not.toContain("Your booking is confirmed!");
  expect(confirmation.confirmationMessage?.match(/Booking reference:/g)).toHaveLength(5);
  expect(confirmation.confirmationMessage?.match(/Thank you — we look forward to seeing you!/g)).toHaveLength(1);
  const singleToolConfirmation = await t.mutation(
    internal.appointmentBooking.confirmations.sendBookingConfirmation,
    { conversationId: fixture.conversationId },
  );
  expect(singleToolConfirmation.confirmationMessage).toBe(confirmation.confirmationMessage);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const state = await t.run(async (ctx) => ({
    batch: (await ctx.db.query("appointmentBookingBatches").collect())[0],
    conversation: await ctx.db.get(fixture.conversationId),
    events: await ctx.db.query("calendarEvents").collect(),
    participants: await ctx.db.query("calendarEventParticipants").collect(),
    sessions: await ctx.db.query("appointmentBookingSessions").collect(),
    logs: await ctx.db.query("conversationLogs").collect(),
  }));
  expect(state.events).toHaveLength(5);
  expect(state.participants).toHaveLength(10);
  expect(state.sessions).toHaveLength(5);
  expect(state.logs.filter((row) => row.action === "event_booked")).toHaveLength(5);
  expect(state.batch).toMatchObject({ status: "booked" });
  expect(state.batch?.calendarEventIds).toHaveLength(5);
  expect(state.batch?.sessionIds).toHaveLength(5);
  expect(state.conversation?.status).toBe("booked");
  vi.useRealTimers();
});

test("creates no child records when any confirmed slot becomes unavailable", async () => {
  const t = createTest();
  const fixture = await createFixture(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("userTimeOff", {
      userScheduleId: fixture.scheduleIds[0]!,
      startAt: starts[4]!,
      endAt: starts[4]! + 30 * 60 * 1000,
      label: "Unavailable",
    });
    await ctx.db.insert("userTimeOff", {
      userScheduleId: fixture.scheduleIds[1]!,
      startAt: starts[4]!,
      endAt: starts[4]! + 30 * 60 * 1000,
      label: "Unavailable",
    });
  });
  const result = await t.action(internal.appointmentBooking.bookAppointments.bookAppointments, {
    conversationId: fixture.conversationId,
    serviceId: fixture.serviceId,
    startAts: starts,
  });
  expect(result).toMatchObject({ success: false });
  const counts = await t.run(async (ctx) => ({
    events: (await ctx.db.query("calendarEvents").collect()).length,
    sessions: (await ctx.db.query("appointmentBookingSessions").collect()).length,
  }));
  expect(counts).toEqual({ events: 0, sessions: 0 });
});

test.each([{ startAts: starts.slice(0, 4) }, { startAts: [...starts].reverse() }])(
  "rejects a partial or reordered confirmed list",
  async ({ startAts }) => {
    const t = createTest();
    const fixture = await createFixture(t);
    const result = await t.action(internal.appointmentBooking.bookAppointments.bookAppointments, {
      conversationId: fixture.conversationId,
      serviceId: fixture.serviceId,
      startAts,
    });
    expect(result).toMatchObject({ success: false });
    expect(await t.run(async (ctx) => (await ctx.db.query("calendarEvents").collect()).length)).toBe(0);
  },
);
