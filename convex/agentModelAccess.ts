import { DEFAULT_AGENT_MODEL } from "../shared/agentModelDefaults";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { assertEnabledAgentModel } from "./agentCreationAccess";
import { isEnabledModel } from "./llm/modelPricing";
import type { PlanKey } from "./planCatalog";
import { checkModelAccess } from "./plans";
import { getAssignedPartnerAgentModel } from "./whiteLabel/planResolver";

type DbCtx = QueryCtx | MutationCtx;

type Session = { plan: PlanKey; isPartnerManaged: boolean };

export async function resolveAgentWriteModel(
  ctx: DbCtx,
  session: Session,
  options: { requestedModel?: string; currentModel?: string } = {},
) {
  if (session.isPartnerManaged) {
    const assigned = await getAssignedPartnerAgentModel(ctx, session);
    const model = assigned ?? options.currentModel ?? DEFAULT_AGENT_MODEL;
    await assertEnabledAgentModel(model);
    return model;
  }

  const model = (options.requestedModel ?? DEFAULT_AGENT_MODEL).trim();
  if (!model) throw new Error("Model is required");
  await assertEnabledAgentModel(model);
  if (!checkModelAccess(session.plan, model)) {
    throw new Error(
      `Your plan (${session.plan ?? "free"}) does not have access to model: ${model}`,
    );
  }
  return model;
}

export async function sessionAllowsAgentModel(
  ctx: DbCtx,
  session: Session,
  modelId: string,
) {
  if (!session.isPartnerManaged) return checkModelAccess(session.plan, modelId);
  const assigned = await getAssignedPartnerAgentModel(ctx, session);
  if (assigned !== null) return modelId === assigned;
  return isEnabledModel(modelId);
}
