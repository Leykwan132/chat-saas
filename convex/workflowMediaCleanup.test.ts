/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import r2Schema from "../node_modules/@convex-dev/r2/dist/component/schema.js";
import { generateWorkflowMediaKey } from "./media/r2";
import { PERSONAL_ORG_ID } from "./teamHelpers";
import { withComponents } from "./testUtils";
import { MediaUploadPurpose } from "../shared/mediaUploadPurpose";

const modules = import.meta.glob("./**/*.ts");
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
    "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return t;
}

async function createAgent(t: ReturnType<typeof initTest>, workosUserId: string) {
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
      systemPrompt: "Test",
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

async function addMediaNode(
  authed: ReturnType<ReturnType<typeof initTest>["withIdentity"]>,
  agentId: Awaited<ReturnType<typeof createAgent>>["agentId"],
) {
  const graph = await authed.mutation(api.workflows.ensureForAgent, { agentId });
  const startNode = graph.nodes.find((node) => node.kind === "start");
  const nextGraph = await authed.mutation(api.workflows.addNodeAfter, {
    agentId,
    sourceNodeId: startNode!._id,
    kind: "sendImage",
  });
  return nextGraph.nodes.find((node) => node.kind === "sendImage")!;
}

test("deleting one Send Media asset queues storage cleanup", async () => {
  const t = initTest();
  const workosUserId = "workflow-media-delete-one";
  const { agentId } = await createAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const mediaNode = await addMediaNode(authed, agentId);
  const uploadId = await t.run(async (ctx) => await ctx.db.insert("mediaUploads", {
    clientId: "delete-one",
    orgId: PERSONAL_ORG_ID,
    userId: workosUserId,
    status: "ready",
    r2Key: "workflow-media/delete-one.jpg",
    publicUrl: "https://cdn.example.com/delete-one.jpg",
    mediaType: "image/jpeg",
    filename: "delete-one.jpg",
    fileSize: 10,
    purpose: MediaUploadPurpose.WorkflowSendMedia,
    agentId,
    workflowNodeId: mediaNode._id,
    createdAt: Date.now(),
  }));

  await authed.action(api.workflowMedia.enqueueDelete, {
    agentId,
    nodeId: mediaNode._id,
    clientId: "delete-one",
  });

  const row = await t.run(async (ctx) => await ctx.db.get(uploadId));
  expect(row === null || row.status === "deleting").toBe(true);
});

test("late direct upload sync after node deletion deletes the asset", async () => {
  process.env.MEDIA_CDN_BASE_URL = "https://cdn.example.com";
  const t = initTest();
  const workosUserId = "workflow-media-late-sync";
  const { agentId } = await createAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });
  const mediaNode = await addMediaNode(authed, agentId);
  const key = generateWorkflowMediaKey(
    PERSONAL_ORG_ID,
    agentId,
    mediaNode._id,
    "late-sync",
    "late-sync.jpg",
  );
  const uploadId = await t.run(async (ctx) => await ctx.db.insert("mediaUploads", {
    clientId: "late-sync",
    orgId: PERSONAL_ORG_ID,
    userId: workosUserId,
    status: "uploading",
    mediaType: "image/jpeg",
    filename: "late-sync.jpg",
    fileSize: 10,
    purpose: MediaUploadPurpose.WorkflowSendMedia,
    agentId,
    workflowNodeId: mediaNode._id,
    createdAt: Date.now(),
  }));

  await authed.mutation(api.workflows.removeNode, { agentId, nodeId: mediaNode._id });
  await authed.mutation(internal.workflowMediaInternal.internalFinalizeDirectUpload, {
    agentId,
    nodeId: mediaNode._id,
    clientId: "late-sync",
    key,
  });

  const row = await t.run(async (ctx) => await ctx.db.get(uploadId));
  const work = await withComponents(t).runInComponent(
    "mediaDeleteWorkpool",
    async (ctx) => await ctx.db.query("work").collect(),
  );
  expect(row === null || row.status === "deleting").toBe(true);
  expect(work.length).toBeGreaterThanOrEqual(1);
});
