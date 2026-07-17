/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

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
    return await ctx.db.insert("agents", {
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
  });
}

async function createBookingService(
  t: ReturnType<typeof initTest>,
  agentId: Id<"agents">,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("appointmentServices", {
      agentId,
      name: "Consultation",
      isActive: true,
      sortOrder: 0,
      durationMinutes: 30,
      bufferMinutes: 0,
      fields: [
        { key: "date", label: "Booking Date", type: "date" },
        { key: "time", label: "Booking Time", type: "time" },
      ],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
  });
}

test("applies node, condition, and service settings atomically", async () => {
  const t = initTest();
  const workosUserId = "workflow-node-config-owner";
  const agentId = await createPersonalAgent(t, workosUserId);
  const serviceId = await createBookingService(t, agentId);
  const authed = t.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = initial.nodes.find((node) => node.kind === "start")!;
  const graph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode._id,
    kind: "bookAppointment",
  });
  const bookingNode = graph.nodes.find((node) => node.kind === "bookAppointment")!;
  const bookingEdge = graph.edges.find((edge) => edge.targetNodeId === bookingNode._id)!;

  const updated = await authed.mutation(api.workflowNodeConfig.apply, {
    agentId,
    nodeId: bookingNode._id,
    conditionEdgeId: bookingEdge._id,
    title: "  Schedule a consultation  ",
    description: "   ",
    conditionLabel: "  Ready to book  ",
    conditionDetail: "  When the customer asks for an appointment  ",
    allowedAppointmentServiceIds: [serviceId, serviceId],
  });

  const updatedNode = updated.nodes.find((node) => node._id === bookingNode._id);
  expect(updatedNode).toMatchObject({
    title: "Schedule a consultation",
    allowedAppointmentServiceIds: [serviceId],
  });
  expect(updatedNode?.description).toBeUndefined();
  expect(updated.edges.find((edge) => edge._id === bookingEdge._id)).toMatchObject({
    label: "Ready to book",
    detail: "When the customer asks for an appointment",
  });
});

test("rejects an unrelated condition edge without partially updating the node", async () => {
  const t = initTest();
  const workosUserId = "workflow-node-config-rollback";
  const agentId = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = initial.nodes.find((node) => node.kind === "start")!;
  const graph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode._id,
    kind: "sendText",
  });
  const messageNode = graph.nodes.find((node) => node.kind === "sendText")!;
  const unrelatedEdgeId = await t.run(async (ctx) => {
    const now = Date.now();
    const otherAgentId = await ctx.db.insert("agents", {
      name: "Other Workflow Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: "other-user",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const otherWorkflowId = await ctx.db.insert("workflows", {
      agentId: otherAgentId,
      orgId: "",
      userId: workosUserId,
      name: "Other",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("workflowEdges", {
      workflowId: otherWorkflowId,
      sourceNodeId: startNode._id,
      targetNodeId: messageNode._id,
      createdAt: now,
      updatedAt: now,
    });
  });

  await expect(
    authed.mutation(api.workflowNodeConfig.apply, {
      agentId,
      nodeId: messageNode._id,
      conditionEdgeId: unrelatedEdgeId,
      title: "Invalid",
      conditionLabel: "Invalid",
    }),
  ).rejects.toThrow("Workflow edge not found");

  const persistedNode = await t.run(async (ctx) => await ctx.db.get(messageNode._id));
  expect(persistedNode?.title).toBe(messageNode.title);
});

test("rejects archived and cross-agent services before updating the node", async () => {
  const t = initTest();
  const workosUserId = "workflow-node-config-services";
  const agentId = await createPersonalAgent(t, workosUserId);
  const archivedServiceId = await createBookingService(t, agentId);
  const crossAgentServiceId = await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.patch(archivedServiceId, { archivedAt: now });
    const otherAgentId = await ctx.db.insert("agents", {
      name: "Other Service Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: "other-service-user",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("appointmentServices", {
      agentId: otherAgentId,
      name: "Other Consultation",
      isActive: true,
      sortOrder: 0,
      durationMinutes: 30,
      bufferMinutes: 0,
      fields: [
        { key: "date", label: "Booking Date", type: "date" },
        { key: "time", label: "Booking Time", type: "time" },
      ],
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
  });
  const authed = t.withIdentity({ subject: workosUserId });
  const initial = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = initial.nodes.find((node) => node.kind === "start")!;
  const graph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode._id,
    kind: "bookAppointment",
  });
  const bookingNode = graph.nodes.find((node) => node.kind === "bookAppointment")!;

  for (const serviceId of [archivedServiceId, crossAgentServiceId]) {
    await expect(
      authed.mutation(api.workflowNodeConfig.apply, {
        agentId,
        nodeId: bookingNode._id,
        title: "Invalid",
        allowedAppointmentServiceIds: [serviceId],
      }),
    ).rejects.toThrow("Service not found");
  }

  const persistedNode = await t.run(async (ctx) => await ctx.db.get(bookingNode._id));
  expect(persistedNode?.title).toBe(bookingNode.title);
  expect(persistedNode?.allowedAppointmentServiceIds).toBeUndefined();
});
