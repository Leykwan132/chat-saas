import { mutation, query, internalQuery, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext } from "./authUtils";
import { getPlan, getPlanFromStripe } from "./plans";
import { PLAN_CATALOG, type PlanKey } from "./planCatalog";
import {
  countTeamMembers,
  getActiveTeamForUser,
  getMemberLimitForPlan,
  getPersonalTeamForUser,
  getUserByWorkosId,
  normalizeTimeZone,
  setActiveTeamForUser,
  teamToOrgId,
} from "./teamHelpers";

export type TeamListItem = {
  _id: string;
  type: "personal" | "organizational";
  name: string;
  workosOrgId: string | null;
  isActive: boolean;
  memberCount: number;
  maxMembers: number;
  planKey: PlanKey;
  planLabel: string;
  isAdmin: boolean;
  isOwner: boolean;
  createdAt: number;
  industry: string | null;
  companySize: string | null;
  domain: string | null;
  timeZone: string;
};

async function resolveOrgPlan(
  ctx: Parameters<typeof getPlanFromStripe>[0],
  org: { plan?: PlanKey; workosOrgId: string },
): Promise<PlanKey> {
  try {
    const stripeInfo = await getPlanFromStripe(ctx, org.workosOrgId);
    if (stripeInfo.plan !== "free") return stripeInfo.plan;
  } catch (err) {
    console.warn(`Failed to resolve Stripe plan for org ${org.workosOrgId}:`, err);
  }
  return org.plan ?? "free";
}

function buildTeamListItem(args: {
  team: {
    _id: string;
    type: "personal" | "organizational";
    name: string;
    workosOrgId?: string;
    createdAt: number;
    industry?: string;
    companySize?: string;
    domain?: string;
    timeZone?: string;
  };
  isActive: boolean;
  memberCount: number;
  maxMembers: number;
  planKey: PlanKey;
  isAdmin: boolean;
  isOwner: boolean;
}): TeamListItem {
  return {
    _id: args.team._id,
    type: args.team.type,
    name: args.team.name,
    workosOrgId: args.team.workosOrgId ?? null,
    isActive: args.isActive,
    memberCount: args.memberCount,
    maxMembers: args.maxMembers,
    planKey: args.planKey,
    planLabel: PLAN_CATALOG[args.planKey].name,
    isAdmin: args.isAdmin,
    isOwner: args.isOwner,
    createdAt: args.team.createdAt,
    industry: args.team.industry ?? null,
    companySize: args.team.companySize ?? null,
    domain: args.team.domain ?? null,
    timeZone: normalizeTimeZone(args.team.timeZone),
  };
}

async function listTeamsForCurrentUser(ctx: QueryCtx) {
  const { userId } = await getAuthContext(ctx);
  const userRow = await getUserByWorkosId(ctx, userId);
  if (userRow === null) return [];

  const activeTeam = await getActiveTeamForUser(ctx, userRow);

  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId", (q) => q.eq("userId", userRow._id))
    .collect();

  const teams = (
    await Promise.all(memberships.map((membership) => ctx.db.get(membership.teamId)))
  ).filter((team): team is NonNullable<typeof team> => team !== null);

  const items = await Promise.all(
    teams.map(async (team) => {
      const membership = memberships.find((m) => m.teamId === team._id);
      const memberCount = await countTeamMembers(ctx, team._id);
      const isActive = team._id === activeTeam._id;

      if (team.type === "personal") {
        return buildTeamListItem({
          team,
          isActive,
          memberCount,
          maxMembers: 1,
          planKey: "free",
          isAdmin: true,
          isOwner: true,
        });
      }

      const org =
        team.workosOrgId !== undefined
          ? await ctx.db
              .query("organizations")
              .withIndex("by_workosOrgId", (q) =>
                q.eq("workosOrgId", team.workosOrgId!),
              )
              .unique()
          : null;
      const orgPlan = org ? await resolveOrgPlan(ctx, org) : ("free" as PlanKey);

      return buildTeamListItem({
        team,
        isActive,
        memberCount: org?.members.length ?? memberCount,
        maxMembers: getMemberLimitForPlan(orgPlan),
        planKey: orgPlan,
        isAdmin:
          membership?.role === "owner" ||
          membership?.role === "admin" ||
          (org?.admins.includes(userRow._id) ?? false),
        isOwner: membership?.role === "owner",
      });
    }),
  );

  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<TeamListItem[]> => {
    return await listTeamsForCurrentUser(ctx);
  },
});

