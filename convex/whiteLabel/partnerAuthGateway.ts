import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";

type PartnerAuthSurface = {
  kind: "partner";
  hostname: string;
  partnerId: Id<"whiteLabelPartners">;
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
};

type PartnerAuthBrand = {
  hostname: string;
  partnerName: string;
  logoStorageId: Id<"_storage"> | null;
};

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase();
}

async function getConnectedPartnerDomain(ctx: QueryCtx, hostname: string) {
  const domain = await ctx.db
    .query("whiteLabelPartnerDomains")
    .withIndex("by_hostname", (q) => q.eq("hostname", normalizeHostname(hostname)))
    .unique();
  if (domain === null || domain.status !== "active" || domain.setupState !== "connected") {
    return null;
  }

  const partner = await ctx.db.get(domain.partnerId);
  if (partner === null || partner.status !== "active") return null;
  return { domain, partner };
}

export async function resolvePartnerBrandForHostname(
  ctx: QueryCtx,
  hostname: string,
): Promise<PartnerAuthBrand | null> {
  const connectedDomain = await getConnectedPartnerDomain(ctx, hostname);
  if (connectedDomain === null) return null;
  return {
    hostname: connectedDomain.domain.hostname,
    partnerName: connectedDomain.partner.name,
    logoStorageId: connectedDomain.partner.logoStorageId ?? null,
  };
}

export async function resolvePartnerSurfaceForWorkosUser(
  ctx: QueryCtx,
  workosUserId: string,
  hostname: string,
): Promise<PartnerAuthSurface | null> {
  const connectedDomain = await getConnectedPartnerDomain(ctx, hostname);
  if (connectedDomain === null) return null;

  const accounts = ctx.db
    .query("whiteLabelPartnerOrganizationAccounts")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId));
  for await (const account of accounts) {
    if (account.status !== "active") continue;
    const organization = await ctx.db.get(account.partnerOrganizationId);
    if (
      organization !== null &&
      organization.status === "active" &&
      organization.partnerId === connectedDomain.partner._id
    ) {
      return {
        kind: "partner",
        hostname: connectedDomain.domain.hostname,
        partnerId: connectedDomain.partner._id,
        partnerOrganizationId: organization._id,
      };
    }
  }
  return null;
}

export const getBrandingForHostname = query({
  args: { hostname: v.string() },
  handler: async (ctx, args) => {
    return await resolvePartnerBrandForHostname(ctx, args.hostname);
  },
});

export const getCurrentPartnerSurface = query({
  args: { hostname: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return null;
    return await resolvePartnerSurfaceForWorkosUser(
      ctx,
      identity.subject,
      args.hostname,
    );
  },
});
