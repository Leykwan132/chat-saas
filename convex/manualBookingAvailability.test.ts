/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const workpoolModules = {
  complete: () => import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
  config: () => import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
  crons: () => import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
  danger: () => import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
  kick: () => import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
  lib: () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
  logging: () => import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
  loop: () => import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
  recovery: () => import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
  stats: () => import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
  worker: () => import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

test("manual booking checks and revalidates the exact selected slot", async () => {
  const t = convexTest(schema, modules);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  const workosUserId = "manual-booking-owner";
  const startAt = Date.UTC(2026, 6, 14, 9, 11, 0);
  const endAt = Date.UTC(2026, 6, 14, 10, 26, 0);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "manual-booking@example.com",
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
    await ctx.db.insert("userSchedules", {
      agentId,
      workosUserId,
      mode: "manual",
      manualStatus: "available",
      timezone: "UTC",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      service: "whatsapp",
      contactAddress: "+60123456789",
      name: "Stored Customer",
      email: "stored@example.com",
      phone: "+60123456789",
      searchText: "stored customer stored@example.com +60123456789",
      tags: [],
      source: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      contactName: "Customer",
      customerId,
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-manual-booking",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const serviceId = await ctx.db.insert("appointmentServices", {
      agentId,
      name: "Consultation",
      isActive: true,
      sortOrder: 0,
      durationMinutes: 30,
      timeZone: "UTC",
      fields: [
        { key: "date", label: "Booking Date", type: "date" },
        { key: "time", label: "Booking Time", type: "time" },
        { key: "requirements", label: "Requirements", type: "text" },
      ],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
    return { userId, teamId, conversationId, serviceId };
  });
  const authed = t.withIdentity({ subject: workosUserId });
  const selection = {
    conversationId: fixture.conversationId,
    serviceId: fixture.serviceId,
    startAt,
    endAt,
  };

  const options = await authed.query(api.appointmentBooking.manualBooking.getCreateOptions, {
    conversationId: fixture.conversationId,
  });
  expect(options.customer).toMatchObject({
    service: "whatsapp",
    contactAddress: "+60123456789",
  });

  await expect(authed.mutation(
    api.appointmentBooking.manualBooking.checkAvailability,
    selection,
  )).resolves.toEqual({ available: true });

  const created = await authed.mutation(api.appointmentBooking.manualBooking.create, {
    ...selection,
    collectedFields: { date: "2026-07-14", time: "9:11am" },
    remarks: "  Bring the sample catalogue.  ",
  });
  const records = await t.run(async (ctx) => ({
    event: await ctx.db.get(created.eventId),
    session: await ctx.db.get(created.sessionId),
  }));
  expect(records.event).toMatchObject({
    remarks: "Bring the sample catalogue.",
    title: "Consultation - Stored Customer",
  });
  expect(records.session).toMatchObject({
    collectedFields: {
      date: "2026-07-14",
      time: "9:11am",
      name: "Stored Customer",
      phone: "+60123456789",
      email: "stored@example.com",
    },
  });

  await expect(authed.mutation(
    api.appointmentBooking.manualBooking.checkAvailability,
    selection,
  )).resolves.toEqual({
    available: false,
    message: "That slot is no longer available.",
  });
  await expect(authed.mutation(api.appointmentBooking.manualBooking.create, {
    ...selection,
    collectedFields: { date: "2026-07-14", time: "9:11 AM" },
  })).rejects.toThrow("That slot is no longer available.");

  await expect(authed.mutation(
    api.appointmentBooking.manualBooking.checkAvailability,
    { ...selection, endAt: startAt },
  )).rejects.toThrow("End time must be after start time.");
});
