import { v } from "convex/values";
import { mutation, query, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext, PERSONAL_ORG_FALLBACK } from "./authUtils";
import { DEFAULT_OPENROUTER_MODEL, isEnabledModel } from "./llm/modelPricing";
import { checkModelAccess, checkAgentCreationLimit, getPlanFromStripe, getPlan } from "./plans";

const DEFAULT_MODEL = DEFAULT_OPENROUTER_MODEL;

const templateKeyValidator = v.union(
  v.literal("blank"),
  v.literal("sales"),
  v.literal("support"),
);

const TEMPLATE_PROMPTS = {
  blank: "You are a helpful AI agent. Answer clearly, ask concise follow-up questions when needed, and stay aligned with the business context provided by the user.",
  sales: "You are a sales AI agent. Qualify leads, understand customer needs, explain value clearly, handle objections with empathy, and guide prospects toward the next best action.",
  support: "You are a support AI agent. Resolve customer issues patiently, ask for missing details, explain steps clearly, and escalate when a request requires a human teammate.",
} as const;

function getPrompt(templateKey: keyof typeof TEMPLATE_PROMPTS, systemPrompt: string | null) {
  const trimmedPrompt = systemPrompt?.trim();
  if (trimmedPrompt) {
    return trimmedPrompt;
  }
  return TEMPLATE_PROMPTS[templateKey];
}

async function assertEnabledModel(modelId: string) {
  if (!isEnabledModel(modelId)) {
    throw new Error("Selected model is not available");
  }
}

async function getOwnedAgent(ctx: QueryCtx | MutationCtx, agentId: Id<"agents">) {
  const { userId, orgId } = await getAuthContext(ctx);

  const agent = await ctx.db.get(agentId);
  if (agent === null) {
    return null;
  }

  const normalizedOrgId =
    !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  const agentOrgId =
    !agent.orgId || agent.orgId === "personal" ? PERSONAL_ORG_FALLBACK : agent.orgId;

  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    if (agentOrgId === normalizedOrgId) {
      return agent;
    }
    return null;
  }

  if (agent.userId !== userId) {
    return null;
  }

  return agent;
}

async function listAgentsForContext(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string | null,
) {
  const normalizedOrgId =
    !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;

  if (!orgId || orgId === "personal") {
    return await ctx.db
      .query("agents")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", userId).eq("orgId", normalizedOrgId),
      )
      .collect();
  }

  return await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", normalizedOrgId))
    .collect();
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId, orgId } = await getAuthContext(ctx);

    if (!orgId || orgId === "personal") {
      return await ctx.db
        .query("agents")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", userId).eq("orgId", orgId),
        )
        .order("desc")
        .take(50);
    } else {
      return await ctx.db
        .query("agents")
        .withIndex("by_orgId", (q) =>
          q.eq("orgId", orgId),
        )
        .order("desc")
        .take(50);
    }
  },
});

export const get = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await getOwnedAgent(ctx, args.agentId);

    if (agent === null) {
      return null;
    }

    return agent;
  },
});

export const canCreate = query({
  args: {},
  handler: async (ctx) => {
    const { userId, orgId } = await getAuthContext(ctx);
    const stripeInfo = await getPlanFromStripe(ctx, userId);
    const plan = stripeInfo.plan;
    const planConfig = getPlan(plan);
    const currentAgents = await listAgentsForContext(ctx, userId, orgId);

    return {
      allowed: checkAgentCreationLimit(plan, currentAgents.length),
      plan,
      currentCount: currentAgents.length,
      maxAgents: planConfig.maxAgents,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    templateKey: templateKeyValidator,
    websiteUrls: v.optional(v.array(v.string())),
    contacts: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, orgId, permissions } = await getAuthContext(ctx);

    if (orgId && orgId !== "personal" && !permissions.includes("agents:create")) {
      throw new Error("You do not have permission to create agents in this workspace.");
    }

    const stripeInfo = await getPlanFromStripe(ctx, userId);
    const plan = stripeInfo.plan;

    const currentAgents = await listAgentsForContext(ctx, userId, orgId);

    if (!checkAgentCreationLimit(plan, currentAgents.length)) {
      throw new Error(`Your plan (${plan ?? "free"}) limit exceeded for agents.`);
    }

    const now = Date.now();
    const name = args.name.trim();

    if (!name) {
      throw new Error("Agent name is required");
    }

    const model = args.model?.trim() || DEFAULT_MODEL;
    await assertEnabledModel(model);

    if (!checkModelAccess(plan, model)) {
      throw new Error(`Your plan (${plan ?? "free"}) does not have access to model: ${model}`);
    }

    const agentId = await ctx.db.insert("agents", {
      name,
      provider: "openrouter",
      model,
      systemPrompt: getPrompt(args.templateKey, args.systemPrompt ?? null),
      templateKey: args.templateKey,
      websiteUrls: args.websiteUrls ?? [],
      contacts: args.contacts?.trim() || undefined,
      fileSize: 0,
      userId,
      orgId,
      createdAt: now,
      updatedAt: now,
    });

    return agentId;
  },
});

export const update = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    templateKey: templateKeyValidator,
    websiteUrls: v.optional(v.array(v.string())),
    contacts: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, permissions } = await getAuthContext(ctx);
    if (orgId && orgId !== "personal" && !permissions.includes("agents:manage")) {
      throw new Error("You do not have permission to modify agents in this workspace.");
    }

    const agent = await getOwnedAgent(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    const stripeInfo = await getPlanFromStripe(ctx, agent.userId);
    const plan = stripeInfo.plan;

    const name = args.name.trim();
    const model = args.model.trim();
    const systemPrompt = args.systemPrompt.trim();

    if (!name) {
      throw new Error("Agent name is required");
    }
    if (!model) {
      throw new Error("Model is required");
    }
    if (!systemPrompt) {
      throw new Error("System prompt is required");
    }

    await assertEnabledModel(model);

    if (!checkModelAccess(plan, model)) {
      throw new Error(`Your plan (${plan ?? "free"}) does not have access to model: ${model}`);
    }

    await ctx.db.patch(args.agentId, {
      name,
      model,
      systemPrompt,
      templateKey: args.templateKey,
      websiteUrls: args.websiteUrls ?? [],
      contacts: args.contacts?.trim() || undefined,
      updatedAt: Date.now(),
    });

    return args.agentId;
  },
});

export const internalGet = internalQuery({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

export const remove = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { orgId, permissions } = await getAuthContext(ctx);
    if (orgId && orgId !== "personal" && !permissions.includes("agents:manage")) {
      throw new Error("You do not have permission to delete agents in this workspace.");
    }

    const agent = await getOwnedAgent(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    await ctx.db.delete(args.agentId);
    return args.agentId;
  },
});
