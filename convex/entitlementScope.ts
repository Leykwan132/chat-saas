import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getPartnerAuthIssuer } from "./partnerAuthConfig";
import { ACCOUNT_UNAVAILABLE_ERROR_CODE } from "../shared/accountAvailability";

type DbCtx = QueryCtx | MutationCtx;
type Identity = NonNullable<Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>>;

export type EntitlementScope =
  | {
    kind: "native";
    user: Doc<"users">;
  }
  | {
    kind: "partner";
    user: Doc<"users">;
    account: Doc<"whiteLabelPartnerOrganizationAccounts">;
    organization: Doc<"whiteLabelPartnerOrganizations">;
    partner: Doc<"whiteLabelPartners">;
    domain: Doc<"whiteLabelPartnerDomains">;
    team: Doc<"teams">;
  };

function accountUnavailable(): never {
  throw new ConvexError({ code: ACCOUNT_UNAVAILABLE_ERROR_CODE });
}

function partnerClaims(identity: Identity) {
  if (
    identity.surface !== "partner" ||
    typeof identity.hostname !== "string" ||
    typeof identity.partnerId !== "string" ||
    typeof identity.partnerOrganizationId !== "string"
  ) {
    accountUnavailable();
  }
  return {
    hostname: identity.hostname.trim().toLowerCase(),
    partnerId: identity.partnerId as Id<"whiteLabelPartners">,
    partnerOrganizationId:
      identity.partnerOrganizationId as Id<"whiteLabelPartnerOrganizations">,
  };
}

export async function resolveEntitlementScope(
  ctx: DbCtx,
  identity: Identity,
): Promise<EntitlementScope> {
  const isPartnerSurface = identity.issuer === getPartnerAuthIssuer(process.env);
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", identity.subject))
    .unique();
  if (user === null) {
    if (isPartnerSurface) accountUnavailable();
    throw new Error("User not found");
  }

  if (!isPartnerSurface) {
    return { kind: "native", user };
  }

  const claims = partnerClaims(identity);
  const [account, organization, partner, domain] = await Promise.all([
    ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", claims.partnerOrganizationId)
          .eq("workosUserId", identity.subject),
      )
      .unique(),
    ctx.db.get(claims.partnerOrganizationId),
    ctx.db.get(claims.partnerId),
    ctx.db
      .query("whiteLabelPartnerDomains")
      .withIndex("by_hostname", (q) => q.eq("hostname", claims.hostname))
      .unique(),
  ]);
  if (
    account === null ||
    account.status !== "active" ||
    account.email.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
    (typeof identity.email === "string" &&
      identity.email.trim().toLowerCase() !== account.email.trim().toLowerCase()) ||
    organization === null ||
    organization.status !== "active" ||
    organization.partnerId !== claims.partnerId ||
    partner === null ||
    partner.status !== "active" ||
    domain === null ||
    domain.partnerId !== claims.partnerId ||
    domain.status !== "active" ||
    domain.setupState !== "connected"
  ) {
    accountUnavailable();
  }

  const team = await ctx.db.get(organization.teamId);
  if (team === null || team.type !== "organizational" || !team.workosOrgId) {
    accountUnavailable();
  }
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", team._id),
    )
    .unique();
  if (membership === null) accountUnavailable();
  return { kind: "partner", user, account, organization, partner, domain, team };
}

export async function getEntitlementScope(ctx: DbCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) throw new Error("Not authenticated");
  return await resolveEntitlementScope(ctx, identity);
}

export async function getPartnerOrganizationForOrgId(
  ctx: DbCtx,
  orgId: string,
) {
  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
    .unique();
  if (team === null) return null;
  const organization = await ctx.db
    .query("whiteLabelPartnerOrganizations")
    .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
    .unique();
  return organization;
}
