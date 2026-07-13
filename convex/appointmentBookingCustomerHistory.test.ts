/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("lists all completed booking statuses for a customer across conversations newest first", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "booking-history-owner";
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "owner@example.com",
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
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      service: "whatsapp",
      contactAddress: "+60111111111",
      name: "Aisha",
      tags: [],
      source: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId,
      name: "Showroom viewing",
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
    const conversationIds = [];
    for (let index = 0; index < 4; index += 1) {
      conversationIds.push(await ctx.db.insert("conversations", {
        orgId: "",
        service: "whatsapp",
        orgAddress: "business",
        contactAddress: `customer-${index}`,
        customerId,
        status: "open",
        assignedAgentId: agentId,
        assignToAiAgent: true,
        threadId: `history-${index}`,
        lastMessageAt: now,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
      }));
    }
    const statuses = ["booked", "completed", "cancelled", "no_show"] as const;
    const starts = [now + 1_000, now + 2_000, now + 3_000, now + 4_000];
    for (let index = 0; index < statuses.length; index += 1) {
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId,
        title: `Viewing ${index}`,
        startAt: starts[index]!,
        endAt: starts[index]! + 1_800_000,
        timeZone: "UTC",
        status: statuses[index] === "cancelled" ? "cancelled" : "confirmed",
        createdBy: userId,
        agentId,
        conversationId: conversationIds[index],
        appointmentServiceId: serviceId,
        bookingSource: "manual",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("appointmentBookingSessions", {
        conversationId: conversationIds[index]!,
        agentId,
        serviceId,
        status: statuses[index]!,
        collectedFields: { name: "Aisha" },
        calendarEventId: eventId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("calendarEventParticipants", {
        eventId,
        teamId,
        participantType: "customer",
        role: "customer",
        customerId,
        email: "aisha@example.com",
        displayName: "Aisha",
        eventStartAt: starts[index]!,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { conversationId: conversationIds[0]! };
  });

  const history = await t.withIdentity({ subject: workosUserId }).query(
    api.appointmentBooking.customerBookings.listForConversation,
    { conversationId: fixture.conversationId },
  );

  expect(history.map((item) => item.status)).toEqual(["no_show", "cancelled", "completed", "booked"]);
  expect(history.map((item) => item.startAt)).toEqual([...history.map((item) => item.startAt)].sort((a, b) => b - a));
  expect(history.every((item) => item.bookingReference === item.bookingId)).toBe(true);
});
