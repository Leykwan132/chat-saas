import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getAuthContext, PERSONAL_ORG_FALLBACK } from "./authUtils";
import { getModelProvider, isEnabledModel } from "./llm/modelPricing";
import { checkModelAccess, checkAgentCreationLimit, getPlanFromStripe, getPlan } from "./plans";
import { provisionOrgMemberSchedulesForAgent } from "./leadRouting/provision";
import { ensureWorkflowForAgent } from "./workflowCore";
import { AGENT_PROMPT_TEMPLATES } from "../shared/agentPromptTemplates";
import { DEFAULT_AGENT_MODEL } from "../shared/agentModelDefaults";
import {
  assertCanCreateAgent,
  assertCanManageAgent,
  getOwnedAgent,
} from "./agentAccess";
import { deleteSubscriptionsForAgent } from "./telegramNotifications/subscriptionAccess";
import { mutation, query, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";

const templateKeyValidator = v.union(
  v.literal("blank"),
  v.literal("sales"),
  v.literal("productSales"),
  v.literal("support"),
);

function getPrompt(templateKey: keyof typeof AGENT_PROMPT_TEMPLATES, systemPrompt: string | null) {
  const trimmedPrompt = systemPrompt?.trim();
  if (trimmedPrompt) {
    return trimmedPrompt;
  }
  return AGENT_PROMPT_TEMPLATES[templateKey];
}

async function assertEnabledModel(modelId: string) {
  if (!isEnabledModel(modelId)) {
    throw new Error("Selected model is not available");
  }
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
    escalationEnabled: v.optional(v.boolean()),
    escalationMessage: v.optional(v.string()),
    responseLength: v.optional(v.union(v.literal("brief"), v.literal("standard"), v.literal("detailed"))),
    emojiUse: v.optional(v.union(v.literal("never"), v.literal("occasional"), v.literal("frequent"))),
    formality: v.optional(v.union(v.literal("casual"), v.literal("conversational"), v.literal("professional"))),
    humorLevel: v.optional(v.union(v.literal("none"), v.literal("light"), v.literal("playful"))),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const { userId, orgId } = auth;

    assertCanCreateAgent(auth);

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

    const model = args.model?.trim() || DEFAULT_AGENT_MODEL;
    await assertEnabledModel(model);

    if (!checkModelAccess(plan, model)) {
      throw new Error(`Your plan (${plan ?? "free"}) does not have access to model: ${model}`);
    }

    const agentId = await ctx.db.insert("agents", {
      name,
      provider: getModelProvider(model),
      model,
      systemPrompt: getPrompt(args.templateKey, args.systemPrompt ?? null),
      templateKey: args.templateKey,
      websiteUrls: args.websiteUrls ?? [],
      contacts: args.contacts?.trim() || undefined,
      fileSize: 0,
      userId,
      orgId,
      escalationEnabled: args.escalationEnabled ?? false,
      escalationMessage: args.escalationMessage,
      responseLength: args.responseLength ?? "brief",
      emojiUse: args.emojiUse ?? "occasional",
      formality: args.formality ?? "conversational",
      humorLevel: args.humorLevel ?? "light",
      createdAt: now,
      updatedAt: now,
    });

    if (orgId && orgId !== "personal") {
      await provisionOrgMemberSchedulesForAgent(ctx, agentId, orgId);
    }

    const agent = await ctx.db.get(agentId);
    if (agent === null) {
      throw new Error("Agent not found after create");
    }
    await ensureWorkflowForAgent(ctx, agent);

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
    escalationEnabled: v.optional(v.boolean()),
    escalationMessage: v.optional(v.string()),
    responseLength: v.optional(v.union(v.literal("brief"), v.literal("standard"), v.literal("detailed"))),
    emojiUse: v.optional(v.union(v.literal("never"), v.literal("occasional"), v.literal("frequent"))),
    formality: v.optional(v.union(v.literal("casual"), v.literal("conversational"), v.literal("professional"))),
    humorLevel: v.optional(v.union(v.literal("none"), v.literal("light"), v.literal("playful"))),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    assertCanManageAgent(auth);

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

    const patch: Partial<Doc<"agents">> = {
      name,
      provider: getModelProvider(model),
      model,
      systemPrompt,
      templateKey: args.templateKey,
      websiteUrls: args.websiteUrls ?? [],
      contacts: args.contacts?.trim() || undefined,
      responseLength: args.responseLength ?? "brief",
      emojiUse: args.emojiUse ?? "occasional",
      formality: args.formality ?? "conversational",
      humorLevel: args.humorLevel ?? "light",
      updatedAt: Date.now(),
    };
    if (args.escalationEnabled !== undefined) {
      patch.escalationEnabled = args.escalationEnabled;
      patch.escalationMessage = args.escalationMessage ?? undefined;
    }

    await ctx.db.patch(args.agentId, patch);

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
    const auth = await getAuthContext(ctx);
    assertCanManageAgent(auth);

    const agent = await getOwnedAgent(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    await deleteSubscriptionsForAgent(ctx, args.agentId);
    await ctx.db.delete(args.agentId);
    return args.agentId;
  },
});
