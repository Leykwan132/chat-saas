import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { getAuthContext } from "./authUtils";
import { getModelPricing } from "./llm/modelPricing";

export function getDefaultUserCredits(): number {
  const raw = process.env.DEFAULT_USER_CREDITS?.trim();
  if (!raw) return 500;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 500;
  return parsed;
}

export function isPlaygroundCreditsEnabled(): boolean {
  const raw = process.env.PLAYGROUND_DEDUCT_CREDITS?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

async function getUserByWorkosId(
  ctx: QueryCtx | MutationCtx,
  workosUserId: string,
) {
  return await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
}

export const isPlaygroundDeductEnabled = query({
  args: {},
  handler: async () => {
    return isPlaygroundCreditsEnabled();
  },
});

export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getAuthContext(ctx);
    const user = await getUserByWorkosId(ctx, userId);
    if (user === null) {
      return null;
    }
    return { credits: user.credits };
  },
});

export const internalCheckCredits = internalQuery({
  args: {
    workosUserId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const pricing = getModelPricing(args.modelId);
    if (pricing === null) {
      return { ok: false as const, reason: "model_disabled" as const };
    }

    const user = await getUserByWorkosId(ctx, args.workosUserId);
    if (user === null) {
      return { ok: false as const, reason: "user_not_found" as const };
    }

    const balance = user.credits ?? 0;
    const cost = pricing.creditCost;
    if (balance < cost) {
      return {
        ok: false as const,
        reason: "insufficient_credits" as const,
        balance,
        cost,
      };
    }

    return { ok: true as const, balance, cost };
  },
});

export const internalDeductCredits = internalMutation({
  args: {
    workosUserId: v.string(),
    modelId: v.string(),
    skipDeduction: v.optional(v.boolean()),
    conversationId: v.optional(v.id("conversations")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pricing = getModelPricing(args.modelId);
    if (pricing === null) {
      throw new Error("Model is not available");
    }

    const user = await getUserByWorkosId(ctx, args.workosUserId);
    if (user === null) {
      throw new Error("User not found");
    }

    const balance = user.credits ?? 0;
    const skipDeduction = args.skipDeduction ?? false;
    const creditsCharged = skipDeduction ? 0 : pricing.creditCost;

    if (!skipDeduction) {
      if (balance < pricing.creditCost) {
        throw new Error("Insufficient credits");
      }
      await ctx.db.patch(user._id, {
        credits: balance - pricing.creditCost,
        updatedAt: Date.now(),
      });

      if (creditsCharged > 0) {
        await ctx.db.insert("creditLogs", {
          userId: user._id,
          amount: -creditsCharged,
          type: "deduction",
          balanceBefore: balance,
          balanceAfter: balance - creditsCharged,
          modelId: args.modelId,
          conversationId: args.conversationId,
          reason: args.reason ?? `AI reply using ${args.modelId}`,
          createdAt: Date.now(),
        });
      }
    }

    return {
      llmModel: args.modelId,
      creditsCharged,
      balanceAfter: skipDeduction ? balance : balance - pricing.creditCost,
    };
  },
});

export const topUp = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getAuthContext(ctx);
    const user = await getUserByWorkosId(ctx, userId);
    if (user === null) {
      throw new Error("User not found");
    }
    const currentCredits = user.credits ?? 0;
    const newCredits = currentCredits + 500;
    await ctx.db.patch(user._id, {
      credits: newCredits,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("creditLogs", {
      userId: user._id,
      amount: 500,
      type: "top_up",
      balanceBefore: currentCredits,
      balanceAfter: newCredits,
      reason: "User topped up credits",
      createdAt: Date.now(),
    });

    return { success: true, newCredits };
  },
});
