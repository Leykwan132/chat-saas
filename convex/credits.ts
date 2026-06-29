import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { getAuthContext } from "./authUtils";
import { getModelPricing } from "./llm/modelPricing";
import { getPlanFromStripe, getBillingEntityForUser } from "./plans";
import {
  buildTopUpLabel,
  buildUsageLabel,
  formatCreditLogEventType,
  formatCreditLogLabel,
  insertCreditLog,
} from "./creditLogs";
import {
  createTopUpEntry,
  deductFromUserQuota,
  type CreditDeductionResult,
} from "./creditEntries";
import {
  getOrCreateCurrentPeriod,
  snapshotUserCredit,
  ensureFirstCreditPeriod,
} from "./creditPeriodPool";
import type { Doc, Id } from "./_generated/dataModel";
import { getDailyCreditUsageForAgents } from "./creditUsageAnalytics";
import {
  DAY_MS,
  getUsagePeriodStartMs,
} from "./usageMonthKey";
import { getActiveTeamForUser, normalizeTimeZone } from "./teamHelpers";

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

async function applyUsageDeduction(
  ctx: MutationCtx,
  args: {
    billingUser: Doc<"users">;
    creditsCharged: number;
    log: {
      modelId: string;
      agentId?: Id<"agents">;
      agentName?: string;
      conversationId?: Id<"conversations">;
      reason?: string;
    };
  },
): Promise<{ deduction: CreditDeductionResult; balanceAfter: number }> {
  const before = await snapshotUserCredit(ctx, args.billingUser._id);
  const deduction = await deductFromUserQuota(ctx, args.billingUser._id, args.creditsCharged);
  const after = await snapshotUserCredit(ctx, args.billingUser._id);

  await insertCreditLog(ctx, {
    orgId: "",
    userId: args.billingUser._id,
    eventType: "usage",
    label: buildUsageLabel(args.log.agentName),
    amount: -args.creditsCharged,
    balanceBefore: before.totalRemaining,
    balanceAfter: after.totalRemaining,
    monthlyCreditsBefore: before.monthlyRemaining,
    monthlyCreditsAfter: after.monthlyRemaining,
    purchasedCreditsBefore: before.purchasedRemaining,
    purchasedCreditsAfter: after.purchasedRemaining,
    creditCost: args.creditsCharged,
    modelId: args.log.modelId,
    agentId: args.log.agentId,
    agentName: args.log.agentName,
    conversationId: args.log.conversationId,
    reason: args.log.reason,
    periodId: deduction.periodId,
    topUpEntryId: deduction.topUpAllocations[0]?.topUpEntryId,
    deductionSource:
      deduction.monthlyDeducted > 0
        ? "monthly"
        : deduction.topUpDeducted > 0
          ? "top_up"
          : undefined,
  });

  return { deduction, balanceAfter: after.totalRemaining };
}

export const isPlaygroundDeductEnabled = query({
  args: {},
  handler: async () => {
    return isPlaygroundCreditsEnabled();
  },
});

