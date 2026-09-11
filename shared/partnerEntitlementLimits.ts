import { DEFAULT_AGENT_MODEL } from "./agentModelDefaults";
import { PLAN_CATALOG, type PlanKey } from "./planCatalog";

export function parsePartnerLimit(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive whole number.`);
  }
  return value;
}

export function catalogMaxAgents(planKey: PlanKey) {
  const maxAgents = PLAN_CATALOG[planKey].maxAgents;
  if (maxAgents === "unlimited") {
    throw new Error(`${PLAN_CATALOG[planKey].name} does not have a numeric agent limit.`);
  }
  return maxAgents;
}

export function resolvePartnerMaxAgents(
  planKey: PlanKey,
  maxAgents: number | undefined,
) {
  return maxAgents ?? PLAN_CATALOG[planKey].maxAgents;
}

export function resolvePartnerMonthlyCredits(
  planKey: PlanKey,
  monthlyCredits: number | undefined,
) {
  return monthlyCredits ?? PLAN_CATALOG[planKey].monthlyCredits;
}

export function resolvePartnerAgentModel(modelId: string | undefined) {
  return modelId ?? DEFAULT_AGENT_MODEL;
}
