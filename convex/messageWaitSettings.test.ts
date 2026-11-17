import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { resolveMessageWaitSeconds } from "../shared/messageWaitTime";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const t = convexTest(schema, modules);
  const agentId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      workosUserId: "owner",
      email: "owner@example.com",
      createdAt: 1,
      updatedAt: 1,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    return ctx.db.insert("agents", {
      name: "Agent",
      provider: "openrouter",
      model: "test",
      systemPrompt: "test",
      templateKey: "blank",
      fileSize: 0,
      userId: "owner",
      orgId: "",
      createdAt: 1,
      updatedAt: 1,
    });
  });
  return { t, agentId, authed: t.withIdentity({ subject: "owner" }) };
}

test("defaults to five seconds and preserves saved zero and boundary values", async () => {
  const { authed, agentId } = await fixture();
  expect(await authed.query(api.messageWaitSettings.get, { agentId })).toBe(5);
  for (const messageWaitSeconds of [0, 12, 60]) {
    await authed.mutation(api.messageWaitSettings.update, {
      agentId,
      messageWaitSeconds,
    });
    expect(await authed.query(api.messageWaitSettings.get, { agentId })).toBe(
      messageWaitSeconds,
    );
  }
});

test.each([-1, 61, 1.5, NaN, Infinity])(
  "rejects invalid setting %s",
  async (messageWaitSeconds) => {
    const { authed, agentId } = await fixture();
    expect(() => resolveMessageWaitSeconds(messageWaitSeconds)).toThrow(
      "whole number of seconds between 0 and 60",
    );
    await expect(
      authed.mutation(api.messageWaitSettings.update, {
        agentId,
        messageWaitSeconds,
      }),
    ).rejects.toThrow("whole number of seconds between 0 and 60");
  },
);

test("rejects corrupt persisted values instead of defaulting", async () => {
  const { t, authed, agentId } = await fixture();
  await t.run((ctx) => ctx.db.patch(agentId, { messageWaitSeconds: -1 }));
  await expect(
    authed.query(api.messageWaitSettings.get, { agentId }),
  ).rejects.toThrow("whole number of seconds");
});

test("rejects unauthenticated and other personal workspace access", async () => {
  const { t, agentId } = await fixture();
  for (const client of [t, t.withIdentity({ subject: "other" })]) {
    await expect(
      client.query(api.messageWaitSettings.get, { agentId }),
    ).rejects.toThrow();
    await expect(
      client.mutation(api.messageWaitSettings.update, {
        agentId,
        messageWaitSeconds: 10,
      }),
    ).rejects.toThrow();
  }
});

test("honors routing role permissions and rejects legacy member grants", async () => {
  const { t, agentId } = await fixture();
  const membershipId = await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", "owner"))
      .unique();
    if (!user) throw new Error("Missing user");
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Team",
      workosOrgId: "org",
      memberPermissions: ["routing:read", "routing:manage"],
      createdAt: 1,
      updatedAt: 1,
    });
    const membershipId = await ctx.db.insert("teamMemberships", {
      teamId,
      userId: user._id,
      role: "member",
      createdAt: 1,
    });
    await ctx.db.patch(user._id, { activeTeamId: teamId });
    await ctx.db.patch(agentId, { orgId: "org" });
    return membershipId;
  });
  const client = t.withIdentity({ subject: "owner", org_id: "org" });
  await expect(
    client.query(api.messageWaitSettings.get, { agentId }),
  ).rejects.toThrow("Forbidden");
  await expect(
    client.mutation(api.messageWaitSettings.update, {
      agentId,
      messageWaitSeconds: 10,
    }),
  ).rejects.toThrow("Forbidden");
  await t.run((ctx) => ctx.db.patch(membershipId, { role: "admin" }));
  expect(await client.query(api.messageWaitSettings.get, { agentId })).toBe(5);
  await client.mutation(api.messageWaitSettings.update, {
    agentId,
    messageWaitSeconds: 10,
  });
  expect(await client.query(api.messageWaitSettings.get, { agentId })).toBe(10);
});
