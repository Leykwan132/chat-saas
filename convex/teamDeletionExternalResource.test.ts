import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("deletion verification retains a resource registered before feature persistence", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Delete",
      workosOrgId: "org_delete",
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("teamDeletionJobs", {
      teamId,
      workosOrgId: "org_delete",
      source: "stripe",
      phase: "verify",
      createdAt: now,
      updatedAt: now,
    });
    return { teamId, jobId };
  });

  await t.mutation(
    internal.teamDeletion.externalResourceState.register,
    {
      orgId: "org_delete",
      provider: "cloudflare",
      resourceId: "cf_created_before_persistence",
      cleanupRequired: false,
    },
  );
  await t.run(async (ctx) => {
    await ctx.db.patch(fixture.teamId, {
      deletionStatus: "deleting",
      deletionStartedAt: Date.now(),
    });
  });

  const residue = await t.query(
    internal.teamDeletion.verify.findResidue,
    { jobId: fixture.jobId },
  );

  expect(residue).toContain("teamExternalResources");
});
