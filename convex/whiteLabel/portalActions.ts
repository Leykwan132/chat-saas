"use node";

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import { provisionOrganizationRoles } from "../orgRoles";
import {
  workosRequest,
  type WorkOSInvitation,
  type WorkOSOrganization,
} from "../workosClient";
import { WORKOS_OWNER_ROLE_SLUG, WORKOS_ADMIN_ROLE_SLUG, WORKOS_MEMBER_ROLE_SLUG } from "../../shared/teamRoleCatalog";

const planKeyValidator = v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("business"));
const roleValidator = v.union(v.literal("owner"), v.literal("admin"), v.literal("member"));

function validateOrganizationName(name: string) {
  const value = name.trim();
  if (!value || value.length > 80) throw new Error("Organization name must be between 1 and 80 characters.");
  return value;
}

export const createOrganization = action({
  args: { name: v.string(), planKey: planKeyValidator },
  returns: v.object({ partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"), teamId: v.id("teams") }),
  handler: async (ctx, args): Promise<{ partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">; teamId: Id<"teams"> }> => {
    const auth = await getAuthContext(ctx);
    const access: { partnerId: Id<"whiteLabelPartners"> } = await ctx.runQuery(internal.whiteLabel.portalAuthorization.assertPartnerOwner, { email: auth.email, workosUserId: auth.userId });
    const name = validateOrganizationName(args.name);
    const organization = await workosRequest<WorkOSOrganization>("/organizations", { method: "POST", body: JSON.stringify({ name }) });
    await provisionOrganizationRoles(organization.id);
    await workosRequest("/user_management/organization_memberships", { method: "POST", body: JSON.stringify({ user_id: auth.userId, organization_id: organization.id, role_slug: WORKOS_OWNER_ROLE_SLUG }) });
    const created: { partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">; teamId: Id<"teams">; ownerId: Id<"users"> } = await ctx.runMutation(internal.whiteLabel.portalProvisioning.persistCreatedOrganization, { partnerId: access.partnerId, workosUserId: auth.userId, workosOrgId: organization.id, name: organization.name ?? name, planKey: args.planKey });
    const start = Date.now();
    await ctx.runMutation(internal.whiteLabel.portalProvisioning.initializeFirstCreditPeriod, { partnerOrganizationId: created.partnerOrganizationId, actorUserId: created.ownerId, planKey: args.planKey, periodStart: start, periodEnd: start + 30 * 24 * 60 * 60 * 1000 });
    return { partnerOrganizationId: created.partnerOrganizationId, teamId: created.teamId };
  },
});

export const inviteOrganizationAccount = action({
  args: { partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"), email: v.string(), role: roleValidator },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    const auth = await getAuthContext(ctx);
    const organization: { workosOrgId: string } = await ctx.runQuery(internal.whiteLabel.portalAuthorization.getInvitableOrganization, { email: auth.email, workosUserId: auth.userId, partnerOrganizationId: args.partnerOrganizationId });
    const roleSlug = args.role === "owner" ? WORKOS_OWNER_ROLE_SLUG : args.role === "admin" ? WORKOS_ADMIN_ROLE_SLUG : WORKOS_MEMBER_ROLE_SLUG;
    const invitation = await workosRequest<WorkOSInvitation>(
      "/user_management/invitations",
      { method: "POST", body: JSON.stringify({ email: args.email.trim().toLowerCase(), organization_id: organization.workosOrgId, role_slug: roleSlug }) },
    );
    await ctx.runMutation(internal.teamInvitationRecords.syncFromWorkosInvitation, {
      data: invitation,
    });
    return invitation;
  },
});
