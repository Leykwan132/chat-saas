import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("/convex/**/*.ts");

test("finds an active partner from their email in any assigned workspace", async () => {
  const t = convexTest(schema, modules);
  const email = "partner@example.com";

  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "workos-partner",
      email,
      createdAt: now,
      updatedAt: now,
    });
    const activeTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Partner workspace",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId: activeTeamId,
      userId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      controlTeamId: activeTeamId,
      name: "Partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerAccess", {
      partnerId,
      workosUserId: "legacy-workos-user",
      email,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });

  const partner = await t
    .withIdentity({ subject: "workos-partner", email, orgId: "personal" })
    .query(api.whiteLabel.portal.getCurrentPartner, {});

  expect(partner?.name).toBe("Partner");
});
