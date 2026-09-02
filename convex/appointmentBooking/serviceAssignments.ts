import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { resolveTeamForAgent } from "./access";

export async function listTeamWorkosUserIds(
  ctx: MutationCtx,
  agent: Doc<"agents">,
) {
  const team = await resolveTeamForAgent(ctx, agent);
  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
    .take(100);
  const users = await Promise.all(memberships.map((membership) => ctx.db.get(membership.userId)));
  return [...new Set(users.flatMap((user) => user === null ? [] : [user.workosUserId]))];
}

export async function appendTeammateToAgentServices(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  workosUserId: string,
) {
  const services = await ctx.db
    .query("appointmentServices")
    .withIndex("by_agentId_and_sortOrder", (q) => q.eq("agentId", agentId))
    .take(100);
  const now = Date.now();
  for (const service of services) {
    if (service.archivedAt !== undefined || service.assignedWorkosUserIds === undefined) continue;
    if (service.autoAssignNewMembers === false) continue;
    if (service.assignedWorkosUserIds.includes(workosUserId)) continue;
    await ctx.db.patch(service._id, {
      assignedWorkosUserIds: [...service.assignedWorkosUserIds, workosUserId],
      updatedAt: now,
    });
  }
}
