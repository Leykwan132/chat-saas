import { v } from "convex/values";
import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { TEAM_DELETION_MANIFEST } from "./manifest";
import { deleteDescendantPage } from "./localDescendants";

const PAGE_SIZE = 100;

type DynamicRange = {
  eq: (field: string, value: string) => DynamicRange;
};

type DynamicQuery = {
  withIndex: (
    index: string,
    range: (query: DynamicRange) => DynamicRange,
  ) => {
    take: (count: number) => Promise<Array<{ _id: Id<TableNames> }>>;
  };
};

export type TeamDeletionTarget = {
  teamId: Id<"teams">;
  orgId: string;
  workosOrgId: string;
};

export type DeleteLocalPageResult = {
  done: boolean;
  cursor?: string;
};

async function deleteManifestPage(
  ctx: MutationCtx,
  target: TeamDeletionTarget,
  startIndex: number,
): Promise<DeleteLocalPageResult> {
  for (
    let index = startIndex;
    index < TEAM_DELETION_MANIFEST.length;
    index += 1
  ) {
    const entry = TEAM_DELETION_MANIFEST[index];
    if (!entry) break;
    const value = target[entry.field];
    const query = ctx.db.query(entry.table) as unknown as DynamicQuery;
    const rows = await query
      .withIndex(entry.index, (range) => range.eq(entry.field, value))
      .take(PAGE_SIZE);
    if (rows.length === 0) continue;
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { done: false, cursor: String(index) };
  }
  return { done: true };
}

export async function deleteLocalPage(
  ctx: MutationCtx,
  target: TeamDeletionTarget,
  cursor?: string,
): Promise<DeleteLocalPageResult> {
  if (!cursor || cursor === "descendants") {
    const deletedDescendants = await deleteDescendantPage(
      ctx,
      target.orgId,
    );
    if (deletedDescendants) {
      return { done: false, cursor: "descendants" };
    }
    return await deleteManifestPage(ctx, target, 0);
  }

  const manifestIndex = Number.parseInt(cursor, 10);
  if (!Number.isInteger(manifestIndex) || manifestIndex < 0) {
    throw new Error(`Invalid team deletion cursor: ${cursor}`);
  }
  return await deleteManifestPage(ctx, target, manifestIndex);
}

export const deletePage = internalMutation({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.object({
    done: v.boolean(),
    cursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return { done: true };
    }
    return await deleteLocalPage(
      ctx,
      {
        teamId: job.teamId,
        orgId: job.workosOrgId,
        workosOrgId: job.workosOrgId,
      },
      job.cursor,
    );
  },
});
