import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { getPersonalTeamForUser } from "../teamHelpers";

const PAGE_SIZE = 50;
const isolationResultValidator = v.object({
  done: v.boolean(),
  cursor: v.optional(v.string()),
});

export async function moveActiveUsersPage(
  ctx: MutationCtx,
  teamId: Id<"teams">,
): Promise<boolean> {
  const users = await ctx.db
    .query("users")
    .withIndex("by_activeTeamId", (q) => q.eq("activeTeamId", teamId))
    .take(PAGE_SIZE);
  for (const user of users) {
    const personalTeam = await getPersonalTeamForUser(ctx, user._id);
    if (!personalTeam) {
      throw new Error(`Personal workspace not found for member ${user._id}`);
    }
    await ctx.db.patch(user._id, {
      activeTeamId: personalTeam._id,
      updatedAt: Date.now(),
    });
  }
  return users.length === 0;
}

export const moveActiveUsers = internalMutation({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.object({ done: v.boolean() }),
  handler: async (ctx, args) => ({
    done: await moveActiveUsersPage(ctx, args.teamId),
  }),
});

function decodeCursor(cursor?: string): {
  stage: "channels" | "widgets" | "avatars" | "users";
  pageCursor: string | null;
} {
  if (!cursor) return { stage: "channels", pageCursor: null };
  const separator = cursor.indexOf(":");
  const stage = cursor.slice(0, separator);
  if (
    stage !== "channels" &&
    stage !== "widgets" &&
    stage !== "avatars" &&
    stage !== "users"
  ) {
    throw new Error(`Invalid isolation stage: ${stage}`);
  }
  return { stage, pageCursor: cursor.slice(separator + 1) || null };
}

export const preparePage = internalMutation({
  args: {
    jobId: v.id("teamDeletionJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: isolationResultValidator,
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return { done: true };
    const { stage, pageCursor } = decodeCursor(
      args.paginationOpts.cursor ?? undefined,
    );
    const paginationOpts = {
      numItems: args.paginationOpts.numItems,
      cursor: pageCursor,
    };
    const now = Date.now();
    if (stage === "users") {
      const done = await moveActiveUsersPage(ctx, job.teamId);
      return done ? { done: true } : { done: false, cursor: "users:" };
    }
    if (stage === "channels") {
      const page = await ctx.db
        .query("channels")
        .withIndex("by_orgId_and_service", (q) =>
          q.eq("orgId", job.workosOrgId),
        )
        .paginate(paginationOpts);
      for (const channel of page.page) {
        await ctx.db.patch(channel._id, {
          status: "disconnected",
          updatedAt: now,
        });
      }
      return page.isDone
        ? { done: false, cursor: "widgets:" }
        : { done: false, cursor: `channels:${page.continueCursor}` };
    }
    if (stage === "widgets") {
      const page = await ctx.db
        .query("webWidgetSettings")
        .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
        .paginate(paginationOpts);
      for (const settings of page.page) {
        await ctx.db.patch(settings._id, { enabled: false, updatedAt: now });
      }
      return page.isDone
        ? { done: false, cursor: "avatars:" }
        : { done: false, cursor: `widgets:${page.continueCursor}` };
    }
    const page = await ctx.db
      .query("avatarConfigurations")
      .withIndex("by_orgId", (q) => q.eq("orgId", job.workosOrgId))
      .paginate(paginationOpts);
    for (const configuration of page.page) {
      await ctx.db.patch(configuration._id, {
        enabled: false,
        updatedAt: now,
      });
    }
    return page.isDone
      ? { done: false, cursor: "users:" }
      : { done: false, cursor: `avatars:${page.continueCursor}` };
  },
});
