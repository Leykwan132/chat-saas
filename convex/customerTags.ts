import { v } from "convex/values";
import { query, type MutationCtx } from "./_generated/server";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";

const reservedLeadTemperatureTags = new Set(["hot", "warm", "cold"]);

export function isCustomerTagCatalogEligible(tag: string) {
  return tag.length > 0 && !reservedLeadTemperatureTags.has(tag.toLowerCase());
}

export function customerTagWorkspaceKey(orgId: string, userId?: string) {
  if (orgId) return `organization:${orgId}`;
  if (userId === undefined) throw new Error("Personal customer tags require an owner");
  return `personal:${userId}`;
}

export async function ensureCustomerTags(
  db: MutationCtx["db"],
  workspaceKey: string,
  tags: readonly string[],
) {
  for (const tag of new Set(tags.filter(isCustomerTagCatalogEligible))) {
    const existing = await db
      .query("customerTags")
      .withIndex("by_workspaceKey_and_tag", (q) =>
        q.eq("workspaceKey", workspaceKey).eq("tag", tag),
      )
      .unique();
    if (existing === null) {
      await db.insert("customerTags", { workspaceKey, tag });
    }
  }
}

export const listForCurrentOrg = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const workspaceKey = customerTagWorkspaceKey(resolvedOrgId, userId);
    const rows = await ctx.db
      .query("customerTags")
      .withIndex("by_workspaceKey_and_tag", (q) => q.eq("workspaceKey", workspaceKey))
      .take(250);
    return rows.map((row) => row.tag);
  },
});
