import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { getOwnedAgentForAuth } from "../agentAccess";
import { getAuthSurface } from "../whiteLabel/authSurface";
import {
  Permission,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../../shared/permissions";
import type { TelegramNotificationKind } from "../../shared/telegramNotificationKinds";
import { nativePushOrigin } from "./validation";

type DbCtx = MutationCtx | QueryCtx;

export async function subscriptionAccess(
  ctx: DbCtx,
  agentId: Id<"agents">,
  origin: string,
) {
  const auth = await getAuthContext(ctx);
  const agent = await getOwnedAgentForAuth(ctx, auth, agentId);
  if (!agent) throw new Error("Agent not found");
  const surface = getAuthSurface(auth.identity);
  if (surface.kind === "partner") {
    if (origin !== `https://${surface.hostname}`)
      throw new Error("Notification origin does not match your session");
  } else {
    nativePushOrigin(origin);
  }
  return {
    auth,
    agent,
    partnerOrganizationId:
      surface.kind === "partner" ? surface.partnerOrganizationId : undefined,
  };
}

export function allowedKinds(
  permissions: readonly string[],
  personal: boolean,
  kinds: TelegramNotificationKind[],
) {
  if (kinds.length !== new Set(kinds).size)
    throw new Error("Duplicate notification types");
  for (const kind of kinds) {
    const permission =
      kind === "humanEscalation"
        ? Permission.CHATS_READ
        : Permission.CALENDAR_READ;
    if (!personal && !permissions.includes(permission))
      throw new Error("You cannot receive this notification type");
  }
  return kinds;
}

export async function deliveryAccess(
  ctx: DbCtx,
  device: Doc<"pushDevices">,
  subscription: Doc<"pushAgentSubscriptions">,
  kind: TelegramNotificationKind,
) {
  const [user, agent, team] = await Promise.all([
    ctx.db.get(device.userId),
    ctx.db.get(subscription.agentId),
    ctx.db.get(subscription.teamId),
  ]);
  if (
    !user ||
    !agent ||
    !team ||
    team.deletionStatus === "deleting" ||
    !subscription.enabled
  )
    return null;
  if (!subscription.kinds.includes(kind)) return null;
  if (team.type === "personal") {
    if (
      team.ownerId !== user._id ||
      agent.userId !== user.workosUserId ||
      (agent.orgId && agent.orgId !== "personal")
    )
      return null;
  } else if (!team.workosOrgId || agent.orgId !== team.workosOrgId) return null;

  const member = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", team._id),
    )
    .unique();
  if (team.type !== "personal" && !member) return null;
  if (member && team.type !== "personal") {
    const stored =
      member.role === "owner"
        ? team.ownerPermissions
        : member.role === "admin"
          ? team.adminPermissions
          : team.memberPermissions;
    const permissions = resolvePermissionsForRole(
      member.role,
      (stored ?? ROLE_PERMISSIONS[member.role]) as PermissionSlug[],
    );
    const required =
      kind === "humanEscalation"
        ? Permission.CHATS_READ
        : Permission.CALENDAR_READ;
    if (!permissions.includes(required)) return null;
  }
  if (!subscription.partnerOrganizationId)
    return { name: "Kilobot", icon: "/pwa/icon-192.png" };
  const organization = await ctx.db.get(subscription.partnerOrganizationId);
  if (
    !organization ||
    organization.status !== "active" ||
    organization.teamId !== team._id
  )
    return null;
  const [partner, domain, account] = await Promise.all([
    ctx.db.get(organization.partnerId),
    ctx.db
      .query("whiteLabelPartnerDomains")
      .withIndex("by_hostname", (q) =>
        q.eq("hostname", new URL(device.origin).hostname),
      )
      .unique(),
    ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", organization._id)
          .eq("workosUserId", user.workosUserId),
      )
      .unique(),
  ]);
  if (
    !partner ||
    partner.status !== "active" ||
    !domain ||
    domain.partnerId !== partner._id ||
    domain.status !== "active" ||
    domain.setupState !== "connected" ||
    account?.status !== "active" ||
    account.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  )
    return null;
  const stored =
    account.role === "owner"
      ? team.ownerPermissions
      : account.role === "admin"
        ? team.adminPermissions
        : team.memberPermissions;
  const permissions = resolvePermissionsForRole(
    account.role,
    (stored ?? ROLE_PERMISSIONS[account.role]) as PermissionSlug[],
  );
  if (
    !permissions.includes(
      kind === "humanEscalation"
        ? Permission.CHATS_READ
        : Permission.CALENDAR_READ,
    )
  )
    return null;
  const icon = partner.logoStorageId
    ? await ctx.storage.getUrl(partner.logoStorageId)
    : null;
  return { name: partner.name, icon };
}
