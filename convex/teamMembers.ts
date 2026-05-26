import { v } from "convex/values";
import {
  WORKOS_OWNER_ROLE_SLUG,
  isAppOrgRoleSlug,
} from "../shared/teamRoleCatalog";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import {
  type WorkOSOrganizationMembership,
  type WorkOSOrganizationMembershipList,
  workosRequest,
} from "./workosClient";

export type TeamMemberItem = {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  profilePictureUrl: string | null;
  roleSlug: string | null;
  status: WorkOSOrganizationMembership["status"];
  createdAt: string;
};

function buildDisplayName(user: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : user.email;
}

async function fetchUserById(userId: string) {
  return await workosRequest<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
  }>(`/user_management/users/${userId}`);
}

function mapMembership(
  membership: WorkOSOrganizationMembership,
  user: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
  },
): TeamMemberItem {
  return {
    id: membership.id,
    userId: membership.user_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    displayName: buildDisplayName(user),
    profilePictureUrl: user.profile_picture_url,
    roleSlug: membership.role?.slug ?? null,
    status: membership.status,
    createdAt: membership.created_at,
  };
}

async function listAllOrganizationMemberships(
  organizationId: string,
): Promise<WorkOSOrganizationMembership[]> {
  const memberships: WorkOSOrganizationMembership[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({
      organization_id: organizationId,
      limit: "100",
    });
    params.append("statuses[]", "active");
    params.append("statuses[]", "pending");
    params.append("statuses[]", "inactive");
    if (after) {
      params.set("after", after);
    }

    const page = await workosRequest<WorkOSOrganizationMembershipList>(
      `/user_management/organization_memberships?${params.toString()}`,
    );
    memberships.push(...page.data);
    after = page.list_metadata?.after ?? undefined;
  } while (after);

  return memberships;
}

async function assertCanManageTeamMembers(ctx: ActionCtx, teamId: Id<"teams">) {
  const team = await ctx.runQuery(api.teams.getTeamDetail, { teamId });
  if (team === null) {
    throw new Error("Team not found.");
  }
  if (team.type !== "organizational" || !team.workosOrgId) {
    throw new Error("Members can only be managed on shared teams.");
  }
  if (!team.isAdmin) {
    throw new Error("Only team admins can manage members.");
  }
  if (!team.isActive) {
    throw new Error("Switch to this team to manage members.");
  }
  return { workosOrgId: team.workosOrgId, isOwner: team.isOwner };
}

async function verifyMembershipInOrg(membershipId: string, workosOrgId: string) {
  const membership = await workosRequest<WorkOSOrganizationMembership>(
    `/user_management/organization_memberships/${membershipId}`,
  );
  if (membership.organization_id !== workosOrgId) {
    throw new Error("Member does not belong to this team.");
  }
  return membership;
}

async function resolveWorkosOrgIdForTeam(
  ctx: Parameters<typeof getAuthContext>[0],
  teamId?: Id<"teams">,
): Promise<string | null> {
  if (teamId) {
    const team = await ctx.runQuery(api.teams.getTeamDetail, {
      teamId,
    });
    if (team === null || team.type !== "organizational" || !team.workosOrgId) {
      return null;
    }
    return team.workosOrgId;
  }

  const { orgId } = await getAuthContext(ctx);
  if (!orgId || orgId === "") {
    return null;
  }
  return orgId;
}

export const listForTeam = action({
  args: {
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args): Promise<TeamMemberItem[]> => {
    const workosOrgId = await resolveWorkosOrgIdForTeam(ctx, args.teamId);
    if (!workosOrgId) {
      return [];
    }

    const memberships = await listAllOrganizationMemberships(workosOrgId);

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const embeddedUser = membership.user;
        if (embeddedUser) {
          return mapMembership(membership, {
            email: embeddedUser.email,
            first_name: embeddedUser.first_name,
            last_name: embeddedUser.last_name,
            profile_picture_url: embeddedUser.profile_picture_url,
          });
        }

        const user = await fetchUserById(membership.user_id);
        return mapMembership(membership, {
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_picture_url: user.profile_picture_url,
        });
      }),
    );

    return members.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const updateMemberRole = action({
  args: {
    teamId: v.id("teams"),
    membershipId: v.string(),
    roleSlug: v.string(),
  },
  handler: async (ctx, args): Promise<TeamMemberItem> => {
    const { workosOrgId, isOwner } = await assertCanManageTeamMembers(ctx, args.teamId);
    if (!isAppOrgRoleSlug(args.roleSlug)) {
      throw new Error("Choose a valid role for this teammate.");
    }
    if (args.roleSlug === WORKOS_OWNER_ROLE_SLUG && !isOwner) {
      throw new Error("Only team owners can assign the Owner role.");
    }
    await verifyMembershipInOrg(args.membershipId, workosOrgId);

    const updated = await workosRequest<WorkOSOrganizationMembership>(
      `/user_management/organization_memberships/${args.membershipId}`,
      {
        method: "PUT",
        body: JSON.stringify({ role_slug: args.roleSlug }),
      },
    );

    await ctx.runMutation(internal.workosWebhook.syncMembershipFromWebhook, {
      data: {
        user_id: updated.user_id,
        organization_id: updated.organization_id,
        role: updated.role,
      },
    });

    const embeddedUser = updated.user;
    if (embeddedUser) {
      return mapMembership(updated, {
        email: embeddedUser.email,
        first_name: embeddedUser.first_name,
        last_name: embeddedUser.last_name,
        profile_picture_url: embeddedUser.profile_picture_url,
      });
    }

    const user = await fetchUserById(updated.user_id);
    return mapMembership(updated, {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_picture_url: user.profile_picture_url,
    });
  },
});

export const removeMember = action({
  args: {
    teamId: v.id("teams"),
    membershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workosOrgId } = await assertCanManageTeamMembers(ctx, args.teamId);
    const membership = await verifyMembershipInOrg(args.membershipId, workosOrgId);

    const { userId } = await getAuthContext(ctx);
    if (membership.user_id === userId) {
      throw new Error("You cannot remove yourself from the team.");
    }

    await workosRequest(`/user_management/organization_memberships/${args.membershipId}`, {
      method: "DELETE",
    });

    await ctx.runMutation(internal.workosWebhook.removeMembershipFromWebhook, {
      data: {
        user_id: membership.user_id,
        organization_id: membership.organization_id,
      },
    });
  },
});
