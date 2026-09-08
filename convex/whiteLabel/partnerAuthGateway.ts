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
  pageTitle: string | null;
  logoUrl: string | null;
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
    pageTitle: connectedDomain.partner.pageTitle?.trim() || null,
    logoUrl: connectedDomain.partner.logoStorageId
      ? await ctx.storage.getUrl(connectedDomain.partner.logoStorageId)
      : null,
  };
}

export async function resolvePartnerSurfaceForWorkosUser(
  ctx: QueryCtx,
  workosUserId: string,
  hostname: string,
  partnerOrganizationId?: Id<"whiteLabelPartnerOrganizations">,
): Promise<PartnerAuthSurface | null> {
  const choices = await resolvePartnerOrganizationChoices(
    ctx,
    workosUserId,
    hostname,
  );
  const selected = partnerOrganizationId === undefined
    ? choices.length === 1 ? choices[0] : null
    : choices.find((choice) => choice.id === partnerOrganizationId) ?? null;
  if (selected === null) return null;

  const connectedDomain = await getConnectedPartnerDomain(ctx, hostname);
  if (connectedDomain === null) return null;
  return {
    kind: "partner",
    hostname: connectedDomain.domain.hostname,
    partnerId: connectedDomain.partner._id,
    partnerOrganizationId: selected.id,
  };
}

export async function resolvePartnerOrganizationChoices(
  ctx: QueryCtx,
  workosUserId: string,
  hostname: string,
) {
  const connectedDomain = await getConnectedPartnerDomain(ctx, hostname);
  if (connectedDomain === null) return [];
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  if (user === null) return [];
  const choices: Array<{
    id: Id<"whiteLabelPartnerOrganizations">;
    name: string;
  }> = [];
  const accounts = ctx.db
    .query("whiteLabelPartnerOrganizationAccounts")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId));
  for await (const account of accounts) {
    if (
      account.status !== "active" ||
      account.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
    ) continue;
    const organization = await ctx.db.get(account.partnerOrganizationId);
    if (
      organization !== null &&
      organization.status === "active" &&
      organization.partnerId === connectedDomain.partner._id
    ) {
      const team = await ctx.db.get(organization.teamId);
      if (team !== null && team.type === "organizational") {
        choices.push({ id: organization._id, name: team.name });
      }
    }
  }
  return choices.sort((a, b) => a.name.localeCompare(b.name));
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
