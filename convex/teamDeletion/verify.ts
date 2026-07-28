import { v } from "convex/values";
import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, internalQuery } from "../_generated/server";
import { TEAM_DELETION_MANIFEST } from "./manifest";
import type { TeamDeletionTarget } from "./local";

type DynamicRange = {
  eq: (field: string, value: string) => DynamicRange;
};

type DynamicQuery = {
  withIndex: (
    index: string,
    range: (query: DynamicRange) => DynamicRange,
  ) => {
    first: () => Promise<{ _id: Id<TableNames> } | null>;
  };
};

export async function findDeletionResidue(
  ctx: QueryCtx | MutationCtx,
  target: TeamDeletionTarget,
): Promise<string[]> {
  const residue: string[] = [];
  for (const entry of TEAM_DELETION_MANIFEST) {
    const value = target[entry.field];
    const query = ctx.db.query(entry.table) as unknown as DynamicQuery;
    const row = await query
      .withIndex(entry.index, (range) => range.eq(entry.field, value))
      .first();
    if (row) residue.push(entry.key);
  }
  const activeUser = await ctx.db
    .query("users")
    .withIndex("by_activeTeamId", (q) =>
      q.eq("activeTeamId", target.teamId),
    )
    .first();
  if (activeUser) residue.push("users.activeTeamId");
  const externalResource = await ctx.db
    .query("teamExternalResources")
    .withIndex("by_orgId", (q) => q.eq("orgId", target.orgId))
    .first();
  if (externalResource) residue.push("teamExternalResources");
  return residue;
}

export async function finalizeTeamDeletion(
  ctx: MutationCtx,
  jobId: Id<"teamDeletionJobs">,
): Promise<boolean> {
  const job = await ctx.db.get(jobId);
  if (!job) return false;
  const target = {
    teamId: job.teamId,
    orgId: job.workosOrgId,
    workosOrgId: job.workosOrgId,
  };
  const residue = await findDeletionResidue(ctx, target);
  if (residue.length > 0) {
    throw new Error(
      `Team deletion verification failed: ${residue.join(", ")}`,
    );
  }

  const team = await ctx.db.get(job.teamId);
  const tombstone = await ctx.db
    .query("deletedTeamOrganizations")
    .withIndex("by_workosOrgId", (q) =>
      q.eq("workosOrgId", job.workosOrgId),
    )
    .unique();
  if (!tombstone) {
    await ctx.db.insert("deletedTeamOrganizations", {
      workosOrgId: job.workosOrgId,
      deletedAt: Date.now(),
    });
  }
  if (team) await ctx.db.delete(team._id);
  await ctx.db.delete(job._id);
  return true;
}

export const ensureTombstone = internalMutation({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const tombstone = await ctx.db
      .query("deletedTeamOrganizations")
      .withIndex("by_workosOrgId", (q) =>
        q.eq("workosOrgId", job.workosOrgId),
      )
      .unique();
    if (!tombstone) {
      await ctx.db.insert("deletedTeamOrganizations", {
        workosOrgId: job.workosOrgId,
        deletedAt: Date.now(),
      });
    }
    return null;
  },
});

export const findResidue = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return [];
    return await findDeletionResidue(ctx, {
      teamId: job.teamId,
      orgId: job.workosOrgId,
      workosOrgId: job.workosOrgId,
    });
  },
});

export const finalize = internalMutation({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    await finalizeTeamDeletion(ctx, args.jobId),
});
