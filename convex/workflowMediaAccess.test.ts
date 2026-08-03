/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { PERSONAL_ORG_ID } from "./teamHelpers";
import { MediaUploadPurpose } from "../shared/mediaUploadPurpose";

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
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
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
    return { agentId };
  });
}

async function addNode(
  authed: ReturnType<ReturnType<typeof initTest>["withIdentity"]>,
  agentId: Awaited<ReturnType<typeof createPersonalAgent>>["agentId"],
  kind: "sendText" | "sendImage",
) {
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  const nextGraph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind,
  });
  return [...nextGraph.nodes]
    .filter((node) => node.kind === kind)
    .sort((a, b) => b._creationTime - a._creationTime)[0]!;
}

test("workflow media creation rejects non-Send Media nodes and cross-owner access", async () => {
  const t = initTest();
  const ownerId = "workflow-media-owner";
  const outsiderId = "workflow-media-outsider";
  const { agentId } = await createPersonalAgent(t, ownerId);
  await createPersonalAgent(t, outsiderId);
  const owner = t.withIdentity({ subject: ownerId });
  const messageNode = await addNode(owner, agentId, "sendText");
  const mediaNode = await addNode(owner, agentId, "sendImage");

  await expect(
    owner.mutation(internal.workflowMediaInternal.internalCreateUpload, {
      agentId,
      nodeId: messageNode._id,
      clientId: "non-send-media",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 10,
    }),
  ).rejects.toThrow("Workflow media node not found");

  const outsider = t.withIdentity({ subject: outsiderId });
  await expect(
    outsider.mutation(internal.workflowMediaInternal.internalCreateUpload, {
      agentId,
      nodeId: mediaNode._id,
      clientId: "outside",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 10,
    }),
  ).rejects.toThrow("Agent not found");
});

test("ready workflow media is scoped to the matching Send Media node", async () => {
  const t = initTest();
  const workosUserId = "workflow-media-ready";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const firstNode = await addNode(authed, agentId, "sendImage");
  const secondNode = await addNode(authed, agentId, "sendImage");

  await t.run(async (ctx) => {
    const now = Date.now();
    for (const [clientId, nodeId] of [
      ["first", firstNode._id],
      ["second", secondNode._id],
    ] as const) {
      await ctx.db.insert("mediaUploads", {
        clientId,
        orgId: PERSONAL_ORG_ID,
        userId: workosUserId,
        status: "ready",
        publicUrl: `https://cdn.example.com/${clientId}.jpg`,
        mediaType: "image/jpeg",
        filename: `${clientId}.jpg`,
        fileSize: 10,
        purpose: MediaUploadPurpose.WorkflowSendMedia,
        agentId,
        workflowNodeId: nodeId,
        createdAt: now,
      });
    }
  });

  const firstAssets = await t.query(internal.workflowMediaInternal.internalListReadyByNode, {
    agentId,
    nodeId: firstNode._id,
  });
  expect(firstAssets.map((asset) => asset.clientId)).toEqual(["first"]);
});