export const getTeamDetail = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args): Promise<TeamListItem | null> => {
    const teams = await listTeamsForCurrentUser(ctx);
    return teams.find((team) => team._id === args.teamId) ?? null;
  },
});

export const getActiveTeam = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getAuthContext(ctx);
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) return null;

    const activeTeam = await getActiveTeamForUser(ctx, userRow);
    const teams = await listTeamsForCurrentUser(ctx);
    return teams.find((team) => team._id === activeTeam._id) ?? null;
  },
});

export const switchActiveTeam = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) {
      throw new Error("User not found");
    }

    const team = await setActiveTeamForUser(ctx, userRow, args.teamId);

    return {
      teamId: team._id,
      type: team.type,
      workosOrgId: team.workosOrgId ?? null,
      orgId: teamToOrgId(team),
    };
  },
});

export const updateActiveTeamTimeZone = mutation({
  args: {
    timeZone: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) {
      throw new Error("User not found");
    }

    const activeTeam = await getActiveTeamForUser(ctx, userRow);
    const timeZone = normalizeTimeZone(args.timeZone);
    await ctx.db.patch(activeTeam._id, {
      timeZone,
      updatedAt: Date.now(),
    });
    return { teamId: activeTeam._id, timeZone };
  },
});

export const canCreateOrgTeam = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getAuthContext(ctx);
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) {
      return {
        allowed: false,
        reason: "User not found.",
        requiresPlanUpgrade: false,
      };
    }

    const stripeInfo = await getPlanFromStripe(ctx, userId);
    if (stripeInfo.plan === "free") {
      return {
        allowed: false,
        reason: "Upgrade your account plan to create shared teams.",
        requiresPlanUpgrade: true,
      };
    }

    return { allowed: true, reason: null, requiresPlanUpgrade: false };
  },
});

export const canInviteMembers = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || orgId === "") {
      return {
        allowed: false,
        reason: "Switch to a team to manage members.",
        requiresPlanUpgrade: false,
        memberCount: 1,
        maxMembers: 1,
      };
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    if (org === null) {
      return {
        allowed: false,
        reason: "Team not found.",
        requiresPlanUpgrade: false,
        memberCount: 0,
        maxMembers: 0,
      };
    }

    const stripeInfo = await getPlanFromStripe(ctx, userId);
    const userPlan = stripeInfo.plan;
    const memberCount = org.members.length;
    const maxMembers = getMemberLimitForPlan(userPlan);

    if (userPlan === "free") {
      return {
        allowed: false,
        reason: "Upgrade your account plan to invite people to teams.",
        requiresPlanUpgrade: true,
        memberCount,
        maxMembers,
      };
    }

    if (memberCount >= maxMembers) {
      return {
        allowed: false,
        reason: `This team has reached its member limit (${maxMembers}). Upgrade to add more.`,
        requiresPlanUpgrade: true,
        memberCount,
        maxMembers,
      };
    }

    return {
      allowed: true,
      reason: null,
      requiresPlanUpgrade: false,
      memberCount,
      maxMembers,
    };
  },
});

export const getMemberLimitForPlanQuery = query({
  args: { planKey: v.union(
    v.literal("free"),
    v.literal("standard"),
    v.literal("pro"),
    v.literal("ultra"),
  ) },
  handler: async (_ctx, args) => {
    return {
      maxMembers: getMemberLimitForPlan(args.planKey),
      plan: getPlan(args.planKey),
    };
  },
});

export const getPersonalTeamInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await getPersonalTeamForUser(ctx, args.userId);
  },
});
