import { v } from "convex/values";
import { action, internalMutation, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import {
  ensureOrganizationalTeam,
  ensureTeamMembership,
  getPersonalTeamForUser,
  getTeamByWorkosOrgId,
  getUserByWorkosId,
  setActiveTeamForUser,
} from "./teamHelpers";
import { provisionOrganizationRoles } from "./orgRoles";
import { WORKOS_OWNER_ROLE_SLUG } from "../shared/teamRoleCatalog";
import {
  type WorkOSOrganization,
  workosRequest,
} from "./workosClient";

function validateTeamName(name: string) {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Team name is required");
  }
  if (trimmedName.length > 80) {
    throw new Error("Team name must be 80 characters or fewer");
  }
  return trimmedName;
}

function validateOptionalDomain(domain: string | undefined) {
  const trimmedDomain = domain?.trim().toLowerCase();
  if (trimmedDomain === undefined || trimmedDomain.length === 0) {
    return undefined;
  }

  const isValidDomain = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    trimmedDomain,
  );
  if (!isValidDomain) {
    throw new Error(
      "Domain looks invalid. Use a hostname like example.com (no protocol or path).",
    );
  }

  return trimmedDomain;
}

async function assertCanManageOrganization(
  ctx: ActionCtx,
  teamId: Id<"teams">,
) {
  const team = await ctx.runQuery(api.teams.getTeamDetail, { teamId });
  if (team === null) {
    throw new Error("Team not found.");
  }
  if (team.type !== "organizational" || !team.workosOrgId) {
    throw new Error("Only shared teams can be managed here.");
  }
  if (!team.isOwner) {
    throw new Error("Only team owners can manage this organization.");
  }
  return team;
}

function primaryOrganizationDomain(org: WorkOSOrganization) {
  return org.domains?.[0]?.domain ?? null;
}

async function createWorkOSTeam(
  userId: string,
  args: { name: string; domain?: string },
): Promise<{ organizationId: string; name: string; domain?: string }> {
  const trimmedName = validateTeamName(args.name);
  const trimmedDomain = validateOptionalDomain(args.domain);

  const orgBody: Record<string, unknown> = { name: trimmedName };
  if (trimmedDomain) {
    orgBody.domain_data = [{ domain: trimmedDomain, state: "pending" }];
  }

  const orgPayload = await workosRequest<WorkOSOrganization>("/organizations", {
    method: "POST",
    body: JSON.stringify(orgBody),
  });
  if (!orgPayload.id) {
    throw new Error("Failed to create team.");
  }
  const organizationId = orgPayload.id;

  await provisionOrganizationRoles(organizationId);

  await workosRequest("/user_management/organization_memberships", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      organization_id: organizationId,
      role_slug: WORKOS_OWNER_ROLE_SLUG,
    }),
  });

  return {
    organizationId,
    name: orgPayload.name ?? trimmedName,
    domain: trimmedDomain,
  };
}

async function createTeamHandler(
  ctx: ActionCtx,
  args: {
    name: string;
    domain?: string;
    industry?: string;
    companySize?: string;
  },
): Promise<{ organizationId: string; name: string; teamId: string }> {
  const { userId } = await getAuthContext(ctx);

  const gate = await ctx.runQuery(api.teams.canCreateOrgTeam, {});
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "You cannot create a team on your current plan.");
  }

  const result = await createWorkOSTeam(userId, args);

  const teamId = await ctx.runMutation(internal.organizationsAdmin.persistCreatedTeam, {
    workosOrgId: result.organizationId,
    name: result.name,
    workosUserId: userId,
    industry: args.industry,
    companySize: args.companySize,
    domain: result.domain,
  });

  return { ...result, teamId };
}

