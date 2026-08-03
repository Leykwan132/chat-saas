import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { isAgentInAuthScope } from "./webWidgetCore";

export async function getAuthorizedWebWidgetAgent(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
) {
  const { orgId, userId } = await getAuthContext(ctx);
  const channelOrgId = resolveChannelOrgId(orgId, userId);
  const agent = await ctx.db.get(agentId);
  if (agent === null || !isAgentInAuthScope(agent, { channelOrgId, userId })) {
    throw new Error("Agent not found");
  }
  return { orgId, userId, channelOrgId, agent };
}

export async function getWebWidgetSettingsForAgent(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
) {
  return await ctx.db
    .query("webWidgetSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
}

export async function getConnectedWhatsAppForAgent(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
): Promise<Doc<"channels"> | null> {
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_defaultAgentId_and_service", (q) =>
      q.eq("defaultAgentId", agentId).eq("service", "whatsapp"),
    )
    .take(50);
  return channels.find((channel) => channel.status === "connected") ?? null;
}
