import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getMonthlyCredits,
  getPurchasedCredits,
  getTotalCreditBalance,
  type CreditEntity,
} from "./creditBalance";

export const creditLogEventTypeValidator = v.union(
  v.literal("monthly_reset"),
  v.literal("usage"),
  v.literal("top_up"),
  v.literal("grant"),
  v.literal("adjustment"),
);

export type CreditLogEventType =
  | "monthly_reset"
  | "usage"
  | "top_up"
  | "grant"
  | "adjustment";

export const creditLogLegacyTypeValidator = v.union(
  v.literal("deduction"),
  v.literal("top_up"),
  v.literal("grant"),
);

export type CreditLogInsert = {
  orgId: string;
  userId?: Id<"users">;
  eventType: CreditLogEventType;
  label: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  monthlyCreditsBefore: number;
  monthlyCreditsAfter: number;
  purchasedCreditsBefore: number;
  purchasedCreditsAfter: number;
  creditCost?: number;
  modelId?: string;
  agentId?: Id<"agents">;
  agentName?: string;
  conversationId?: Id<"conversations">;
  reason?: string;
  stripePaymentIntentId?: string;
  creditPeriodId?: Id<"creditPeriods">;
  topUpEntryId?: Id<"topUpEntries">;
  deductionSource?: "monthly" | "top_up";
};

function legacyTypeForEvent(eventType: CreditLogEventType) {
  switch (eventType) {
    case "usage":
      return "deduction" as const;
    case "top_up":
      return "top_up" as const;
    case "monthly_reset":
    case "grant":
      return "grant" as const;
    case "adjustment":
      return "deduction" as const;
  }
}

export function snapshotCreditBalances(entity: CreditEntity) {
  return {
    monthlyCreditsBefore: getMonthlyCredits(entity),
    purchasedCreditsBefore: getPurchasedCredits(entity),
    balanceBefore: getTotalCreditBalance(entity),
  };
}

export function buildUsageLabel(agentName?: string | null) {
  if (agentName?.trim()) {
    return `Usage by "${agentName.trim()}"`;
  }
  return 'Usage by "Unassigned"';
}

export function buildTopUpLabel(credits: number) {
  return `Top-up (+${credits.toLocaleString()} credits)`;
}

export async function sumTopUpGrants(
  ctx: Pick<QueryCtx, "db">,
  scope: { orgId: string; userId?: Id<"users"> },
): Promise<number> {
  const entries =
    scope.orgId !== ""
      ? await ctx.db
          .query("topUpEntries")
          .withIndex("by_orgId", (q) => q.eq("orgId", scope.orgId))
          .collect()
      : scope.userId
        ? await ctx.db
            .query("topUpEntries")
            .withIndex("by_userId", (q) => q.eq("userId", scope.userId!))
            .collect()
        : [];

  if (entries.length > 0) {
    return entries.reduce((sum, entry) => sum + entry.amount, 0);
  }

  const logs =
    scope.orgId !== ""
      ? await ctx.db
          .query("creditLogs")
          .withIndex("by_orgId", (q) => q.eq("orgId", scope.orgId))
          .collect()
      : scope.userId
        ? await ctx.db
            .query("creditLogs")
            .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", scope.userId!))
            .collect()
        : [];

  return logs
    .filter((log) => log.eventType === "top_up" || log.type === "top_up")
    .reduce((sum, log) => sum + Math.max(0, log.amount), 0);
}

export async function insertCreditLog(
  ctx: MutationCtx,
  entry: CreditLogInsert,
) {
  const createdAt = Date.now();
  const creditLogId = await ctx.db.insert("creditLogs", {
    orgId: entry.orgId,
    userId: entry.userId,
    type: legacyTypeForEvent(entry.eventType),
    eventType: entry.eventType,
    label: entry.label,
    amount: entry.amount,
    balanceBefore: entry.balanceBefore,
    balanceAfter: entry.balanceAfter,
    monthlyCreditsBefore: entry.monthlyCreditsBefore,
    monthlyCreditsAfter: entry.monthlyCreditsAfter,
    purchasedCreditsBefore: entry.purchasedCreditsBefore,
    purchasedCreditsAfter: entry.purchasedCreditsAfter,
    creditCost: entry.creditCost,
    modelId: entry.modelId,
    agentId: entry.agentId,
    agentName: entry.agentName,
    conversationId: entry.conversationId,
    reason: entry.reason,
    stripePaymentIntentId: entry.stripePaymentIntentId,
    creditPeriodId: entry.creditPeriodId,
    topUpEntryId: entry.topUpEntryId,
    deductionSource: entry.deductionSource,
    createdAt,
  });

  if (entry.eventType === "usage" && entry.userId) {
    const credits = entry.creditCost ?? Math.abs(entry.amount);
    if (credits > 0) {
      const existing = await ctx.db
        .query("creditUsageEvents")
        .withIndex("by_creditLogId", (q) => q.eq("creditLogId", creditLogId))
        .unique();
      if (!existing) {
        await ctx.db.insert("creditUsageEvents", {
          userId: entry.userId,
          agentId: entry.agentId,
          modelId: entry.modelId,
          credits,
          conversationId: entry.conversationId,
          creditLogId,
          createdAt,
        });
      }
    }
  }
}

export function formatCreditLogLabel(log: Doc<"creditLogs">): string {
  if (log.label) {
    return log.label;
  }
  if (log.eventType === "usage" && log.agentName) {
    return buildUsageLabel(log.agentName);
  }
  if (log.reason) {
    return log.reason;
  }
  switch (log.type) {
    case "top_up":
      return "Top-up";
    case "deduction":
      return "Credit usage";
    default:
      return "Credit update";
  }
}

export function formatCreditLogEventType(log: Doc<"creditLogs">): CreditLogEventType {
  if (log.eventType) {
    return log.eventType;
  }
  if (log.type === "top_up") {
    return "top_up";
  }
  if (log.type === "deduction") {
    return "usage";
  }
  if (log.reason?.toLowerCase().includes("reset")) {
    return "monthly_reset";
  }
  return "grant";
}