export const getBalance = query({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx, args.orgId);
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (user === null) {
      return null;
    }
    const { billingUser } = await getBillingEntityForUser(ctx, user);
    const snapshot = await snapshotUserCredit(ctx, billingUser._id);
    return {
      credits: snapshot.totalRemaining,
      monthlyAllowance: snapshot.monthlyGranted,
    };
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .unique();
    if (user === null) {
      return { ok: false as const, reason: "user_not_found" as const };
    }
    const { billingUser } = await getBillingEntityForUser(ctx, user);
    const snapshot = await snapshotUserCredit(ctx, billingUser._id);
    const balance = snapshot.totalRemaining;
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
    agentId: v.optional(v.id("agents")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pricing = getModelPricing(args.modelId);
    if (pricing === null) {
      throw new Error("Model is not available");
    }

    const skipDeduction = args.skipDeduction ?? false;
    const creditsCharged = skipDeduction ? 0 : pricing.creditCost;

    let agentId = args.agentId;
    if (!agentId && args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId);
      agentId = conversation?.assignedAgentId;
    }

    let agentName: string | undefined;
    if (agentId) {
      const agent = await ctx.db.get(agentId);
      agentName = agent?.name;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .unique();
    if (user === null) {
      throw new Error("User not found");
    }

    const { billingUser } = await getBillingEntityForUser(ctx, user);

    let balanceAfter: number;
    if (!skipDeduction) {
      const before = await snapshotUserCredit(ctx, billingUser._id);
      if (before.totalRemaining < pricing.creditCost) {
        throw new Error("Insufficient credits");
      }
      const result = await applyUsageDeduction(ctx, {
        billingUser,
        creditsCharged,
        log: {
          modelId: args.modelId,
          agentId,
          agentName,
          conversationId: args.conversationId,
          reason: args.reason ?? `AI reply using ${args.modelId}`,
        },
      });
      balanceAfter = result.balanceAfter;
    } else {
      const snapshot = await snapshotUserCredit(ctx, billingUser._id);
      balanceAfter = snapshot.totalRemaining;
    }

    return {
      llmModel: args.modelId,
      creditsCharged,
      balanceAfter,
    };
  },
});

export const topUp = mutation({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx, args.orgId);

    const userObj = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!userObj) {
      throw new Error("User not found");
    }

    const { billingUser } = await getBillingEntityForUser(ctx, userObj);
    const before = await snapshotUserCredit(ctx, billingUser._id);
    const topUpEntryId = await createTopUpEntry(ctx, billingUser._id, {
      grantedCredits: 500,
      label: buildTopUpLabel(500),
    });
    const after = await snapshotUserCredit(ctx, billingUser._id);

    await insertCreditLog(ctx, {
      orgId: "",
      userId: billingUser._id,
      eventType: "top_up",
      label: buildTopUpLabel(500),
      amount: 500,
      balanceBefore: before.totalRemaining,
      balanceAfter: after.totalRemaining,
      monthlyCreditsBefore: before.monthlyRemaining,
      monthlyCreditsAfter: after.monthlyRemaining,
      purchasedCreditsBefore: before.purchasedRemaining,
      purchasedCreditsAfter: after.purchasedRemaining,
      creditCost: 500,
      topUpEntryId,
      reason: "User topped up credits (manual/test)",
    });

    return { success: true, newCredits: after.totalRemaining };
  },
});

const MONTHLY_PERIOD_MS = 30 * DAY_MS;
const CHART_AGENT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function resolveLogAgentId(
  log: Doc<"creditLogs">,
  conversationAgentCache: Map<Id<"conversations">, Id<"agents"> | undefined>,
): string {
  let resolvedAgentId = log.agentId;
  if (!resolvedAgentId && log.conversationId) {
    if (!conversationAgentCache.has(log.conversationId)) {
      return "unassigned";
    }
    resolvedAgentId = conversationAgentCache.get(log.conversationId);
  }
  return resolvedAgentId ?? "unassigned";
}

