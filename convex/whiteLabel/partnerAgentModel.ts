import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getModelProvider, isEnabledModel } from "../llm/modelPricing";

export function parsePartnerAgentModel(modelId: string) {
  const value = modelId.trim();
  if (!isEnabledModel(value)) {
    throw new Error("Selected model is not available");
  }
  return value;
}

export async function applyAssignedModelToOrganizationAgents(
  ctx: MutationCtx,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
  modelId: string,
) {
  const organization = await ctx.db.get(partnerOrganizationId);
  if (organization === null) throw new Error("Customer organization not found.");
  const team = await ctx.db.get(organization.teamId);
  const workosOrgId = team?.workosOrgId;
  if (workosOrgId === undefined) {
    throw new Error("Customer organization team not found.");
  }
  const now = Date.now();
  const provider = getModelProvider(modelId);
  const agents = await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", workosOrgId))
    .take(100);
  for (const agent of agents) {
    if (agent.model === modelId) continue;
    await ctx.db.patch(agent._id, { model: modelId, provider, updatedAt: now });
  }
}
