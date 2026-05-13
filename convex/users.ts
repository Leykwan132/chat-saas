import { query } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import type { Doc } from "./_generated/dataModel";

/** Debug / introspection: Convex auth identity (WorkOS JWT claims) for the current socket. */
export const getAuthUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity;
  },
});

// Returns the user docs for everyone in the caller's active organization.
// Resolves `organizations.members` to the corresponding `users` rows. Members
// missing a row (e.g. webhook race) are skipped instead of erroring.
export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    if (org === null) return [];

    const adminSet = new Set<string>(org.admins.map((id: string) => id));
    const users: Array<Doc<"users"> & { isAdmin: boolean }> = [];
    for (const memberId of org.members) {
      const user = await ctx.db.get(memberId);
      if (user === null) continue;
      users.push({ ...user, isAdmin: adminSet.has(memberId) });
    }
    return users;
  },
});