export const getUsageDashboard = query({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx, args.orgId);
    const isPersonal = !orgId || orgId === "personal";

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!user) {
      return null;
    }

    const activeTeam = await getActiveTeamForUser(ctx, user);
    const timeZone = normalizeTimeZone(activeTeam.timeZone);
    const { billingUser: userDoc } = await getBillingEntityForUser(ctx, user);
    const snapshot = await snapshotUserCredit(ctx, userDoc._id);

    const stripeInfo = await getPlanFromStripe(ctx, userDoc.workosUserId);
    const periodStartMs = snapshot.period?.periodStart ?? getUsagePeriodStartMs(userDoc.stripeSubscriptionCurrentPeriodEnd);

    const agents = isPersonal
      ? await ctx.db
          .query("agents")
          .withIndex("by_userId_and_orgId", (q) =>
            q.eq("userId", userId).eq("orgId", orgId),
          )
          .order("desc")
          .take(50)
      : await ctx.db
          .query("agents")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .order("desc")
          .take(50);

    const agentNameById = new Map(agents.map((agent) => [agent._id, agent.name]));

    const logs = await ctx.db
      .query("creditLogs")
      .withIndex("by_userId_and_eventType_and_createdAt", (q) =>
        q.eq("userId", userDoc._id).eq("eventType", "usage").gte("createdAt", periodStartMs),
      )
      .collect();

    const usageLogs =
      logs.length > 0
        ? logs
        : (
            await ctx.db
              .query("creditLogs")
              .withIndex("by_userId_and_createdAt", (q) =>
                q.eq("userId", userDoc._id).gte("createdAt", periodStartMs),
              )
              .collect()
          ).filter((log) => formatCreditLogEventType(log) === "usage");

    const conversationAgentCache = new Map<Id<"conversations">, Id<"agents"> | undefined>();
    const usageByAgent = new Map<string, number>();

    for (const log of usageLogs) {
      if (log.conversationId && !log.agentId && !conversationAgentCache.has(log.conversationId)) {
        const conversation = await ctx.db.get(log.conversationId);
        conversationAgentCache.set(log.conversationId, conversation?.assignedAgentId);
      }

      const key = resolveLogAgentId(log, conversationAgentCache);
      const amount = log.creditCost ?? Math.abs(log.amount);
      usageByAgent.set(key, (usageByAgent.get(key) ?? 0) + amount);
    }

    const agentUsage = Array.from(usageByAgent.entries())
      .map(([key, creditsUsed]) => {
        if (key === "unassigned") {
          return {
            agentId: null as Id<"agents"> | null,
            name: "Unassigned",
            creditsUsed,
          };
        }
        const id = key as Id<"agents">;
        return {
          agentId: id,
          name: agentNameById.get(id) ?? "Unknown agent",
          creditsUsed,
        };
      })
      .sort((a, b) => b.creditsUsed - a.creditsUsed);

    const agentsWithZeroUsage = agents
      .filter((agent) => !usageByAgent.has(agent._id))
      .map((agent) => ({
        agentId: agent._id,
        name: agent.name,
        creditsUsed: 0,
      }));

    const combinedAgentUsage = [...agentUsage, ...agentsWithZeroUsage].sort(
      (a, b) => b.creditsUsed - a.creditsUsed,
    );

    const filteredAgentUsage = args.agentId
      ? combinedAgentUsage.filter(
          (row) => row.agentId === args.agentId,
        )
      : combinedAgentUsage;

    const totalUsedThisPeriod = combinedAgentUsage.reduce(
      (sum, row) => sum + row.creditsUsed,
      0,
    );

    const periodEndBoundMs =
      snapshot.period?.periodEnd ?? userDoc.stripeSubscriptionCurrentPeriodEnd ?? periodStartMs + MONTHLY_PERIOD_MS;

    const chartSeries = combinedAgentUsage
      .filter((row) => row.creditsUsed > 0)
      .slice(0, 8)
      .map((row, index) => {
        const seriesKey = row.agentId ?? "unassigned";
        return {
          key: seriesKey,
          label: row.name,
          color: CHART_AGENT_COLORS[index % CHART_AGENT_COLORS.length],
        };
      });

    const chartAgentKeys = chartSeries.map((series) => series.key);
    const { dailyUsage: aggregateDailyUsage } = await getDailyCreditUsageForAgents(
      ctx,
      {
        billingUserId: userDoc._id,
        periodStartMs,
        periodEndMs: periodEndBoundMs,
        agentKeys: chartAgentKeys.length > 0 ? chartAgentKeys : ["unassigned"],
        timeZone,
      },
    );

    const chartSeriesKeys = new Set(chartSeries.map((series) => series.key));
    const dailyUsage = aggregateDailyUsage.map((row) => {
      const nextRow: Record<string, number | string> = {
        date: row.date,
        total: row.total ?? 0,
      };

      for (const series of chartSeries) {
        nextRow[series.key] = (row[series.key] as number | undefined) ?? 0;
      }

      let otherTotal = 0;
      for (const [key, amount] of Object.entries(row)) {
        if (key === "date" || key === "total" || chartSeriesKeys.has(key)) {
          continue;
        }
        otherTotal += (amount as number) ?? 0;
      }
      if (chartSeries.length > 0) {
        nextRow.other = otherTotal;
      }

      return nextRow;
    });

    const chartConfig = [
      { key: "total", label: "Total usage", color: "var(--chart-1)" },
      ...chartSeries,
      ...(chartSeries.length > 0
        ? [{ key: "other", label: "Other agents", color: "var(--chart-5)" }]
        : []),
    ];

    return {
      orgName: "Your account",
      credits: snapshot.totalRemaining,
      monthlyAllowance: snapshot.monthlyGranted,
      plan: stripeInfo.plan,
      periodStartMs,
      periodEndMs: periodEndBoundMs,
      timeZone,
      totalUsedThisPeriod,
      agentUsage: filteredAgentUsage,
      agents: agents.map((agent) => ({ _id: agent._id, name: agent.name })),
      dailyUsage,
      chartConfig,
    };
  },
});

