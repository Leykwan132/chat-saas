import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

import { PLAN_CATALOG, type PlanKey } from "./planCatalog";

export const PERSONAL_ORG_ID = "";

export const PERSONAL_TEAM_NAME = "Personal";
export const DEFAULT_TEAM_TIME_ZONE = "Asia/Kuala_Lumpur";

export function normalizeTimeZone(timeZone: string | undefined | null) {
  return timeZone?.trim() || DEFAULT_TEAM_TIME_ZONE;
}

export function getMemberLimitForPlan(plan: PlanKey | undefined): number {
  const key = plan ?? "free";
  const limit = PLAN_CATALOG[key]?.maxMembers ?? PLAN_CATALOG.free.maxMembers;
  return limit < 0 ? Number.MAX_SAFE_INTEGER : limit;
}

export async function getUserByWorkosId(
  ctx: QueryCtx | MutationCtx,
  workosUserId: string,
) {
  return await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
}

export async function getPersonalTeamForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("teams")
    .withIndex("by_ownerId_and_type", (q) =>
      q.eq("ownerId", userId).eq("type", "personal"),
    )
    .first();
}

export async function getTeamByWorkosOrgId(
  ctx: QueryCtx | MutationCtx,
  workosOrgId: string,
) {
  return await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
    .unique();
}

export async function countTeamMembers(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
) {
  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .collect();
  return memberships.length;
}

export async function ensureTeamMembership(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    role: Doc<"teamMemberships">["role"];
  },
) {
  const existing = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", args.userId).eq("teamId", args.teamId),
    )
    .unique();
  if (existing !== null) {
    if (existing.role !== args.role) {
      await ctx.db.patch(existing._id, { role: args.role });
    }
    return existing._id;
  }
  return await ctx.db.insert("teamMemberships", {
    teamId: args.teamId,
    userId: args.userId,
    role: args.role,
    createdAt: Date.now(),
  });
}

export async function removeTeamMembership(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  userId: Id<"users">,
) {
  const existing = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userId).eq("teamId", teamId),
    )
    .unique();
  if (existing !== null) {
    await ctx.db.delete(existing._id);
  }
}

export function teamToOrgId(team: Doc<"teams">): string {
  if (team.type === "personal") {
    return PERSONAL_ORG_ID;
  }
  return team.workosOrgId ?? PERSONAL_ORG_ID;
}

export async function getActiveTeamForUser(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
): Promise<Doc<"teams">> {
  if (user.activeTeamId !== undefined) {
    const team = await ctx.db.get(user.activeTeamId);
    if (team !== null) {
      const membership = await ctx.db
        .query("teamMemberships")
        .withIndex("by_userId_and_teamId", (q) =>
          q.eq("userId", user._id).eq("teamId", team._id),
        )
        .unique();
      if (membership !== null) {
        return team;
      }
    }
  }

  const personalTeam = await getPersonalTeamForUser(ctx, user._id);
  if (personalTeam === null) {
    throw new Error("Personal team not found");
  }

  if (user.activeTeamId !== personalTeam._id && typeof (ctx.db as MutationCtx["db"]).patch === "function") {
    await (ctx.db as MutationCtx["db"]).patch(user._id, {
      activeTeamId: personalTeam._id,
      updatedAt: Date.now(),
    });
  }

  return personalTeam;
}

export async function setActiveTeamForUser(
  ctx: MutationCtx,
  user: Doc<"users">,
  teamId: Id<"teams">,
): Promise<Doc<"teams">> {
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", teamId),
    )
    .unique();
  if (membership === null) {
    throw new Error("You are not a member of this team");
  }

  const team = await ctx.db.get(teamId);
  if (team === null) {
    throw new Error("Team not found");
  }

  await ctx.db.patch(user._id, {
    activeTeamId: teamId,
    updatedAt: Date.now(),
  });

  return team;
}

