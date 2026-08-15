/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { listTeamWorkosUserIds } from "./appointmentBooking/serviceAssignments";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("personal agents use their owner's personal team instead of the active organization", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const ownerId = await ctx.db.insert("users", {
      workosUserId: "personal-owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const organizationMemberId = await ctx.db.insert("users", {
      workosUserId: "organization-member",
      email: "member@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const personalTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const organizationTeamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Organization",
      workosOrgId: "org-123",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId: personalTeamId,
      userId: ownerId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId: organizationTeamId,
      userId: ownerId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId: organizationTeamId,
      userId: organizationMemberId,
      role: "member",
      createdAt: now,
    });
    await ctx.db.patch(ownerId, { activeTeamId: organizationTeamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Personal Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "personal-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const agent = await ctx.db.get(agentId);
    if (agent === null) throw new Error("Agent not found");
    return agent;
  });

  const workosUserIds = await t.run((ctx) => listTeamWorkosUserIds(ctx, fixture));

  expect(workosUserIds).toEqual(["personal-owner"]);
});
