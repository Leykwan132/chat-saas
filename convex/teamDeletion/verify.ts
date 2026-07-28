import { v } from "convex/values";
import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, internalQuery } from "../_generated/server";
import { getPersonalTeamForUser } from "../teamHelpers";
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

  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_teamId", (q) => q.eq("teamId", job.teamId))
    .take(100);
  for (const membership of memberships) {
    const user = await ctx.db.get(membership.userId);
    if (user?.activeTeamId === job.teamId) {
      const personalTeam = await getPersonalTeamForUser(
        ctx,
        membership.userId,
      );
      if (!personalTeam) {
        throw new Error(
          `Personal workspace not found for member ${membership.userId}`,
        );
      }
      await ctx.db.patch(membership.userId, {
        activeTeamId: personalTeam._id,
        updatedAt: Date.now(),
      });
    }
    await ctx.db.delete(membership._id);
  }

  const team = await ctx.db.get(job.teamId);
  if (team) await ctx.db.delete(team._id);
  await ctx.db.delete(job._id);
  return true;
}

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
