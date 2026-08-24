import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthContext } from "../authUtils";

export async function assertScheduleOrgMember(
  ctx: QueryCtx | MutationCtx,
  workosUserId: string,
) {
  const { orgId } = await getAuthContext(ctx);
  if (!orgId || orgId === "personal") throw new Error("Organization required");
  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
    .unique();
  if (team === null) throw new Error("Team not found");
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  if (user === null) throw new Error("User not found");
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) => q.eq("userId", user._id).eq("teamId", team._id))
    .unique();
  if (membership === null) throw new Error("User is not a member of this team");
}
