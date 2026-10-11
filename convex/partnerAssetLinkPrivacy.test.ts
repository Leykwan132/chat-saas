import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test.each(["active", "suspended"] as const)("partner %s agents receive asset link privacy without changing saved instructions", async (status) => {
  const t = convexTest(schema, modules);
  const agentId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { workosUserId: "owner", email: "owner@example.com", createdAt: 1, updatedAt: 1 });
    const teamId = await ctx.db.insert("teams", { name: "Partner customer", type: "organizational", workosOrgId: "partner-org", createdAt: 1, updatedAt: 1 });
    const partnerId = await ctx.db.insert("whiteLabelPartners", { name: "Partner", status: "active", createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("whiteLabelPartnerOrganizations", { partnerId, teamId, status, createdByUserId: userId, createdAt: 1, updatedAt: 1 });
    return await ctx.db.insert("agents", { name: "Support", provider: "openrouter", model: "test", systemPrompt: "Answer customer questions.", templateKey: "blank", fileSize: 0, createdAt: 1, updatedAt: 1, userId: "owner", orgId: "partner-org" });
  });
  const agent = await t.query(internal.agents.internalGet, { agentId });
  expect(agent?.systemPrompt).toContain("Answer customer questions.");
  expect(agent?.systemPrompt).toContain("## Partner Asset Link Privacy");
  expect(await t.run(async (ctx) => (await ctx.db.get(agentId))?.systemPrompt)).toBe("Answer customer questions.");
});

test.each(["direct-org", "", "personal"])("non-partner scope %s retains its instructions", async (orgId) => {
  const t = convexTest(schema, modules);
  const agentId = await t.run(async (ctx) => {
    await ctx.db.insert("teams", { name: "Direct customer", type: "organizational", workosOrgId: "direct-org", createdAt: 1, updatedAt: 1 });
    return await ctx.db.insert("agents", { name: "Support", provider: "openrouter", model: "test", systemPrompt: "Answer customer questions.", templateKey: "blank", fileSize: 0, createdAt: 1, updatedAt: 1, userId: "owner", orgId });
  });
  expect((await t.query(internal.agents.internalGet, { agentId }))?.systemPrompt).toBe("Answer customer questions.");
});

test("missing agents remain missing", async () => {
  const t = convexTest(schema, modules);
  const agentId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("agents", { name: "Support", provider: "openrouter", model: "test", systemPrompt: "Help.", templateKey: "blank", fileSize: 0, createdAt: 1, updatedAt: 1, userId: "owner", orgId: "" });
    await ctx.db.delete(id);
    return id;
  });
  expect(await t.query(internal.agents.internalGet, { agentId })).toBeNull();
});
