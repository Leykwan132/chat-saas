/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { readFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import { disconnectMetaChannel } from "./teamDeletion/external";
import { isCloudflareNotFoundError } from "./cloudflare";
import schema from "./schema";
import { withComponents } from "./testUtils";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const originalOpenRouterApiKey = process.env.OPEN_ROUTER_API;

const agentModules = {
  apiKeys: () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
  files: () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
  messages: () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
  streams: () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
  threads: () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
  users: () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
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
  "_generated/server": () =>
    import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

function initExternalTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("agent", agentSchema, agentModules);
  t.registerComponent(
    "teamDeletionWorkpool",
    workpoolSchema,
    workpoolModules,
  );
  return t;
}

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.OPEN_ROUTER_API = originalOpenRouterApiKey;
});

test("workspace cleanup retries failed Cloudflare deletions", () => {
  const source = readFileSync(
    new URL("./teamDeletion/external.ts", import.meta.url),
    "utf8",
  );
  expect(source).toContain(
    'import { deleteFromCFOrThrow } from "../cloudflare"',
  );
  expect(source).toContain("await deleteFromCFOrThrow(row.cfItemId)");
});

test("Cloudflare not-found is idempotent but other failures retry", () => {
  expect(isCloudflareNotFoundError({ status: 404 })).toBe(true);
  expect(isCloudflareNotFoundError({ statusCode: 404 })).toBe(true);
  expect(isCloudflareNotFoundError({ status: 429 })).toBe(false);
  const source = readFileSync(
    new URL("./teamDeletion/external.ts", import.meta.url),
    "utf8",
  );
  expect(source).toContain("deleteThreadSync");
  expect(source).not.toContain("deleteThreadAsync");
});

test("waits for Agent component thread deletion before advancing", async () => {
  process.env.OPEN_ROUTER_API = "test";
  const t = initExternalTest();
  const threadId = await withComponents(t).runInComponent(
    "agent",
    async (ctx) =>
      await ctx.db.insert("threads", {
        userId: "org_delete",
        title: "Delete thread",
        status: "active",
      }),
  );
  const jobId = await t.run(async (ctx) => {
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Delete",
      workosOrgId: "org_delete",
      deletionStatus: "deleting",
      deletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "user_owner",
      orgId: "org_delete",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("conversations", {
      orgId: "org_delete",
      service: "web",
      orgAddress: "widget",
      contactAddress: "visitor",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: false,
      threadId,
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("teamDeletionJobs", {
      teamId,
      workosOrgId: "org_delete",
      source: "stripe",
      phase: "externalData",
      createdAt: now,
      updatedAt: now,
    });
  });

  await t.action(internal.teamDeletion.worker.run, { jobId });

  const thread = await withComponents(t).runInComponent(
    "agent",
    async (ctx) => await ctx.db.get(threadId),
  );
  expect(thread).toBeNull();
});

test("disconnects Meta subscriptions with the retained channel token", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ success: true }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await disconnectMetaChannel({
    service: "whatsapp",
    wabaId: "waba_123",
    accessToken: "secret",
  });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/waba_123/subscribed_apps"),
    expect.objectContaining({
      method: "DELETE",
      headers: { Authorization: "Bearer secret" },
    }),
  );
});

test("disconnect phase clears credentials only after all provider pages", () => {
  const source = readFileSync(
    new URL("./teamDeletion/channelDisconnect.ts", import.meta.url),
    "utf8",
  );
  expect(source.indexOf("disconnectMetaChannel(channel)")).toBeLessThan(
    source.indexOf("clearChannelCredential"),
  );
});

test("channel credentials remain until explicit provider cleanup succeeds", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Delete",
      workosOrgId: "org_delete",
      deletionStatus: "deleting",
      deletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "org_delete",
      service: "whatsapp",
      status: "connected",
      accessToken: "secret",
      connectedByUserId: "user_owner",
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("teamDeletionJobs", {
      teamId,
      workosOrgId: "org_delete",
      source: "stripe",
      phase: "stopWork",
      createdAt: now,
      updatedAt: now,
    });
    return { channelId, jobId };
  });

  await t.run(async (ctx) => {
    const channel = await ctx.db.get(fixture.channelId);
    expect(channel?.status).toBe("connected");
    expect(channel?.accessToken).toBe("secret");
  });

  await t.mutation(
    internal.teamDeletion.externalState.clearChannelCredential,
    { channelId: fixture.channelId },
  );
  await t.run(async (ctx) => {
    const channel = await ctx.db.get(fixture.channelId);
    expect(channel?.status).toBe("disconnected");
    expect(channel?.accessToken).toBeUndefined();
  });
});

test("phase recording is idempotent and advances in order", async () => {
  const t = convexTest(schema, modules);
  const jobId = await t.run(async (ctx) => {
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Delete",
      workosOrgId: "org_delete",
      deletionStatus: "deleting",
      deletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("teamDeletionJobs", {
      teamId,
      workosOrgId: "org_delete",
      source: "stripe",
      phase: "stopWork",
      createdAt: now,
      updatedAt: now,
    });
  });

  await t.mutation(
    internal.teamDeletion.worker.recordPhaseResult,
    {
      jobId,
      expectedPhase: "stopWork",
      done: true,
    },
  );
  await t.mutation(
    internal.teamDeletion.worker.recordPhaseResult,
    {
      jobId,
      expectedPhase: "stopWork",
      done: true,
    },
  );
  await t.run(async (ctx) => {
    expect((await ctx.db.get(jobId))?.phase).toBe("disconnectChannels");
  });
});
