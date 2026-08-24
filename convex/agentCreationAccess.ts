import type { MutationCtx, QueryCtx } from "./_generated/server";
import { PERSONAL_ORG_FALLBACK } from "./authUtils";
import { isEnabledModel } from "./llm/modelPricing";

export async function assertEnabledAgentModel(modelId: string) {
  if (!isEnabledModel(modelId)) throw new Error("Selected model is not available");
}

export async function listAgentsForCreationContext(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string | null,
) {
  const normalizedOrgId = !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  if (!orgId || orgId === "personal") {
    return await ctx.db
      .query("agents")
      .withIndex("by_userId_and_orgId", (q) => q.eq("userId", userId).eq("orgId", normalizedOrgId))
      .collect();
  }
  return await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", normalizedOrgId))
    .collect();
}
