/// <reference types="vite/client" />
import { readFileSync } from "node:fs";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

test("exports the appointment service selection normalizer", () => {
  const source = readFileSync(
    new URL("./workflowAppointmentServices.ts", import.meta.url),
    "utf8",
  );

  expect(source).toContain(
    "export async function normalizeAllowedAppointmentServiceIds",
  );
});

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return t;
}

async function createPersonalAgent(
  t: ReturnType<typeof initTest>,
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
    const agentId = await ctx.db.insert("agents", {
      name: "Workflow Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    return { agentId, teamId, ownerWorkosUserId: workosUserId };
  });
}

async function createTeamMember(
  t: ReturnType<typeof initTest>,
  teamId: Id<"teams">,
  workosUserId: string,
  firstName: string,
  lastName: string,
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: `${workosUserId}@example.com`,
      firstName,
      lastName,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "member",
      createdAt: now,
    });
  });
}

async function createBookingService(
  t: ReturnType<typeof initTest>,
  agentId: Id<"agents">,
  name: string,
  sortOrder: number,
  isActive = true,
  assignedWorkosUserIds?: string[],
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("appointmentServices", {
      agentId,
      name,
      isActive,
      sortOrder,
      durationMinutes: 30,
      bufferMinutes: 0,
      fields: [
        { key: "date", label: "Booking Date", type: "date" },
        { key: "time", label: "Booking Time", type: "time" },
      ],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      assignedWorkosUserIds,
      createdAt: now,
      updatedAt: now,
    });
  });
}

test("workflow service rows include assigned teammate names", async () => {
  const t = initTest();
  const ownerWorkosUserId = "user-workflow-service-team";
  const { agentId, teamId } = await createPersonalAgent(t, ownerWorkosUserId);
  const teammateWorkosUserId = "taylor-workos-id";
  await createTeamMember(t, teamId, teammateWorkosUserId, "Taylor", "Walker");
  await createBookingService(t, agentId, "Consultation", 0);
  await createBookingService(
    t,
    agentId,
    "Installation",
    1,
    true,
    [teammateWorkosUserId],
  );

  const rows = await t.withIdentity({ subject: ownerWorkosUserId }).query(
    api.workflowAppointmentServices.listForAgent,
    { agentId },
  );

  expect(rows.find((service) => service.name === "Consultation")?.assignedTeammates)
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ workosUserId: ownerWorkosUserId }),
      expect.objectContaining({ name: "Taylor Walker" }),
    ]));
  expect(rows.find((service) => service.name === "Installation")?.assignedTeammates)
    .toEqual([{ workosUserId: teammateWorkosUserId, name: "Taylor Walker" }]);
});

test("book appointment service selection filters active booking services", async () => {
  const t = initTest();
  const workosUserId = "user-workflow-booking-services";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const consultationId = await createBookingService(t, agentId, "Consultation", 0);
  const installationId = await createBookingService(t, agentId, "Installation", 1);
  await createBookingService(t, agentId, "Archived", 2, false);

  const authed = t.withIdentity({ subject: workosUserId });
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  const withBookAppointment = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "bookAppointment",
  });
  const bookAppointmentNode = withBookAppointment.nodes.find(
    (node) => node.kind === "bookAppointment",
  );

  const unrestricted = await t.query(internal.appointmentBooking.services.listActiveServices, { agentId });
  expect(unrestricted.services.map((service) => service.serviceId)).toEqual([
    consultationId,
    installationId,
  ]);

  await authed.mutation(api.workflowAppointmentServices.updateAllowedServices, {
    agentId,
    nodeId: bookAppointmentNode!._id,
    serviceIds: [installationId],
  });

  const selected = await t.query(internal.appointmentBooking.services.listActiveServices, { agentId });
  expect(selected.enabled).toBe(true);
  expect(selected.services.map((service) => service.serviceId)).toEqual([installationId]);

  await authed.mutation(api.workflowAppointmentServices.updateAllowedServices, {
    agentId,
    nodeId: bookAppointmentNode!._id,
    serviceIds: [],
  });

  const disabled = await t.query(internal.appointmentBooking.services.listActiveServices, { agentId });
  expect(disabled.enabled).toBe(false);
  expect(disabled.services).toEqual([]);
});
