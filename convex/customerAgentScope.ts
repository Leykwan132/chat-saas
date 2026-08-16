import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthContext, PERSONAL_ORG_FALLBACK } from "./authUtils";

export async function getCustomerAgentForCurrentWorkspace(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
): Promise<Doc<"agents"> | null> {
  const { userId, orgId } = await getAuthContext(ctx);
  const agent = await ctx.db.get(agentId);
  if (agent === null) return null;

  const normalizedOrgId = !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  const agentOrgId = !agent.orgId || agent.orgId === "personal" ? PERSONAL_ORG_FALLBACK : agent.orgId;

  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    return agentOrgId === normalizedOrgId ? agent : null;
  }

  return agent.userId === userId ? agent : null;
}
