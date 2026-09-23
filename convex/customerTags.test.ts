/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createWorkspace(t: ReturnType<typeof convexTest>, workosUserId: string) {
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
      name: workosUserId,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    return await ctx.db.insert("agents", {
      name: "Customer Agent",
      provider: "openrouter",
      model: "test/model",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
  });
}

test("lists each workspace customer tag once and excludes lead-temperature tags", async () => {
  const t = convexTest(schema, modules);
  const owner = "tag-catalog-owner";
  const otherOwner = "tag-catalog-other-owner";
  const agentId = await createWorkspace(t, owner);
  const otherAgentId = await createWorkspace(t, otherOwner);
  const authed = t.withIdentity({ subject: owner });
  const otherAuthed = t.withIdentity({ subject: otherOwner });

  const firstCustomerId = await authed.mutation(api.customers.addManually, {
    agentId,
    name: "First customer",
    tags: ["VIP"],
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(firstCustomerId, { tags: ["VIP", "Hot"] });
  });
  await authed.mutation(api.customers.addManually, {
    agentId,
    name: "Second customer",
    tags: ["VIP"],
  });
  await otherAuthed.mutation(api.customers.addManually, {
    agentId: otherAgentId,
    name: "Other workspace customer",
    tags: ["Private"],
  });

  await expect(authed.query(api.customerTags.listForCurrentOrg, {})).resolves.toEqual(["VIP"]);
  await expect(otherAuthed.query(api.customerTags.listForCurrentOrg, {})).resolves.toEqual(["Private"]);
});
