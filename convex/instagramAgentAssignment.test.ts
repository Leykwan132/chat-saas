import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

vi.mock("./plans", async (importOriginal) => ({
  ...await importOriginal<typeof import("./plans")>(),
  getPlanForWorkspaceResource: vi.fn(async () => ({ plan: "growth" })),
  getChannelLimitForOrg: vi.fn(async () => 10),
}));

vi.mock("./channelSyncPools", () => ({
  instagramSyncPool: { enqueueAction: vi.fn(async () => "job") },
  messengerSyncPool: { enqueueAction: vi.fn(async () => "job") },
  whatsappSyncPool: { enqueueAction: vi.fn(async () => "job") },
}));

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => {
  vi.stubEnv("META_IG_APP_ID", "test-app");
  vi.stubEnv("META_IG_APP_SECRET", "test-secret");
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const body = url.pathname.endsWith("/oauth/access_token")
      ? { access_token: "short-token", user_id: "ig-1" }
      : url.pathname.endsWith("/access_token")
        ? { access_token: "long-token", expires_in: 5_184_000 }
        : url.pathname.endsWith("/me")
          ? { id: "ig-1", username: "store" }
        : url.pathname.endsWith("/subscribed_apps")
          ? { success: true }
          : url.pathname.endsWith("/conversations")
            ? { data: [] }
            : undefined;
    if (!body) throw new Error(`Unexpected Graph URL: ${url.pathname}`);
    return new Response(JSON.stringify(body), { status: 200 });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "owner",
      email: "leykwan132@gmail.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal", name: "Personal", ownerId: userId,
      createdAt: now, updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    const agent = {
      name: "Selected", provider: "google" as const, model: "test",
      systemPrompt: "Test", templateKey: "blank" as const, fileSize: 0,
      userId: "owner", orgId: "", createdAt: now, updatedAt: now,
    };
    const selectedAgentId = await ctx.db.insert("agents", agent);
    const newestAgentId = await ctx.db.insert("agents", { ...agent, name: "Newest" });
    const foreignAgentId = await ctx.db.insert("agents", {
      ...agent, name: "Foreign", userId: "someone-else",
    });
    return { selectedAgentId, newestAgentId, foreignAgentId };
  });
  const owner = t.withIdentity({ subject: "owner", email: "leykwan132@gmail.com" });
  return { t, owner, ...ids };
}

test("Instagram Login saves the selected agent and remains visible after empty backfill", async () => {
  const { t, owner, selectedAgentId, newestAgentId } = await setup();
  const { channelId } = await t.action(internal.instagramConnect.internalCompleteSignup, {
    agentId: selectedAgentId, code: "code", redirectUri: "https://example.com/callback", orgId: "", userId: "owner",
  });
  await t.action(internal.instagramSync.backfillConversations, { channelId, limit: 10 });
  const visible = await owner.query(api.channels.listForCurrentOrg, { agentId: selectedAgentId });
  expect(visible).toMatchObject([{
    _id: channelId, status: "connected", defaultAgentId: selectedAgentId,
    orgId: "", connectedByUserId: "owner", conversationCount: 0,
  }]);
  expect(await owner.query(api.channels.listForCurrentOrg, { agentId: newestAgentId })).toEqual([]);
});

test("Instagram Login reconnect replaces a disconnected account's old agent assignment", async () => {
  const { t, selectedAgentId, newestAgentId } = await setup();
  const existingId = await t.run(async (ctx) => ctx.db.insert("channels", {
    service: "instagram", igUserId: "ig-1", orgId: "", connectedByUserId: "owner",
    defaultAgentId: newestAgentId, status: "disconnected", createdAt: 1, updatedAt: 1,
  }));
  const { channelId } = await t.action(internal.instagramConnect.internalCompleteSignup, {
    agentId: selectedAgentId, code: "code", redirectUri: "https://example.com/callback", orgId: "", userId: "owner",
  });
  expect(channelId).toBe(existingId);
  expect(await t.run(async (ctx) => ctx.db.get(channelId))).toMatchObject({
    defaultAgentId: selectedAgentId, status: "connected",
  });
});

test("a rejected duplicate Instagram Login connect preserves the working connection", async () => {
  const { t, selectedAgentId, newestAgentId } = await setup();
  const channelId = await t.run(async (ctx) => ctx.db.insert("channels", {
    service: "instagram", igUserId: "ig-1", orgId: "", connectedByUserId: "owner",
    defaultAgentId: newestAgentId, status: "connected", accessToken: "existing-token",
    createdAt: 1, updatedAt: 1,
  }));
  await expect(t.action(internal.instagramConnect.internalCompleteSignup, {
    agentId: selectedAgentId, code: "code", redirectUri: "https://example.com/callback", orgId: "", userId: "owner",
  })).rejects.toThrow("already connected");
  expect(await t.run(async (ctx) => ctx.db.get(channelId))).toMatchObject({
    defaultAgentId: newestAgentId, status: "connected", accessToken: "existing-token",
  });
});

test("does not connect an account reassigned while Instagram profile loading is running", async () => {
  const { t, selectedAgentId, newestAgentId } = await setup();
  const graphFetch = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (...args: Parameters<typeof fetch>) => {
    if (String(args[0]).includes("/me?")) {
      await t.run(async (ctx) => {
        const channel = await ctx.db.query("channels").unique();
        if (!channel) throw new Error("Pending channel missing");
        await ctx.db.patch(channel._id, { defaultAgentId: newestAgentId });
      });
    }
    return graphFetch(...args);
  }));
  await expect(t.action(internal.instagramConnect.internalCompleteSignup, {
    agentId: selectedAgentId, code: "code", redirectUri: "https://example.com/callback", orgId: "", userId: "owner",
  })).rejects.toThrow("Instagram connection changed");
  const channel = await t.run(async (ctx) => ctx.db.query("channels").unique());
  expect(channel?.status).toBe("pending");
  expect(channel?.accessToken).toBeUndefined();
});

test("does not connect when the selected agent is removed during Instagram profile loading", async () => {
  const { t, selectedAgentId } = await setup();
  const graphFetch = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (...args: Parameters<typeof fetch>) => {
    if (String(args[0]).includes("/me?")) {
      await t.run(async (ctx) => {
        await ctx.db.delete(selectedAgentId);
      });
    }
    return graphFetch(...args);
  }));

  await expect(t.action(internal.instagramConnect.internalCompleteSignup, {
    agentId: selectedAgentId, code: "code", redirectUri: "https://example.com/callback", orgId: "", userId: "owner",
  })).rejects.toThrow("Instagram connection changed");
  expect(await t.run(async (ctx) => ctx.db.query("channels").unique())).toMatchObject({
    status: "error", defaultAgentId: selectedAgentId,
  });
});