export async function createPersonalTeamForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  timeZone?: string,
) {
  const existing = await getPersonalTeamForUser(ctx, userId);
  if (existing !== null) {
    if (existing.timeZone === undefined && timeZone !== undefined) {
      await ctx.db.patch(existing._id, {
        timeZone: normalizeTimeZone(timeZone),
        updatedAt: Date.now(),
      });
    }
    return existing._id;
  }

  const now = Date.now();
  const teamId = await ctx.db.insert("teams", {
    type: "personal",
    name: PERSONAL_TEAM_NAME,
    ownerId: userId,
    timeZone: normalizeTimeZone(timeZone),
    createdAt: now,
    updatedAt: now,
  });
  await ensureTeamMembership(ctx, {
    teamId,
    userId,
    role: "owner",
  });

  await ctx.db.patch(userId, {
    activeTeamId: teamId,
    updatedAt: now,
  });

  const user = await ctx.db.get(userId);
  if (user !== null && user.plan === undefined) {
    await ctx.db.patch(userId, { plan: "free", updatedAt: now });
  }

  return teamId;
}

export type EnsureUserAccountArgs = {
  workosUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  timeZone?: string;
};

/** Creates or updates the app user row and always ensures a personal team exists. */
export async function ensureUserAccount(
  ctx: MutationCtx,
  args: EnsureUserAccountArgs,
): Promise<Id<"users">> {
  const normalizedEmail = args.email?.trim().toLowerCase();
  const now = Date.now();
  const existing = await getUserByWorkosId(ctx, args.workosUserId);

  if (existing !== null) {
    const patch: {
      email?: string;
      firstName?: string;
      lastName?: string;
      profilePictureUrl?: string;
      updatedAt: number;
    } = { updatedAt: now };

    if (normalizedEmail && existing.email !== normalizedEmail) {
      patch.email = normalizedEmail;
    }
    if (args.firstName !== undefined && existing.firstName !== args.firstName) {
      patch.firstName = args.firstName;
    }
    if (args.lastName !== undefined && existing.lastName !== args.lastName) {
      patch.lastName = args.lastName;
    }
    if (
      args.profilePictureUrl !== undefined &&
      existing.profilePictureUrl !== args.profilePictureUrl
    ) {
      patch.profilePictureUrl = args.profilePictureUrl;
    }

    if (
      patch.email !== undefined ||
      patch.firstName !== undefined ||
      patch.lastName !== undefined ||
      patch.profilePictureUrl !== undefined
    ) {
      await ctx.db.patch(existing._id, patch);
    }

    if ((await getPersonalTeamForUser(ctx, existing._id)) === null) {
      await createPersonalTeamForUser(ctx, existing._id, args.timeZone);
    }

    return existing._id;
  }

  const userId = await ctx.db.insert("users", {
    workosUserId: args.workosUserId,
    email: normalizedEmail ?? "",
    firstName: args.firstName,
    lastName: args.lastName,
    profilePictureUrl: args.profilePictureUrl,
    plan: "free",
    createdAt: now,
    updatedAt: now,
  });
  await createPersonalTeamForUser(ctx, userId, args.timeZone);
  return userId;
}

export async function ensureOrganizationalTeam(
  ctx: MutationCtx,
  args: {
    workosOrgId: string;
    name: string;
    stripeSubscriptionId?: string;
    ownerUserId: Id<"users">;
    timeZone?: string;
  },
) {
  const now = Date.now();
  let team = await getTeamByWorkosOrgId(ctx, args.workosOrgId);
  if (team === null) {
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: args.name,
      stripeSubscriptionId: args.stripeSubscriptionId,
      ownerId: args.ownerUserId,
      workosOrgId: args.workosOrgId,
      timeZone: normalizeTimeZone(args.timeZone),
      createdAt: now,
      updatedAt: now,
    });
    team = (await ctx.db.get(teamId))!;
  } else if (team.name !== args.name || (team.timeZone === undefined && args.timeZone !== undefined)) {
    await ctx.db.patch(team._id, {
      name: args.name,
      timeZone: team.timeZone ?? normalizeTimeZone(args.timeZone),
      updatedAt: now,
    });
  }

  await ensureTeamMembership(ctx, {
    teamId: team._id,
    userId: args.ownerUserId,
    role: "owner",
  });

  return team._id;
}


