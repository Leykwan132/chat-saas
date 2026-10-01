import type { MutationCtx } from "../_generated/server";
import { getPartnerOrganizationForOrgId } from "../entitlementScope";

function appBaseUrl(): string {
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("APP_BASE_URL is not configured");
  return baseUrl;
}

export async function dashboardOrigin(ctx: MutationCtx, orgId: string): Promise<string> {
  const fallback = appBaseUrl();
  if (!orgId) return fallback;
  const organization = await getPartnerOrganizationForOrgId(ctx, orgId);
  if (organization === null || organization.status !== "active") return fallback;
  const domains = await ctx.db
    .query("whiteLabelPartnerDomains")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", organization.partnerId))
    .take(5);
  const connected = domains.find(
    (domain) => domain.status === "active" && domain.setupState === "connected",
  );
  if (!connected) return fallback;
  return `https://${connected.hostname}`;
}
