/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createTwoBookings(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "edit-target-owner",
      email: "edit-target@example.com",
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
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "edit-target-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      service: "web",
      contactAddress: "visitor",
      name: "Kwan",
      tags: [],
      source: "web",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId,
      name: "Test",
      isActive: true,
      sortOrder: 0,
      durationMinutes: 30,
      fields: [],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "web",
      orgAddress: "business",
      contactAddress: "visitor",
      customerId,
      status: "booked",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-edit-target",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const earlierId = await insertBooking(ctx, {
      teamId, userId, agentId, serviceId, conversationId, now,
      title: "Earlier",
      startAt: now + 86_400_000,
      updatedAt: now,
    });
    const laterId = await insertBooking(ctx, {
      teamId, userId, agentId, serviceId, conversationId, now,
      title: "Later",
      startAt: now + 172_800_000,
      updatedAt: now + 1_000,
    });
    return { conversationId, earlierId, laterId };
  });
}

async function insertBooking(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    agentId: Id<"agents">;
    serviceId: Id<"appointmentServices">;
    conversationId: Id<"conversations">;
    now: number;
    title: string;
    startAt: number;
    updatedAt: number;
  },
) {
  const eventId = await ctx.db.insert("calendarEvents", {
    teamId: args.teamId,
    title: args.title,
    startAt: args.startAt,
    endAt: args.startAt + 1_800_000,
    timeZone: "Asia/Kuala_Lumpur",
    status: "confirmed",
    createdBy: args.userId,
    agentId: args.agentId,
    conversationId: args.conversationId,
    appointmentServiceId: args.serviceId,
    bookingSource: "ai",
    createdAt: args.now,
    updatedAt: args.updatedAt,
  });
  await ctx.db.insert("appointmentBookingSessions", {
    conversationId: args.conversationId,
    agentId: args.agentId,
    serviceId: args.serviceId,
    status: "booked",
    collectedFields: { name: "Kwan" },
    calendarEventId: eventId,
    createdAt: args.now,
    updatedAt: args.updatedAt,
  });
  return eventId as Id<"calendarEvents">;
}

test("editing a named booking opens that appointment and leaves the other booked", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createTwoBookings(t);
  const started = await t.mutation(internal.appointmentBooking.editing.beginBookingEdit, {
    conversationId: fixture.conversationId,
    bookingId: fixture.earlierId,
  });
  expect(started).toMatchObject({ success: true, bookingId: fixture.earlierId, status: "editing" });
  const sessions = await t.run(async (ctx) => await ctx.db.query("appointmentBookingSessions").collect());
  expect(sessions.find((session) => session.calendarEventId === fixture.earlierId)?.status).toBe("editing");
  expect(sessions.find((session) => session.calendarEventId === fixture.laterId)?.status).toBe("booked");
});

test("editing a completed named booking opens only that appointment", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createTwoBookings(t);
  await t.run(async (ctx) => {
    const session = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", fixture.earlierId))
      .unique();
    if (session === null) throw new Error("Booking session not found");
    await ctx.db.patch(session._id, { status: "completed" });
  });

  const started = await t.mutation(internal.appointmentBooking.editing.beginBookingEdit, {
    conversationId: fixture.conversationId,
    bookingId: fixture.earlierId,
  });

  expect(started).toMatchObject({ success: true, bookingId: fixture.earlierId, status: "editing" });
  const sessions = await t.run(async (ctx) => await ctx.db.query("appointmentBookingSessions").collect());
  expect(sessions.find((session) => session.calendarEventId === fixture.earlierId)?.status).toBe("editing");
  expect(sessions.find((session) => session.calendarEventId === fixture.laterId)?.status).toBe("booked");
});

test("editing refuses to guess when the customer has more than one booking", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createTwoBookings(t);
  const started = await t.mutation(internal.appointmentBooking.editing.beginBookingEdit, {
    conversationId: fixture.conversationId,
  });
  expect(started).toMatchObject({ success: false });
  const sessions = await t.run(async (ctx) => await ctx.db.query("appointmentBookingSessions").collect());
  expect(sessions.every((session) => session.status === "booked")).toBe(true);
});