export const getCreditHistory = query({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
    agentId: v.optional(v.id("agents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx, args.orgId);
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!user) {
      return null;
    }

    const { billingUser: userDoc } = await getBillingEntityForUser(ctx, user);
    const snapshot = await snapshotUserCredit(ctx, userDoc._id);
    const periodStartMs = snapshot.period?.periodStart ?? getUsagePeriodStartMs(userDoc.stripeSubscriptionCurrentPeriodEnd);

    const logs = await ctx.db
      .query("creditLogs")
      .withIndex("by_userId_and_createdAt", (q) =>
        q.eq("userId", userDoc._id).gte("createdAt", periodStartMs),
      )
      .order("desc")
      .take(limit * 2);

    const filteredLogs = args.agentId
      ? logs.filter((log) => {
          const eventType = formatCreditLogEventType(log);
          if (eventType !== "usage") {
            return false;
          }
          return log.agentId === args.agentId;
        })
      : logs;

    const entries = filteredLogs.slice(0, limit).map((log) => {
      const eventType = formatCreditLogEventType(log);
      const pricing = log.modelId ? getModelPricing(log.modelId) : null;
      const creditCost =
        log.creditCost ??
        (eventType === "usage" ? Math.abs(log.amount) : log.amount > 0 ? log.amount : undefined);

      return {
        id: log._id,
        createdAt: log.createdAt,
        eventType,
        label: formatCreditLogLabel(log),
        modelId: log.modelId ?? null,
        modelLabel: pricing?.label ?? log.modelId ?? null,
        creditCost: creditCost ?? null,
        amount: log.amount,
        balanceBefore: log.balanceBefore,
        balanceAfter: log.balanceAfter,
        monthlyCreditsBefore: log.monthlyCreditsBefore ?? null,
        monthlyCreditsAfter: log.monthlyCreditsAfter ?? null,
        purchasedCreditsBefore: log.purchasedCreditsBefore ?? null,
        purchasedCreditsAfter: log.purchasedCreditsAfter ?? null,
        agentId: log.agentId ?? null,
        agentName: log.agentName ?? null,
        reason: log.reason ?? null,
      };
    });

    return {
      credits: snapshot.totalRemaining,
      monthlyAllowance: snapshot.monthlyGranted,
      periodStartMs,
      periodEndMs:
        snapshot.period?.periodEnd ?? userDoc.stripeSubscriptionCurrentPeriodEnd ?? periodStartMs + MONTHLY_PERIOD_MS,
      entries,
    };
  },
});

export const ensureFirstPeriodForUser = internalMutation({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .unique();
    if (!user) return;
    const { billingUser } = await getBillingEntityForUser(ctx, user);
    await ensureFirstCreditPeriod(ctx, billingUser._id);
    await getOrCreateCurrentPeriod(ctx, billingUser._id);
  },
});
