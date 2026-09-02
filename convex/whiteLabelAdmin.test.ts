import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("lists owner workspaces for every matching email record", async () => {
  const t = convexTest(schema, modules);
  const sessionToken = "admin-session-token";
  await t.run(async (ctx) => {
    await ctx.db.insert("adminSessions", { token: sessionToken, email: "admin@example.com", expiresAt: Date.now() + 60_000, createdAt: Date.now() });
    const firstUserId = await ctx.db.insert("users", { workosUserId: "user_one", email: "partner@example.com", createdAt: Date.now(), updatedAt: Date.now() });
    const secondUserId = await ctx.db.insert("users", { workosUserId: "user_two", email: "partner@example.com", createdAt: Date.now(), updatedAt: Date.now() });
    const firstTeamId = await ctx.db.insert("teams", { type: "organizational", name: "First workspace", ownerId: firstUserId, workosOrgId: "org_one", createdAt: Date.now(), updatedAt: Date.now() });
    const secondTeamId = await ctx.db.insert("teams", { type: "organizational", name: "Second workspace", ownerId: secondUserId, workosOrgId: "org_two", createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("teamMemberships", { teamId: firstTeamId, userId: firstUserId, role: "owner", createdAt: Date.now() });
    await ctx.db.insert("teamMemberships", { teamId: secondTeamId, userId: secondUserId, role: "owner", createdAt: Date.now() });
  });

  const result = await t.query(api.whiteLabel.admin.getOwnerWorkspaces, { sessionToken, ownerEmail: "partner@example.com" });
  expect(result.map((workspace) => workspace.name).sort()).toEqual(["First workspace", "Second workspace"]);
});