export const persistCreatedTeam = internalMutation({
  args: {
    workosOrgId: v.string(),
    name: v.string(),
    workosUserId: v.string(),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByWorkosId(ctx, args.workosUserId);
    if (user === null) {
      throw new Error("User not found");
    }

    const now = Date.now();
    let org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
      .unique();

    if (org === null) {
      const orgId = await ctx.db.insert("organizations", {
        workosOrgId: args.workosOrgId,
        name: args.name,
        members: [user._id],
        admins: [user._id],
        plan: "free",
        credits: 500,
        createdAt: now,
        updatedAt: now,
      });
      org = (await ctx.db.get(orgId))!;
    } else {
      const members = org.members.includes(user._id)
        ? org.members
        : [...org.members, user._id];
      const admins = org.admins.includes(user._id)
        ? org.admins
        : [...org.admins, user._id];
      await ctx.db.patch(org._id, {
        name: args.name,
        members,
        admins,
        updatedAt: now,
      });
      org = (await ctx.db.get(org._id))!;
    }

    const teamId = await ensureOrganizationalTeam(ctx, {
      workosOrgId: args.workosOrgId,
      name: args.name,
      ownerUserId: user._id,
    });

    await ctx.db.patch(teamId, {
      industry: args.industry,
      companySize: args.companySize,
      domain: args.domain,
      updatedAt: now,
    });

    await ensureTeamMembership(ctx, {
      teamId,
      userId: user._id,
      role: "owner",
    });

    await setActiveTeamForUser(ctx, user, teamId);

    return teamId;
  },
});

export const createTeamForCurrentUser = action({
  args: {
    name: v.string(),
    domain: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
  },
  handler: createTeamHandler,
});

/** @deprecated Use createTeamForCurrentUser */
export const createOrganizationForCurrentUser = action({
  args: {
    name: v.string(),
    domain: v.optional(v.string()),
  },
  handler: createTeamHandler,
});

export const getOrganizationForTeam = action({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const team = await assertCanManageOrganization(ctx, args.teamId);
    const org = await workosRequest<WorkOSOrganization>(
      `/organizations/${team.workosOrgId}`,
    );

    return {
      name: org.name,
      domain: team.domain ?? primaryOrganizationDomain(org) ?? "",
    };
  },
});

export const updateOrganizationForTeam = action({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const team = await assertCanManageOrganization(ctx, args.teamId);
    const trimmedName = validateTeamName(args.name);
    const trimmedDomain = validateOptionalDomain(args.domain);

    const body: Record<string, unknown> = { name: trimmedName };
    if (trimmedDomain) {
      body.domain_data = [{ domain: trimmedDomain, state: "pending" }];
    }

    const org = await workosRequest<WorkOSOrganization>(
      `/organizations/${team.workosOrgId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );

    await ctx.runMutation(internal.organizationsAdmin.persistUpdatedOrganization, {
      workosOrgId: team.workosOrgId!,
      name: org.name ?? trimmedName,
      domain: trimmedDomain ?? null,
    });

    return {
      name: org.name ?? trimmedName,
      domain: trimmedDomain ?? "",
    };
  },
});

export const persistUpdatedOrganization = internalMutation({
  args: {
    workosOrgId: v.string(),
    name: v.string(),
    domain: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
      .unique();

    if (org !== null) {
      await ctx.db.patch(org._id, {
        name: args.name,
        updatedAt: now,
      });
    }

    const team = await getTeamByWorkosOrgId(ctx, args.workosOrgId);
    if (team !== null) {
      await ctx.db.patch(team._id, {
        name: args.name,
        domain: args.domain ?? undefined,
        updatedAt: now,
      });
    }
  },
});

export const removeOrganizationLocally = internalMutation({
  args: {
    workosOrgId: v.string(),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByWorkosId(ctx, args.workosUserId);
    if (user === null) {
      throw new Error("User not found");
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
      .unique();

    if (org !== null) {
      await ctx.db.delete(org._id);
    }

    const team = await getTeamByWorkosOrgId(ctx, args.workosOrgId);
    if (team !== null) {
      const memberships = await ctx.db
        .query("teamMemberships")
        .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
        .collect();
      for (const membership of memberships) {
        await ctx.db.delete(membership._id);
      }
      await ctx.db.delete(team._id);

      if (user.activeTeamId === team._id) {
        const personalTeam = await getPersonalTeamForUser(ctx, user._id);
        if (personalTeam !== null) {
          await setActiveTeamForUser(ctx, user, personalTeam._id);
        }
      }
    }
  },
});
