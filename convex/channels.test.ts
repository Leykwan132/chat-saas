/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("listForCurrentOrg returns only channels assigned to the requested agent", async () => {
  const workosUserId = "channel-scope-owner";
  const testClient = convexTest(schema, modules);
  const authenticatedClient = testClient.withIdentity({ subject: workosUserId });
  await authenticatedClient.mutation(api.authUtils.upsertUser, {});

  const { firstChannelId, secondAgentId, secondChannelId } = await testClient.run(
    async (ctx) => {
      const now = Date.now();
      const firstAgentId = await ctx.db.insert("agents", {
        name: "First Agent",
        provider: "openrouter",
        model: "test-model",
        systemPrompt: "Help customers.",
        templateKey: "blank",
        fileSize: 0,
        userId: workosUserId,
        orgId: "",
        createdAt: now,
        updatedAt: now,
      });
      const secondAgentId = await ctx.db.insert("agents", {
        name: "Second Agent",
        provider: "openrouter",
        model: "test-model",
        systemPrompt: "Help customers.",
        templateKey: "blank",
        fileSize: 0,
        userId: workosUserId,
        orgId: "",
        createdAt: now,
        updatedAt: now,
      });
      const firstChannelId = await ctx.db.insert("channels", {
        orgId: "",
        service: "whatsapp",
        phoneNumberId: "first-phone",
        status: "connected",
        connectedByUserId: workosUserId,
        defaultAgentId: firstAgentId,
        createdAt: now,
        updatedAt: now,
      });
      const secondChannelId = await ctx.db.insert("channels", {
        orgId: "",
        service: "instagram",
        igUserId: "second-instagram",
        status: "connected",
        connectedByUserId: workosUserId,
        defaultAgentId: secondAgentId,
        createdAt: now,
        updatedAt: now,
      });
      return { firstChannelId, secondAgentId, secondChannelId };
    },
  );

  const channels = await authenticatedClient.query(
    api.channels.listForCurrentOrg,
    { agentId: secondAgentId } as never,
  );

  expect(channels.map((channel) => channel._id)).toEqual([secondChannelId]);
  expect(channels.map((channel) => channel._id)).not.toContain(firstChannelId);
});
