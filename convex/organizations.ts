import { query } from "./_generated/server";
import { getAuthContext } from "./authUtils";

// Returns the caller's active organization (with members + admins arrays of
// users-table IDs). Returns null when the caller has no active organization
// in their JWT (e.g. signed in but not a member of any WorkOS org yet).
export const getOrganization = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal") return null;
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    return org;
  },
});
