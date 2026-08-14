import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { PERSONAL_ORG_FALLBACK } from "../authUtils";
import { ensureUserScheduleForAgent } from "./schedules";
import { appendTeammateToAgentServices } from "../appointmentBooking/serviceAssignments";

function isTeamOrgId(orgId: string) {
  return orgId !== "personal" && orgId !== PERSONAL_ORG_FALLBACK;
}

export async function provisionMemberSchedulesForOrg(
  ctx: MutationCtx,
  workosOrgId: string,
  workosUserId: string,
) {
  if (!isTeamOrgId(workosOrgId)) return;

  const agents = await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", workosOrgId))
    .take(100);

  for (const agent of agents) {
    await ensureUserScheduleForAgent(ctx, {
      agentId: agent._id,
      workosUserId,
      enabled: true,
    });
    await appendTeammateToAgentServices(ctx, agent._id, workosUserId);
  }
}

/** When a new agent is created, give every org member a default schedule on that agent. */
export async function provisionOrgMemberSchedulesForAgent(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  workosOrgId: string,
) {
  if (!isTeamOrgId(workosOrgId)) return;

  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
    .unique();
  if (team === null) return;

  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
    .take(100);

  for (const membership of memberships) {
    const user = await ctx.db.get(membership.userId);
    if (user === null) continue;
    await ensureUserScheduleForAgent(ctx, {
      agentId,
      workosUserId: user.workosUserId,
      enabled: true,
    });
  }
}
