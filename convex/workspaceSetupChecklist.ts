import { v } from "convex/values";
import { getOwnedAgentForAuth } from "./agentAccess";
import { getAuthContext, type AuthContext } from "./authUtils";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { MediaUploadPurpose } from "../shared/mediaUploadPurpose";

const TOTAL_STEP_COUNT = 5;

type DbCtx = QueryCtx | MutationCtx;
type SetupChecklistStepKey =
  | "createAgent"
  | "uploadKnowledgeBase"
  | "testAgent"
  | "createWorkflow"
  | "connectChannel";

async function getChecklistState(ctx: DbCtx, auth: AuthContext) {
  return await ctx.db
    .query("workspaceSetupChecklistStates")
    .withIndex("by_userId_and_orgId", (q) =>
      q.eq("userId", auth.userDbId).eq("orgId", auth.orgId),
    )
    .unique();
}

async function listWorkspaceAgents(ctx: DbCtx, auth: AuthContext) {
  if (auth.orgId === "") {
    return await ctx.db
      .query("agents")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", auth.userId).eq("orgId", auth.orgId),
      )
      .order("desc")
      .take(50);
  }

  return await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
    .order("desc")
    .take(50);
}

async function resolveSelectedAgent(
  ctx: DbCtx,
  auth: AuthContext,
  agents: Doc<"agents">[],
  agentId?: Id<"agents">,
) {
  if (agentId !== undefined) {
    const agent = await getOwnedAgentForAuth(ctx, auth, agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }
    return agent;
  }
  return agents.length === 1 ? agents[0] : null;
}

async function hasKnowledgeBaseContent(ctx: DbCtx, agentId: Id<"agents">) {
  const textEntry = await ctx.db
    .query("textEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
  if (textEntry !== null) return true;

  const fileEntry = await ctx.db
    .query("fileEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
  if (fileEntry !== null) return true;

  const webEntry = await ctx.db
    .query("webEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
  if (webEntry !== null) return true;

  const qaEntry = await ctx.db
    .query("qaEntries")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
  if (qaEntry !== null) return true;

  const mediaUploads = await ctx.db
    .query("mediaUploads")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(20);
  return mediaUploads.some(
    (row) => row.purpose === MediaUploadPurpose.KnowledgeBase && row.status === "ready",
  );
}

async function hasTestedAgent(ctx: DbCtx, auth: AuthContext, agentId: Id<"agents">) {
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_service_and_assignedAgentId_and_assignedUserId", (q) =>
      q
        .eq("orgId", auth.orgId)
        .eq("service", "playground")
        .eq("assignedAgentId", agentId)
        .eq("assignedUserId", auth.userId),
    )
    .order("desc")
    .take(10);

  for (const conversation of conversations) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .order("desc")
      .take(20);
    if (
      messages.some(
        (message) =>
          message.service === "playground" &&
          message.direction === "outgoing" &&
          message.agentId === agentId &&
          message.status === "sent",
      )
    ) {
      return true;
    }
  }

  return false;
}

async function hasCustomizedWorkflow(ctx: DbCtx, agentId: Id<"agents">) {
  const workflow = await ctx.db
    .query("workflows")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .unique();
  if (workflow === null) return false;

  const nodes = await ctx.db
    .query("workflowNodes")
    .withIndex("by_workflowId", (q) => q.eq("workflowId", workflow._id))
    .take(2);
  return nodes.length > 1;
}

async function hasConnectedChannel(ctx: DbCtx, auth: AuthContext, agentId: Id<"agents">) {
  const widgetSettings = await ctx.db
    .query("webWidgetSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .first();
  if (widgetSettings?.enabled === true) return true;

  const channels = await ctx.db
    .query("channels")
    .withIndex("by_orgId_and_service", (q) => q.eq("orgId", auth.orgId))
    .take(100);
  return channels.some(
    (channel) =>
      channel.status === "connected" && channel.defaultAgentId === agentId,
  );
}

async function buildSteps(
  ctx: DbCtx,
  auth: AuthContext,
  selectedAgent: Doc<"agents"> | null,
  agentCreated: boolean,
) {
  const agentId = selectedAgent?._id;
  const stepState: Record<SetupChecklistStepKey, boolean> = {
    createAgent: agentCreated,
    uploadKnowledgeBase: agentId ? await hasKnowledgeBaseContent(ctx, agentId) : false,
    testAgent: agentId ? await hasTestedAgent(ctx, auth, agentId) : false,
    createWorkflow: agentId ? await hasCustomizedWorkflow(ctx, agentId) : false,
    connectChannel: agentId ? await hasConnectedChannel(ctx, auth, agentId) : false,
  };

  return (Object.entries(stepState) as [SetupChecklistStepKey, boolean][]).map(
    ([key, completed]) => ({ key, completed }),
  );
}

async function upsertChecklistState(ctx: MutationCtx, auth: AuthContext, patch: {
  introShownAt?: number;
  completedAt?: number;
}) {
  const now = Date.now();
  const state = await getChecklistState(ctx, auth);
  if (state === null) {
    await ctx.db.insert("workspaceSetupChecklistStates", {
      userId: auth.userDbId,
      orgId: auth.orgId,
      ...patch,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }
  await ctx.db.patch(state._id, { ...patch, updatedAt: now });
}

export const getWorkspaceSetupChecklist = query({
  args: {
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const state = await getChecklistState(ctx, auth);
    const agents = await listWorkspaceAgents(ctx, auth);
    const selectedAgent = await resolveSelectedAgent(ctx, auth, agents, args.agentId);
    const steps = await buildSteps(ctx, auth, selectedAgent, agents.length > 0);
    const completedCount = steps.filter((step) => step.completed).length;
    const visible = state?.completedAt === undefined;

    return {
      visible,
      shouldShowIntro: visible && state?.introShownAt === undefined,
      completedCount,
      totalCount: TOTAL_STEP_COUNT,
      progress: Math.round((completedCount / TOTAL_STEP_COUNT) * 100),
      selectedAgentId: selectedAgent?._id,
      agents: agents.map((agent) => ({ _id: agent._id, name: agent.name })),
      steps,
    };
  },
});

export const recordWorkspaceSetupChecklistIntroShown = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const state = await getChecklistState(ctx, auth);
    if (state?.introShownAt !== undefined) {
      return null;
    }
    await upsertChecklistState(ctx, auth, { introShownAt: Date.now() });
    return null;
  },
});

export const completeWorkspaceSetupChecklist = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    await upsertChecklistState(ctx, auth, { completedAt: Date.now() });
    return null;
  },
});
