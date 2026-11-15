import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const t = convexTest(schema, modules);
  const agentId = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", { workosUserId: "owner", email: "owner@example.com", createdAt: now, updatedAt: now });
    const teamId = await ctx.db.insert("teams", { type: "personal", name: "Personal", ownerId: userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    return await ctx.db.insert("agents", {
      name: "Agent", provider: "openrouter", model: "test", systemPrompt: "test", templateKey: "blank", fileSize: 0, userId: "owner", orgId: "", createdAt: now, updatedAt: now,
    });
  });
  return { t, agentId, authed: t.withIdentity({ subject: "owner" }) };
}

test("auto de-escalation is absent until configured and normalizes phrases", async () => {
  const { t, agentId, authed } = await fixture();
  expect(await authed.query(api.autoDeescalationConfig.get, { agentId })).toBeNull();
  await authed.mutation(api.autoDeescalationConfig.update, { agentId, enabled: true, inactivityMinutes: 30, keywords: [" AI can take over ", "ai CAN take over", ""] });
  expect(await authed.query(api.autoDeescalationConfig.get, { agentId })).toMatchObject({ enabled: true, inactivityMinutes: 30, keywords: ["AI can take over"] });
  expect((await t.run((ctx) => ctx.db.get(agentId)))?.autoDeescalation?.revision).toBeGreaterThan(0);
});

test.each([0, -1, 1.5, 43201, Infinity, NaN])("rejects invalid inactivity minutes %s", async (inactivityMinutes) => {
  const { agentId, authed } = await fixture();
  await expect(authed.mutation(api.autoDeescalationConfig.update, { agentId, enabled: true, inactivityMinutes, keywords: [] })).rejects.toThrow("whole number of minutes between 1 and 43200");
});

test("settings cannot be read or changed without access to the agent", async () => {
  const { t, agentId } = await fixture();
  await expect(t.query(api.autoDeescalationConfig.get, { agentId })).rejects.toThrow();
  await expect(t.mutation(api.autoDeescalationConfig.update, { agentId, enabled: true, inactivityMinutes: 30, keywords: [] })).rejects.toThrow();
});

test("every settings change invalidates previously armed timers", async () => {
  const { agentId, authed } = await fixture();
  const values = { agentId, enabled: true, inactivityMinutes: 30, keywords: [] };
  await authed.mutation(api.autoDeescalationConfig.update, values);
  const first = await authed.query(api.autoDeescalationConfig.get, { agentId });
  await authed.mutation(api.autoDeescalationConfig.update, { ...values, enabled: false });
  await authed.mutation(api.autoDeescalationConfig.update, values);
  const last = await authed.query(api.autoDeescalationConfig.get, { agentId });
  expect(last!.revision).toBeGreaterThan(first!.revision);
});
