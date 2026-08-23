/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("records an unscoped Messenger error against the connecting agent channel", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  const { connectingAgentId, otherChannelId, connectingChannelId } = await t.run(
    async (ctx) => {
      const connectingAgentId = await ctx.db.insert("agents", {
        name: "Connecting Agent",
        provider: "google",
        model: "gemini-2.5",
        systemPrompt: "Help customers.",
        templateKey: "blank",
        fileSize: 0,
        userId: "connector-user",
        orgId: "team-1",
        createdAt: now,
        updatedAt: now,
      });
      const otherAgentId = await ctx.db.insert("agents", {
        name: "Other Agent",
        provider: "google",
        model: "gemini-2.5",
        systemPrompt: "Help customers.",
        templateKey: "blank",
        fileSize: 0,
        userId: "other-user",
        orgId: "team-1",
        createdAt: now,
        updatedAt: now,
      });
      const connectingChannelId = await ctx.db.insert("channels", {
        orgId: "team-1",
        service: "messenger",
        pageId: "page-connecting",
        status: "pending",
        connectedByUserId: "connector-user",
        defaultAgentId: connectingAgentId,
        createdAt: now,
        updatedAt: now,
      });
      const otherChannelId = await ctx.db.insert("channels", {
        orgId: "team-1",
        service: "messenger",
        pageId: "page-other",
        status: "connected",
        connectedByUserId: "other-user",
        defaultAgentId: otherAgentId,
        createdAt: now,
        updatedAt: now,
      });

      return { connectingAgentId, connectingChannelId, otherChannelId };
    },
  );

  await expect(
    t.mutation(internal.channels.internalRecordError, {
      orgId: "team-1",
      service: "messenger",
      error: "Facebook page list failed: Page not found",
      connectedByUserId: "connector-user",
    }),
  ).resolves.toBeNull();

  const channels = await t.run(async (ctx) => ({
    connecting: await ctx.db.get(connectingChannelId),
    other: await ctx.db.get(otherChannelId),
  }));

  expect(channels.connecting).toMatchObject({
    defaultAgentId: connectingAgentId,
    status: "error",
    lastError: "Facebook page list failed: Page not found",
  });
  expect(channels.other).toMatchObject({ status: "connected" });
});
