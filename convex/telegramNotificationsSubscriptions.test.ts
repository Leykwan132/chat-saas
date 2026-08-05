/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => {
  vi.stubEnv("NOTIFICATION_BOT_USERNAME", "notifications_kilobot");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function createAgent(t: ReturnType<typeof convexTest>, userId: string, name: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("agents", {
      name,
      provider: "ilmu",
      model: "ilmu-mini-v3.3",
      systemPrompt: "Support customers",
      templateKey: "support",
      fileSize: 0,
      userId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
  });
}

test("manages reusable, authorized Telegram recipients without storing a raw start token", async () => {
  const t = convexTest(schema, modules);
  const ownerId = "telegram-subscription-owner";
  const firstAgentId = await createAgent(t, ownerId, "First Agent");
  const secondAgentId = await createAgent(t, ownerId, "Second Agent");
  const owner = t.withIdentity({ subject: ownerId });
  const otherUser = t.withIdentity({ subject: "telegram-subscription-other" });

  await otherUser.mutation(api.authUtils.upsertUser, {});

  const first = await owner.mutation(api.telegramNotifications.subscriptions.add, {
    agentId: firstAgentId,
    phone: "+60 12-949 9394",
  });

  expect(first.state).toBe("pending");
  if (first.state !== "pending") {
    throw new Error("Expected a pending Telegram subscription");
  }
  expect(first.verificationUrl).toMatch(
    /^https:\/\/t\.me\/notifications_kilobot\?start=[A-Za-z0-9_-]{43}$/,
  );

  await expect(
    owner.mutation(api.telegramNotifications.subscriptions.add, {
      agentId: firstAgentId,
      phone: "60129499394",
    }),
  ).rejects.toThrow("already added");

  await expect(
    otherUser.query(api.telegramNotifications.subscriptions.listForAgent, {
      agentId: firstAgentId,
    }),
  ).rejects.toThrow("Agent not found");

  const records = await t.run(async (ctx) => ({
    recipient: await ctx.db
      .query("telegramNotificationRecipients")
      .withIndex("by_phoneDigits", (q) => q.eq("phoneDigits", "60129499394"))
      .unique(),
    subscriptions: await ctx.db.query("agentTelegramNotificationSubscriptions").collect(),
  }));
  expect(records.recipient?.verificationTokenHash).toHaveLength(43);
  expect(JSON.stringify(records)).not.toContain(first.verificationUrl.split("=")[1]);
  expect(records.subscriptions).toHaveLength(1);

  await t.run(async (ctx) => {
    await ctx.db.patch(records.recipient!._id, {
      status: "verified",
      verificationTokenHash: undefined,
      telegramChatId: "7499620613",
      telegramUserId: "7499620613",
    });
  });

  const reused = await owner.mutation(api.telegramNotifications.subscriptions.add, {
    agentId: secondAgentId,
    phone: "60129499394",
  });
  expect(reused).toMatchObject({ state: "connected" });
  expect(reused).not.toHaveProperty("verificationUrl");

  await owner.mutation(api.telegramNotifications.subscriptions.remove, {
    subscriptionId: reused.subscriptionId,
  });

  const remaining = await t.run(async (ctx) => ({
    recipient: await ctx.db.get(records.recipient!._id),
    firstSubscription: await ctx.db
      .query("agentTelegramNotificationSubscriptions")
      .withIndex("by_agentId_and_recipientId", (q) =>
        q.eq("agentId", firstAgentId).eq("recipientId", records.recipient!._id),
      )
      .unique(),
  }));
  expect(remaining.recipient).not.toBeNull();
  expect(remaining.firstSubscription).not.toBeNull();
});

test("limits each agent to five saved Telegram recipients", async () => {
  const t = convexTest(schema, modules);
  const ownerId = "telegram-subscription-limit";
  const agentId = await createAgent(t, ownerId, "Limited Agent");
  const owner = t.withIdentity({ subject: ownerId });

  for (const phone of ["60111111111", "60111111112", "60111111113", "60111111114", "60111111115"]) {
    await owner.mutation(api.telegramNotifications.subscriptions.add, { agentId, phone });
  }

  await expect(
    owner.mutation(api.telegramNotifications.subscriptions.add, {
      agentId,
      phone: "60111111116",
    }),
  ).rejects.toThrow("five Telegram recipients");
});
