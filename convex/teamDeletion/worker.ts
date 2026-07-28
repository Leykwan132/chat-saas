import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import {
  deleteExternalPage,
  deleteTrackedExternalResourcePage,
  deleteWorkosOrganization,
} from "./external";
import { disconnectChannelPage } from "./channelDisconnect";
import { nextTeamDeletionPhase, type TeamDeletionPhase } from "./model";
import { teamDeletionPool } from "./pool";
import { teamDeletionPhaseValidator } from "./schema";

type PhaseResult = {
  done: boolean;
  cursor?: string;
  finalized?: boolean;
};

export const getJob = internalQuery({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.get(args.jobId),
});

export const recordPhaseResult = internalMutation({
  args: {
    jobId: v.id("teamDeletionJobs"),
    expectedPhase: teamDeletionPhaseValidator,
    done: v.boolean(),
    cursor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.phase !== args.expectedPhase) return null;
    const nextPhase = args.done
      ? nextTeamDeletionPhase(job.phase)
      : job.phase;
    if (!nextPhase) {
      throw new Error("Final phase must delete the team deletion job");
    }
    await ctx.db.patch(job._id, {
      phase: nextPhase,
      cursor: args.done ? undefined : args.cursor,
      updatedAt: Date.now(),
    });
    return null;
  },
});

async function runPhase(
  ctx: ActionCtx,
  job: Doc<"teamDeletionJobs">,
): Promise<PhaseResult> {
  if (job.phase === "stopWork") {
    return await ctx.runMutation(
      internal.teamDeletion.isolation.preparePage,
      {
        jobId: job._id,
        paginationOpts: {
          numItems: 50,
          cursor: job.cursor ?? null,
        },
      },
    );
  }
  if (job.phase === "disconnectChannels") {
    return await disconnectChannelPage(ctx, job._id, job.cursor);
  }
  if (job.phase === "externalData") {
    return await deleteExternalPage(ctx, job._id, job.cursor);
  }
  if (job.phase === "localData") {
    const result: { done: boolean; cursor?: string } =
      await ctx.runMutation(internal.teamDeletion.local.deletePage, {
        jobId: job._id,
      });
    return result;
  }
  if (job.phase === "verify") {
    const trackedResources = await deleteTrackedExternalResourcePage(
      ctx,
      job.workosOrgId,
    );
    if (!trackedResources.done) {
      return { done: false };
    }
    const residue: string[] = await ctx.runQuery(
      internal.teamDeletion.verify.findResidue,
      { jobId: job._id },
    );
    if (residue.length > 0) {
      throw new Error(
        `Team deletion verification failed: ${residue.join(", ")}`,
      );
    }
    return { done: true };
  }
  if (job.phase === "deleteOrganization") {
    await ctx.runMutation(
      internal.teamDeletion.verify.ensureTombstone,
      { jobId: job._id },
    );
    await deleteWorkosOrganization(job.workosOrgId);
    return { done: true };
  }

  await ctx.runMutation(internal.teamDeletion.verify.finalize, {
    jobId: job._id,
  });
  return { done: true, finalized: true };
}

async function enqueueNext(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
): Promise<void> {
  await teamDeletionPool.enqueueAction(
    ctx,
    internal.teamDeletion.worker.run,
    { jobId },
    { retry: true },
  );
}

export const run = internalAction({
  args: {
    jobId: v.id("teamDeletionJobs"),
  },
  returns: v.object({
    completed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const job: Doc<"teamDeletionJobs"> | null = await ctx.runQuery(
      internal.teamDeletion.worker.getJob,
      args,
    );
    if (!job) return { completed: true };

    const result = await runPhase(ctx, job);
    if (result.finalized) {
      return { completed: true };
    }
    await ctx.runMutation(
      internal.teamDeletion.worker.recordPhaseResult,
      {
        jobId: job._id,
        expectedPhase: job.phase as TeamDeletionPhase,
        done: result.done,
        cursor: result.cursor,
      },
    );
    await enqueueNext(ctx, job._id);
    return { completed: false };
  },
});
