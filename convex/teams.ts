import { mutation, query, internalQuery, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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
import { getWhiteLabelPlanForTeam, isWhiteLabelTeam } from "./whiteLabel/planResolver";
import { assertManagedTeamBelongsToPartner, getPartnerOrganizationForManagedTeam } from "./whiteLabel/managedTeams";

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
  customFields?: { key: string; label: string }[];
};

async function resolveOrgPlan(
  ctx: QueryCtx | MutationCtx,
  team: { _id: Id<"teams">; ownerId?: Id<"users"> },
): Promise<PlanKey> {
  const whiteLabelPlan = await getWhiteLabelPlanForTeam(ctx, team._id);
  if (whiteLabelPlan !== null) return whiteLabelPlan;
  if (!team.ownerId) return "free";
  const owner = await ctx.db.get(team.ownerId);
  if (!owner) return "free";
  try {
    const stripeInfo = await getPlanFromStripe(ctx, owner.workosUserId);
    if (stripeInfo.plan !== "free") return stripeInfo.plan;
  } catch (err) {
    console.warn(`Failed to resolve Stripe plan for team owner ${owner.workosUserId}:`, err);
  }
  return "free";
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
    customFields?: { key: string; label: string }[];
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
    customFields: args.team.customFields ?? [],
  };
}

async function listTeamsForCurrentUser(ctx: QueryCtx) {
  const auth = await getAuthContext(ctx);
  const { userId } = auth;
  const userRow = await getUserByWorkosId(ctx, userId);
  if (userRow === null) return [];

  const activeTeam = await ctx.db.get(auth.activeTeamId);
  if (activeTeam === null) return [];
  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId", (q) => q.eq("userId", userRow._id))
    .collect();

  const membershipTeams = (
    await Promise.all(memberships.map((membership) => ctx.db.get(membership.teamId)))
  ).filter((team): team is NonNullable<typeof team> => team !== null);
  const teams = (await Promise.all(membershipTeams.map(async (team) => ({
    team,
    partnerOrganization: await getPartnerOrganizationForManagedTeam(ctx, team._id),
  })))).filter(({ partnerOrganization }) => {
    if (auth.surface.kind === "partner") {
      return partnerOrganization?._id === auth.surface.partnerOrganizationId;
    }
    return partnerOrganization === null;
  }).map(({ team }) => team);

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

      const orgPlan = await resolveOrgPlan(ctx, team);

      return buildTeamListItem({
        team,
        isActive,
        memberCount,
        maxMembers: getMemberLimitForPlan(orgPlan),
        planKey: orgPlan,
        isAdmin:
          membership?.role === "owner" ||
          membership?.role === "admin",
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
    const { activeTeamId } = await getAuthContext(ctx);
    const teams = await listTeamsForCurrentUser(ctx);
    return teams.find((team) => team._id === activeTeamId) ?? null;
  },
});

export const switchActiveTeam = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const { userId } = auth;
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) {
      throw new Error("User not found");
    }

    const partnerOrganization = await getPartnerOrganizationForManagedTeam(ctx, args.teamId);
    if (auth.surface.kind === "partner") {
      await assertManagedTeamBelongsToPartner(
        ctx,
        args.teamId,
        auth.surface.partnerOrganizationId,
      );
    } else if (partnerOrganization !== null) {
      throw new Error("Partner workspaces are unavailable on Kilobot");
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
    const auth = await getAuthContext(ctx);
    const { userId, activeTeamId } = auth;
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) {
      return {
        allowed: false,
        reason: "User not found.",
        requiresPlanUpgrade: false,
      };
    }

    if (auth.surface.kind === "partner") {
      return { allowed: true, reason: null, requiresPlanUpgrade: false };
    }

    if (await isWhiteLabelTeam(ctx, activeTeamId)) {
      return {
        allowed: false,
        reason: "Partner-managed workspaces can only be created from the Partner portal.",
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

    const team = await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    if (team === null) {
      return {
        allowed: false,
        reason: "Team not found.",
        requiresPlanUpgrade: false,
        memberCount: 0,
        maxMembers: 0,
      };
    }

    if (await isWhiteLabelTeam(ctx, team._id)) {
      return {
        allowed: false,
        reason: "Partner-managed workspaces can only be staffed from the Partner portal.",
        requiresPlanUpgrade: false,
        memberCount: await countTeamMembers(ctx, team._id),
        maxMembers: 0,
      };
    }

    const stripeInfo = await getPlanFromStripe(ctx, userId);
    const userPlan = stripeInfo.plan;
    const memberCount = await countTeamMembers(ctx, team._id);
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
    v.literal("starter"),
    v.literal("growth"),
    v.literal("business"),
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

export const addCustomFields = mutation({
  args: {
    fields: v.array(
      v.object({
        key: v.string(),
        label: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) {
      throw new Error("User not found");
    }

    const activeTeam = await getActiveTeamForUser(ctx, userRow);
    const currentFields = activeTeam.customFields ?? [];

    const merged = [...currentFields];
    for (const field of args.fields) {
      const normalizedKey = field.key.trim().toLowerCase();
      if (!merged.some((cf) => cf.key.toLowerCase() === normalizedKey)) {
        merged.push({
          key: field.key.trim(),
          label: field.label.trim(),
        });
      }
    }

    await ctx.db.patch(activeTeam._id, {
      customFields: merged,
      updatedAt: Date.now(),
    });

    return merged;
  },
});
