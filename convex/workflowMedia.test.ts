/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import r2Schema from "../node_modules/@convex-dev/r2/dist/component/schema.js";
import { PERSONAL_ORG_ID } from "./teamHelpers";
import { withComponents } from "./testUtils";

const modules = import.meta.glob("./**/*.ts");
process.env.MEDIA_CDN_BASE_URL = "https://cdn.example.com";
const r2Modules = {
  lib: async () => {
    const { mutation } = await import("../node_modules/@convex-dev/r2/dist/component/_generated/server.js");
    const { v } = await import("convex/values");
    return {
      deleteObject: mutation({
        args: { key: v.string(), bucket: v.string(), endpoint: v.string(), accessKeyId: v.string(), secretAccessKey: v.string() },
        returns: v.null(),
        handler: async () => null,
      }),
    };
  },
  "_generated/server": () => import("../node_modules/@convex-dev/r2/dist/component/_generated/server.js"),
};
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

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("r2", r2Schema, r2Modules);
  t.registerComponent("mediaDeleteWorkpool", workpoolSchema, workpoolModules);
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
    return { agentId };
  });
}

async function addNode(
  authed: ReturnType<ReturnType<typeof initTest>["withIdentity"]>,
  agentId: Awaited<ReturnType<typeof createPersonalAgent>>["agentId"],
  kind: "sendImage" | "sendFile",
) {
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  const nextGraph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind,
  });
  const node = [...nextGraph.nodes]
    .filter((node) => node.kind === kind)
    .sort((a, b) => b._creationTime - a._creationTime)[0]!;
  const edge = nextGraph.edges.find((edge) => edge.targetNodeId === node._id)!;
  const configuredGraph = await authed.mutation(api.workflowNodeConfig.apply, {
    agentId,
    nodeId: node._id,
    conditionEdgeId: edge._id,
    title: node.title,
    conditionDetail: "When the customer requests this media",
  });
  return configuredGraph.nodes.find((configuredNode) => configuredNode._id === node._id)!;
}

test("legacy knowledge base files import into a Send Files node", async () => {
  const t = initTest();
  const workosUserId = "workflow-media-import";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const mediaNode = await addNode(authed, agentId, "sendFile");

  await t.run(async (ctx) => {
    await ctx.db.insert("mediaUploads", {
      clientId: "legacy",
      orgId: PERSONAL_ORG_ID,
      userId: workosUserId,
      status: "ready",
      publicUrl: "https://cdn.example.com/legacy.pdf",
      mediaType: "application/pdf",
      filename: "legacy.pdf",
      fileSize: 20,
      purpose: "knowledgeBase",
      agentId,
      createdAt: Date.now(),
    });
  });

  const importResult = await authed.mutation(api.workflowMedia.importLegacyMedia, {
    agentId,
    nodeId: mediaNode._id,
    clientIds: ["legacy"],
  });
  expect(importResult.imported).toBe(1);

  const nodeMedia = await authed.query(api.workflowMedia.listForNode, {
    agentId,
    nodeId: mediaNode._id,
  });
  expect(nodeMedia.map((entry) => entry.clientId)).toEqual(["legacy"]);
  await t.run(async (ctx) => {
    expect(await ctx.db.get(mediaNode._id)).toMatchObject({ isReady: true });
  });
});

test("workflow media upload types are scoped by media node kind", async () => {
  const t = initTest();
  const workosUserId = "workflow-media-types";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const photoVideoNode = await addNode(authed, agentId, "sendImage");
  const fileNode = await addNode(authed, agentId, "sendFile");

  await expect(
    authed.mutation(internal.workflowMediaInternal.internalCreateUpload, {
      agentId,
      nodeId: photoVideoNode._id,
      clientId: "video",
      fileName: "clip.mp4",
      mimeType: "video/mp4",
      fileSize: 10,
    }),
  ).resolves.toBeDefined();

  await expect(
    authed.mutation(internal.workflowMediaInternal.internalCreateUpload, {
      agentId,
      nodeId: photoVideoNode._id,
      clientId: "pdf-in-photo-video",
      fileName: "brochure.pdf",
      mimeType: "application/pdf",
      fileSize: 10,
    }),
  ).rejects.toThrow("brochure.pdf is not a supported photo or video type");

  await expect(
    authed.mutation(internal.workflowMediaInternal.internalCreateUpload, {
      agentId,
      nodeId: fileNode._id,
      clientId: "pdf-file",
      fileName: "brochure.pdf",
      mimeType: "application/pdf",
      fileSize: 10,
    }),
  ).resolves.toBeDefined();

  await expect(
    authed.mutation(internal.workflowMediaInternal.internalCreateUpload, {
      agentId,
      nodeId: fileNode._id,
      clientId: "image-in-file",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 10,
    }),
  ).rejects.toThrow("photo.jpg is not a supported file type");
});

