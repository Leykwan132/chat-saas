import { convexTest } from "convex-test";
import { vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("/convex/**/*.ts");
export const origin = "https://kilobot.app";
export const endpoint = "https://fcm.googleapis.com/fcm/send/device-one";
export const keys = { p256dh: "B".repeat(87), auth: "C".repeat(22) };

export async function pushFixture() {
  vi.stubEnv("APP_BASE_URL", origin);
  vi.stubEnv("WEB_PUSH_PUBLIC_KEY", "B".repeat(87));
  vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "private-test-key");
  vi.stubEnv("WEB_PUSH_SUBJECT", "mailto:test@example.com");
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "push-owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      name: "Personal",
      type: "personal",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    await ctx.db.insert("teamMemberships", {
      userId,
      teamId,
      role: "owner",
      createdAt: now,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Support",
      provider: "ilmu",
      model: "ilmu-mini-v3.3",
      systemPrompt: "Help",
      templateKey: "support",
      fileSize: 0,
      userId: "push-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const foreignAgentId = await ctx.db.insert("agents", {
      name: "Other",
      provider: "ilmu",
      model: "ilmu-mini-v3.3",
      systemPrompt: "Help",
      templateKey: "support",
      fileSize: 0,
      userId: "other-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    return { userId, teamId, agentId, foreignAgentId };
  });
  const owner = t.withIdentity({
    subject: "push-owner",
    issuer: "https://auth.example.com",
    email: "owner@example.com",
  });
  const subscriptionId = await owner.mutation(
    api.pushNotifications.subscriptions.subscribe,
    {
      agentId: ids.agentId,
      origin,
      endpoint,
      ...keys,
      kinds: ["humanEscalation", "bookingCreated"],
    },
  );
  const device = await t.run((ctx) =>
    ctx.db
      .query("pushDevices")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique(),
  );
  return { t, owner, subscriptionId, device: device!, ...ids };
}
