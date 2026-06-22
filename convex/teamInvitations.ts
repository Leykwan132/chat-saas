import { v, ConvexError } from "convex/values";
import { WORKOS_MEMBER_ROLE_SLUG, WORKOS_OWNER_ROLE_SLUG, isAppOrgRoleSlug } from "../shared/teamRoleCatalog";
import { action, query, internalQuery, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { getUserByWorkosId } from "./teamHelpers";
import {
  type WorkOSInvitation,
  type WorkOSInvitationList,
  type WorkOSOrganization,
  workosRequest,
} from "./workosClient";

export type TeamInvitationItem = {
  id: string;
  email: string;
  state: WorkOSInvitation["state"];
  roleSlug: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type IncomingTeamInvitationItem = {
  id: string;
  email: string;
  organizationId: string | null;
  organizationName: string;
  roleSlug: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type AcceptInvitationResult = {
  invitation: IncomingTeamInvitationItem;
  teamId: string | null;
  workosOrgId: string | null;
};

function mapInvitation(invitation: WorkOSInvitation): TeamInvitationItem {
  return {
    id: invitation.id,
    email: invitation.email,
    state: invitation.state,
    roleSlug: invitation.role_slug,
    expiresAt: invitation.expires_at,
    createdAt: invitation.created_at,
  };
}

function mapIncomingInvitation(
  invitation: WorkOSInvitation,
  organizationName: string,
): IncomingTeamInvitationItem {
  return {
    id: invitation.id,
    email: invitation.email,
    organizationId: invitation.organization_id,
    organizationName,
    roleSlug: invitation.role_slug,
    expiresAt: invitation.expires_at,
    createdAt: invitation.created_at,
  };
}

async function listInvitationsForEmail(email: string): Promise<WorkOSInvitation[]> {
  const invitations: WorkOSInvitation[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({
      email: email.trim().toLowerCase(),
      limit: "100",
    });
    if (after) {
      params.set("after", after);
    }

    const page = await workosRequest<WorkOSInvitationList>(
      `/user_management/invitations?${params.toString()}`,
    );
    invitations.push(...page.data);
    after = page.list_metadata?.after ?? undefined;
  } while (after);

  return invitations;
}

async function resolveOrganizationName(
  ctx: ActionCtx,
  workosOrgId: string | null,
): Promise<string> {
  if (!workosOrgId) {
    return "Team";
  }

  const name = await ctx.runQuery(internal.teamInvitations.getOrganizationDisplayName, {
    workosOrgId,
  });
  if (name) {
    return name;
  }

  try {
    const organization = await workosRequest<WorkOSOrganization>(
      `/organizations/${workosOrgId}`,
    );
    return organization.name;
  } catch {
    return "Team";
  }
}

export const getOrganizationDisplayName = internalQuery({
  args: {
    workosOrgId: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
      .unique();
    return team?.name ?? null;
  },
});

export const getUserEmail = internalQuery({
  args: {
    userDbId: v.id("users"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const user = await ctx.db.get(args.userDbId);
    return user?.email ?? null;
  },
});

export const resolveTeamForOrg = internalQuery({
  args: {
    workosOrgId: v.string(),
    userDbId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
      .first();
    if (!team) {
      return null;
    }

    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", args.userDbId).eq("teamId", team._id),
      )
      .unique();

    return {
      teamId: team._id,
      hasMembership: membership !== null,
    };
  },
});

async function assertCanManageInvites(
  ctx: Parameters<typeof getAuthContext>[0],
) {
  const gate = await ctx.runQuery(api.teams.canInviteMembers, {});
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "You cannot invite people to this team.");
  }
  return gate;
}

async function syncInvitationToLocal(
  ctx: ActionCtx,
  invitation: WorkOSInvitation,
): Promise<void> {
  await ctx.runMutation(internal.teamInvitationRecords.syncFromWorkosInvitation, {
    data: invitation,
  });
}

export const listPendingForCurrentUser = action({
  args: {},
  handler: async (ctx): Promise<IncomingTeamInvitationItem[]> => {
    const auth = await getAuthContext(ctx);
    const email =
      auth.identity.email ??
      (await ctx.runQuery(internal.teamInvitations.getUserEmail, {
        userDbId: auth.userDbId,
      }));
    if (!email) {
      return [];
    }

    const invitations = await listInvitationsForEmail(email);
    const pending = invitations.filter((invitation) => invitation.state === "pending");

    return await Promise.all(
      pending.map(async (invitation) => {
        const organizationName = await resolveOrganizationName(
          ctx,
          invitation.organization_id,
        );
        return mapIncomingInvitation(invitation, organizationName);
      }),
    );
  },
});

export const acceptInvitation = action({
  args: {
    invitationId: v.string(),
  },
  handler: async (ctx, args): Promise<AcceptInvitationResult> => {
    const auth = await getAuthContext(ctx);
    const email =
      auth.identity.email ??
      (await ctx.runQuery(internal.teamInvitations.getUserEmail, {
        userDbId: auth.userDbId,
      }));
    if (!email) {
      throw new Error("Your account does not have an email address.");
    }

    const invitation = await workosRequest<WorkOSInvitation>(
      `/user_management/invitations/${args.invitationId}`,
    );

    if (invitation.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error("This invitation is not for your account.");
    }
    if (invitation.state !== "pending") {
      throw new Error("This invitation is no longer available.");
    }

    const accepted = await workosRequest<WorkOSInvitation>(
      `/user_management/invitations/${args.invitationId}/accept`,
      { method: "POST" },
    );

    await ctx.runMutation(internal.workosWebhook.syncAcceptedInvitation, {
      data: {
        ...accepted,
        accepted_user_id: accepted.accepted_user_id ?? auth.userId,
      },
    });

    const workosOrgId = accepted.organization_id;
    let teamId: string | null = null;
    if (workosOrgId) {
      const team = await ctx.runQuery(internal.teamInvitations.resolveTeamForOrg, {
        workosOrgId,
        userDbId: auth.userDbId,
      });
      teamId = team?.teamId ?? null;
    }

    const organizationName = await resolveOrganizationName(ctx, workosOrgId);

    return {
      invitation: mapIncomingInvitation(accepted, organizationName),
      teamId,
      workosOrgId,
    };
  },
});

export const listForCurrentOrg = action({
  args: {},
  handler: async (ctx): Promise<TeamInvitationItem[]> => {
    const { orgId } = await getAuthContext(ctx);
    if (!orgId || orgId === "") {
      return [];
    }

    const params = new URLSearchParams({
      organization_id: orgId,
      limit: "100",
    });

    const result = await workosRequest<WorkOSInvitationList>(
      `/user_management/invitations?${params.toString()}`,
    );

    await Promise.all(
      result.data.map((invitation) => syncInvitationToLocal(ctx, invitation)),
    );

    return result.data
      .filter((invitation) => invitation.state !== "accepted")
      .map(mapInvitation)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const sendInvitation = action({
  args: {
    email: v.string(),
    roleSlug: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TeamInvitationItem> => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || orgId === "") {
      throw new ConvexError({
        message: "Switch to a shared team to invite people.",
        code: "SWITCH_TO_SHARED_TEAM",
        severity: "medium",
      });
    }

    await assertCanManageInvites(ctx);

    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError({
        message: "Enter a valid email address.",
        code: "INVALID_EMAIL",
        severity: "medium",
      });
    }

    const roleSlug = args.roleSlug ?? WORKOS_MEMBER_ROLE_SLUG;
    if (!isAppOrgRoleSlug(roleSlug)) {
      throw new ConvexError({
        message: "Choose a valid role for this invitation.",
        code: "INVALID_ROLE",
        severity: "medium",
      });
    }
    if (roleSlug === WORKOS_OWNER_ROLE_SLUG) {
      const access = await ctx.runQuery(api.teamAccess.getCurrentUserAccess, {});
      if (access?.role !== "owner") {
        throw new ConvexError({
          message: "Only team owners can invite someone as Owner.",
          code: "OWNER_INVITE_ONLY",
          severity: "medium",
        });
      }
    }

    try {
      const invitation = await workosRequest<WorkOSInvitation>(
        "/user_management/invitations",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            organization_id: orgId,
            role_slug: roleSlug,
            inviter_user_id: userId,
          }),
        },
      );

      await syncInvitationToLocal(ctx, invitation);

      return mapInvitation(invitation);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("User already a member of organization")) {
        throw new ConvexError({
          message: "User already a member of organization.",
          code: "USER_ALREADY_MEMBER",
          severity: "high",
        });
      }
      throw err;
    }
  },
});