test("finishing a media upload marks its node ready", async () => {
  const t = initTest();
  const workosUserId = "workflow-media-readiness";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const mediaNode = await addNode(authed, agentId, "sendImage");

  await authed.mutation(internal.workflowMediaInternal.internalCreateUpload, {
    agentId,
    nodeId: mediaNode._id,
    clientId: "workflow-image",
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    fileSize: 10,
  });
  await authed.mutation(internal.workflowMediaInternal.internalFinalizeDirectUpload, {
    agentId,
    nodeId: mediaNode._id,
    clientId: "workflow-image",
    key: "workflow-media/photo.jpg",
  });

  await t.run(async (ctx) => {
    expect(await ctx.db.get(mediaNode._id)).toMatchObject({ isReady: true });
  });
});

test("removing a Send Media node cleans up node media", async () => {
  const t = initTest();
  const workosUserId = "workflow-media-remove-node";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const mediaNode = await addNode(authed, agentId, "sendImage");
  const otherNode = await addNode(authed, agentId, "sendImage");

  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const readyId = await ctx.db.insert("mediaUploads", {
      clientId: "delete-ready",
      orgId: PERSONAL_ORG_ID,
      userId: workosUserId,
      status: "ready",
      r2Key: "workflow-media/delete-ready.jpg",
      publicUrl: "https://cdn.example.com/delete-ready.jpg",
      mediaType: "image/jpeg",
      filename: "delete-ready.jpg",
      fileSize: 10,
      purpose: "workflowSendMedia",
      agentId,
      workflowNodeId: mediaNode._id,
      createdAt: now,
    });
    const pendingId = await ctx.db.insert("mediaUploads", {
      clientId: "delete-pending",
      orgId: PERSONAL_ORG_ID,
      userId: workosUserId,
      status: "uploading",
      mediaType: "image/jpeg",
      filename: "delete-pending.jpg",
      fileSize: 10,
      purpose: "workflowSendMedia",
      agentId,
      workflowNodeId: mediaNode._id,
      createdAt: now,
    });
    const otherId = await ctx.db.insert("mediaUploads", {
      clientId: "keep-ready",
      orgId: PERSONAL_ORG_ID,
      userId: workosUserId,
      status: "ready",
      r2Key: "workflow-media/keep-ready.jpg",
      publicUrl: "https://cdn.example.com/keep-ready.jpg",
      mediaType: "image/jpeg",
      filename: "keep-ready.jpg",
      fileSize: 10,
      purpose: "workflowSendMedia",
      agentId,
      workflowNodeId: otherNode._id,
      createdAt: now,
    });
    return { readyId, pendingId, otherId };
  });

  const graph = await authed.mutation(api.workflows.removeNode, {
    agentId,
    nodeId: mediaNode._id,
  });

  const rows = await t.run(async (ctx) => ({
    ready: await ctx.db.get(ids.readyId),
    pending: await ctx.db.get(ids.pendingId),
    other: await ctx.db.get(ids.otherId),
  }));
  const work = await withComponents(t).runInComponent(
    "mediaDeleteWorkpool",
    async (ctx) => await ctx.db.query("work").collect(),
  );

  expect(graph.nodes.some((node) => node._id === mediaNode._id)).toBe(false);
  expect(rows.ready === null || rows.ready.status === "deleting").toBe(true);
  expect(rows.pending?.status).toBe("cancelled");
  expect(rows.other?.status).toBe("ready");
  expect(work.length).toBeGreaterThanOrEqual(1);
});
