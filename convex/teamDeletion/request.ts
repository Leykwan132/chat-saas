import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import {
  getPersonalTeamForUser,
  getTeamByWorkosOrgId,
} from "../teamHelpers";
import { teamDeletionPool } from "./pool";

export const teamDeletionRequestResultValidator = v.object({
  accepted: v.literal(true),
  duplicate: v.boolean(),
});

export async function requestTeamDeletion(
  ctx: MutationCtx,
  args: {
    workosOrgId: string;
    stripeSubscriptionId?: string;
    source: "stripe" | "workos";
  },
): Promise<{ accepted: true; duplicate: boolean }> {
  const team = await getTeamByWorkosOrgId(ctx, args.workosOrgId);
  if (!team || team.deletionStatus === "deleting") {
    return { accepted: true, duplicate: true };
  }
  if (team.type !== "organizational") {
    throw new Error("Only organizational workspaces can be deleted");
  }

  const now = Date.now();
  await ctx.db.patch(team._id, {
    deletionStatus: "deleting",
    deletionStartedAt: now,
    stripeSubscriptionId: undefined,
    updatedAt: now,
  });

  const channels = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) =>
      q.eq("orgId", args.workosOrgId),
    )
    .take(50);
  for (const channel of channels) {
    await ctx.db.patch(channel._id, {
      status: "disconnected",
      updatedAt: now,
    });
  }

  const widgetSettings = await ctx.db
    .query("webWidgetSettings")
    .withIndex("by_orgId", (q) => q.eq("orgId", args.workosOrgId))
    .take(50);
  for (const settings of widgetSettings) {
    await ctx.db.patch(settings._id, { enabled: false, updatedAt: now });
  }

  const avatarConfigurations = await ctx.db
    .query("avatarConfigurations")
    .withIndex("by_orgId", (q) => q.eq("orgId", args.workosOrgId))
    .take(50);
  for (const configuration of avatarConfigurations) {
    await ctx.db.patch(configuration._id, {
      enabled: false,
      updatedAt: now,
    });
  }

  if (team.ownerId) {
    await ctx.db.patch(team.ownerId, {
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      stripeSubscriptionStatus: "canceled",
      stripeSubscriptionCurrentPeriodEnd: undefined,
      updatedAt: now,
    });
  }

  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
    .take(100);

  for (const membership of memberships) {
    const member = await ctx.db.get(membership.userId);
    if (member?.activeTeamId !== team._id) {
      continue;
    }
    const personalTeam = await getPersonalTeamForUser(ctx, membership.userId);
    if (!personalTeam) {
      throw new Error(
        `Personal workspace not found for member ${membership.userId}`,
      );
    }
    await ctx.db.patch(membership.userId, {
      activeTeamId: personalTeam._id,
      updatedAt: now,
    });
  }

  const jobId = await ctx.db.insert("teamDeletionJobs", {
    teamId: team._id,
    workosOrgId: args.workosOrgId,
    stripeSubscriptionId: args.stripeSubscriptionId,
    source: args.source,
    phase: "stopWork",
    createdAt: now,
    updatedAt: now,
  });
  const workId = await teamDeletionPool.enqueueAction(
    ctx,
    internal.teamDeletion.worker.run,
    { jobId },
    { retry: true },
  );
  await ctx.db.patch(jobId, { workId, updatedAt: Date.now() });

  return { accepted: true, duplicate: false };
}

export const fromStripe = internalMutation({
  args: {
    workosOrgId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  returns: teamDeletionRequestResultValidator,
  handler: async (ctx, args) =>
    await requestTeamDeletion(ctx, {
      ...args,
      source: "stripe",
    }),
});

export const fromWorkos = internalMutation({
  args: {
    workosOrgId: v.string(),
  },
  returns: teamDeletionRequestResultValidator,
  handler: async (ctx, args) =>
    await requestTeamDeletion(ctx, {
      ...args,
      source: "workos",
    }),
});
