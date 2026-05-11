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

// Returns every organization the signed-in user is a member of. Powers the
// org switcher on the Account → Organisations page.
//
// Implementation note: the `organizations` table tracks membership in a
// `members` array column rather than a join table, so there is no index we
// can hit by `userId`. Org count per user is small (single digits in most
// SaaS apps), so a full scan filtered by `members.includes(userId)` is fine
// here — if it ever becomes hot, we'll add a `memberships` join table with
// `by_userId` + `by_orgId` indexes.
export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId, orgId: activeWorkosOrgId } = await getAuthContext(ctx);

    const userRow = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (userRow === null) return [];

    const orgs = await ctx.db.query("organizations").collect();
    return orgs
      .filter((org) => org.members.includes(userRow._id))
      .map((org) => ({
        _id: org._id,
        workosOrgId: org.workosOrgId,
        name: org.name,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        memberCount: org.members.length,
        isAdmin: org.admins.includes(userRow._id),
        isActive: org.workosOrgId === activeWorkosOrgId,
      }))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  },
});
