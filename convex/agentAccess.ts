import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  getAuthContext,
  PERSONAL_ORG_FALLBACK,
  type AuthContext,
} from "./authUtils";
import { Permission } from "../shared/permissions";

type DbCtx = QueryCtx | MutationCtx;

export function normalizeAgentOrgId(orgId: string | null | undefined) {
  return !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
}

function isPersonalOrg(orgId: string | null | undefined) {
  return normalizeAgentOrgId(orgId) === PERSONAL_ORG_FALLBACK;
}

export function assertCanCreateAgent(auth: AuthContext) {
  if (
    !isPersonalOrg(auth.orgId) &&
    !auth.permissions.includes(Permission.AGENTS_CREATE)
  ) {
    throw new Error("You do not have permission to create agents in this workspace.");
  }
}

export function assertCanManageAgent(auth: AuthContext) {
  if (
    !isPersonalOrg(auth.orgId) &&
    !auth.permissions.includes(Permission.AGENTS_MANAGE)
  ) {
    throw new Error("You do not have permission to modify agents in this workspace.");
  }
}

export async function getOwnedAgentForAuth(
  ctx: DbCtx,
  auth: AuthContext,
  agentId: Id<"agents">,
) {
  const agent = await ctx.db.get(agentId);
  if (agent === null) {
    return null;
  }

  const agentOrgId = normalizeAgentOrgId(agent.orgId);
  const authOrgId = normalizeAgentOrgId(auth.orgId);

  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    return agentOrgId === authOrgId ? agent : null;
  }

  return agent.userId === auth.userId ? agent : null;
}

export async function getOwnedAgent(ctx: DbCtx, agentId: Id<"agents">) {
  const auth = await getAuthContext(ctx);
  return await getOwnedAgentForAuth(ctx, auth, agentId);
}

export async function assertManageableAgent(
  ctx: DbCtx,
  agentId: Id<"agents">,
): Promise<{ auth: AuthContext; agent: Doc<"agents"> }> {
  const auth = await getAuthContext(ctx);
  assertCanManageAgent(auth);

  const agent = await getOwnedAgentForAuth(ctx, auth, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }

  return { auth, agent };
}
