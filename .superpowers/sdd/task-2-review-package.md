# Task 2 Review Package

```diff

```

## convex/appointmentBooking/statusTransition.ts

```
import { v } from "convex/values";
import { Permission } from "../../shared/permissions";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { getAuthContext } from "../authUtils";
import type { Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { permissionsForCurrentUser } from "./access";

export const editableBookingStatusValidator = v.union(
  v.literal(AppointmentBookingSessionStatus.Booked),
  v.literal(AppointmentBookingSessionStatus.Completed),
  v.literal(AppointmentBookingSessionStatus.Cancelled),
  v.literal(AppointmentBookingSessionStatus.NoShow),
);

type EditableBookingStatus =
  | typeof AppointmentBookingSessionStatus.Booked
  | typeof AppointmentBookingSessionStatus.Completed
  | typeof AppointmentBookingSessionStatus.Cancelled
  | typeof AppointmentBookingSessionStatus.NoShow;

const calendarStatusForBookingStatus = (
  status: EditableBookingStatus,
): "confirmed" | "cancelled" =>
  status === AppointmentBookingSessionStatus.Cancelled ? "cancelled" : "confirmed";

export const updateAppointmentBookingStatus = async (
  ctx: MutationCtx,
  args: {
    bookingId: Id<"calendarEvents">;
    status: EditableBookingStatus;
    teamId: Id<"teams">;
  },
) => {
  const event = await ctx.db.get(args.bookingId);
  if (event === null || event.teamId !== args.teamId) {
    throw new Error("Booking not found");
  }
  const session = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", event._id))
    .unique();
  if (session === null) {
    throw new Error("Booking session not found");
  }
  const now = Date.now();
  await ctx.db.patch(session._id, { status: args.status, updatedAt: now });
  await ctx.db.patch(event._id, {
    status: calendarStatusForBookingStatus(args.status),
    updatedAt: now,
  });
  return { success: true };
};

export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("calendarEvents"),
    status: editableBookingStatusValidator,
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CALENDAR_MANAGE)) {
      throw new Error("Forbidden");
    }
    return await updateAppointmentBookingStatus(ctx, {
      ...args,
      teamId: auth.activeTeamId,
    });
  },
});

```

## convex/appointmentBookingStatusTransition.test.ts

```
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const createFixture = async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "booking-status-owner";
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "status-owner@example.com",
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
    const otherTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Other",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "status-thread",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Consultation",
      startAt: now + 3_600_000,
      endAt: now + 5_400_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      agentId,
      conversationId,
      bookingSource: "manual",
      createdAt: now,
      updatedAt: now,
    });
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId,
      agentId,
      status: "booked",
      collectedFields: {},
      calendarEventId: eventId,
      createdAt: now,
      updatedAt: now,
    });
    return { eventId, sessionId, teamId, otherTeamId };
  });
  return { t, workosUserId, fixture };
};

test("updates the booking session and calendar event statuses together", async () => {
  const { t, workosUserId, fixture } = await createFixture();
  const authed = t.withIdentity({ subject: workosUserId });

  await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "no_show",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe("no_show");
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");

  await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "cancelled",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("cancelled");

  await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "booked",
  });
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");
});

test("rejects a booking owned by another team without changing either row", async () => {
  const { t, workosUserId, fixture } = await createFixture();
  await t.run((ctx) => ctx.db.patch(fixture.eventId, { teamId: fixture.otherTeamId }));
  const authed = t.withIdentity({ subject: workosUserId });

  await expect(authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
    bookingId: fixture.eventId,
    status: "cancelled",
  })).rejects.toThrow("Booking not found");

  expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe("booked");
  expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe("confirmed");
});

```