export const revokeInvitation = action({
  args: {
    invitationId: v.string(),
  },
  handler: async (ctx, args): Promise<TeamInvitationItem> => {
    const { orgId } = await getAuthContext(ctx);
    if (!orgId || orgId === "") {
      throw new Error("Switch to a shared team to manage invitations.");
    }

    await assertCanManageInvites(ctx);

    const invitation = await workosRequest<WorkOSInvitation>(
      `/user_management/invitations/${args.invitationId}/revoke`,
      { method: "POST" },
    );

    if (invitation.organization_id && invitation.organization_id !== orgId) {
      throw new Error("Invitation does not belong to this team.");
    }

    await syncInvitationToLocal(ctx, invitation);

    return mapInvitation(invitation);
  },
});

export const resendInvitation = action({
  args: {
    invitationId: v.string(),
  },
  handler: async (ctx, args): Promise<TeamInvitationItem> => {
    const { orgId } = await getAuthContext(ctx);
    if (!orgId || orgId === "") {
      throw new Error("Switch to a shared team to manage invitations.");
    }

    await assertCanManageInvites(ctx);

    const invitation = await workosRequest<WorkOSInvitation>(
      `/user_management/invitations/${args.invitationId}/resend`,
      { method: "POST" },
    );

    if (invitation.organization_id && invitation.organization_id !== orgId) {
      throw new Error("Invitation does not belong to this team.");
    }

    await syncInvitationToLocal(ctx, invitation);

    return mapInvitation(invitation);
  },
});

export const getPendingCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return 0;

    const user = await getUserByWorkosId(ctx, identity.subject);
    if (user === null) return 0;

    const email = user.email;
    if (!email) return 0;

    const pending = await ctx.db
      .query("teamInvitationRecords")
      .withIndex("by_email_and_state", (q) =>
        q.eq("email", email.trim().toLowerCase()).eq("state", "pending"),
      )
      .collect();

    return pending.length;
  },
});
