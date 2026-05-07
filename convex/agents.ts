import { v } from "convex/values";
import { mutation, query, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";

const DEFAULT_MODEL = "gemini-2.5-flash";

const templateKeyValidator = v.union(
  v.literal("blank"),
  v.literal("sales"),
  v.literal("support"),
);

const orgIdValidator = v.union(v.string(), v.null());

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

async function getOwnedAgent(ctx: QueryCtx | MutationCtx, agentId: Id<"agents">) {
  const { userId } = await getAuthContext(ctx);

  const agent = await ctx.db.get(agentId);
  if (agent === null || agent.userId !== userId) {
    return null;
  }

  return agent;
}

export const list = query({
  args: {
    orgId: orgIdValidator,
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx, args.orgId);

    return await ctx.db
      .query("agents")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", userId).eq("orgId", orgId),
      )
      .order("desc")
      .take(50);
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

export const create = mutation({
  args: {
    name: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    templateKey: templateKeyValidator,
    websiteUrls: v.optional(v.array(v.string())),
    contacts: v.optional(v.string()),
    orgId: orgIdValidator,
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx, args.orgId);
    const now = Date.now();
    const name = args.name.trim();

    if (!name) {
      throw new Error("Agent name is required");
    }

    const agentId = await ctx.db.insert("agents", {
      name,
      provider: "google",
      model: args.model?.trim() || DEFAULT_MODEL,
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
    const agent = await getOwnedAgent(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

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
    const agent = await getOwnedAgent(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    await ctx.db.delete(args.agentId);
    return args.agentId;
  },
});
