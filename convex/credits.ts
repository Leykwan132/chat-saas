import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { getAuthContext } from "./authUtils";
import { getModelPricing } from "./llm/modelPricing";
import { lazyResetCreditsIfNeeded, getPlanFromStripe, syncCreditBilling } from "./plans";
import {
  applyCreditDeduction,
  getTotalCreditBalance,
  nextPurchasedCreditGrant,
} from "./creditBalance";
import {
  buildTopUpLabel,
  buildUsageLabel,
  formatCreditLogEventType,
  formatCreditLogLabel,
  insertCreditLog,
  snapshotCreditBalances,
} from "./creditLogs";
import type { Doc, Id } from "./_generated/dataModel";

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
    const { userId, orgId } = await getAuthContext(ctx, args.orgId);
    if (!orgId || orgId === "personal") {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
        .unique();
      if (user === null) {
        return null;
      }
      const stripeInfo = await getPlanFromStripe(ctx, userId);
      const { billing } = await syncCreditBilling(ctx, user, stripeInfo);
      return {
        credits: billing.effectiveCredits,
        monthlyAllowance: billing.monthlyAllowance,
      };
    }
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    if (org === null) {
      return null;
    }
    const stripeInfo = await getPlanFromStripe(ctx, orgId);
    const { billing } = await syncCreditBilling(ctx, org, stripeInfo);
    return {
      credits: billing.effectiveCredits,
      monthlyAllowance: billing.monthlyAllowance,
    };
  },
});

export const internalCheckCredits = internalQuery({
  args: {
    orgId: v.string(),
    modelId: v.string(),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pricing = getModelPricing(args.modelId);
    if (pricing === null) {
      return { ok: false as const, reason: "model_disabled" as const };
    }

    if (!args.orgId || args.orgId === "personal") {
      if (!args.workosUserId) {
        return { ok: false as const, reason: "user_not_found" as const };
      }
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId!))
        .unique();
      if (user === null) {
        return { ok: false as const, reason: "user_not_found" as const };
      }
      const currentUserDoc = (await lazyResetCreditsIfNeeded(ctx, user)) as Doc<"users">;
      const balance = getTotalCreditBalance(currentUserDoc);
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
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
      .unique();
    if (org === null) {
      return { ok: false as const, reason: "org_not_found" as const };
    }

    const simulatedOrg = (await lazyResetCreditsIfNeeded(ctx, org)) as Doc<"organizations">;
    const balance = getTotalCreditBalance(simulatedOrg);
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
    orgId: v.string(),
    modelId: v.string(),
    workosUserId: v.optional(v.string()),
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

    if (!args.orgId || args.orgId === "personal") {
      if (!args.workosUserId) {
        throw new Error("User ID is required for personal workspace deductions");
      }
      let user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId!))
        .unique();
      if (user === null) {
        throw new Error("User not found");
      }

      user = (await lazyResetCreditsIfNeeded(ctx, user)) as Doc<"users">;
      const before = snapshotCreditBalances(user);
      let balanceAfter = before.balanceBefore;

      if (!skipDeduction) {
        if (before.balanceBefore < pricing.creditCost) {
          throw new Error("Insufficient credits");
        }
        const updatedBalances = applyCreditDeduction(user, pricing.creditCost);
        balanceAfter = updatedBalances.totalAfter;
        await ctx.db.patch(user._id, {
          credits: updatedBalances.credits,
          purchasedCredits: updatedBalances.purchasedCredits,
          updatedAt: Date.now(),
        });

        if (creditsCharged > 0) {
          await insertCreditLog(ctx, {
            orgId: "",
            userId: user._id,
            eventType: "usage",
            label: buildUsageLabel(agentName),
            amount: -creditsCharged,
            balanceBefore: before.balanceBefore,
            balanceAfter,
            monthlyCreditsBefore: before.monthlyCreditsBefore,
            monthlyCreditsAfter: updatedBalances.credits,
            purchasedCreditsBefore: before.purchasedCreditsBefore,
            purchasedCreditsAfter: updatedBalances.purchasedCredits,
            creditCost: creditsCharged,
            modelId: args.modelId,
            agentId,
            agentName,
            conversationId: args.conversationId,
            reason: args.reason ?? `AI reply using ${args.modelId}`,
          });
        }
      }

      return {
        llmModel: args.modelId,
        creditsCharged,
        balanceAfter,
      };
    }

    let org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
      .unique();
    if (org === null) {
      throw new Error("Organization not found");
    }

    let userDbId = undefined;
    const workosUserId = args.workosUserId;
    if (workosUserId) {
      const userObj = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
        .unique();
      if (userObj) {
        userDbId = userObj._id;
      }
    }

    org = (await lazyResetCreditsIfNeeded(ctx, org)) as Doc<"organizations">;
    const before = snapshotCreditBalances(org);
    let balanceAfter = before.balanceBefore;

    if (!skipDeduction) {
      if (before.balanceBefore < pricing.creditCost) {
        throw new Error("Insufficient credits");
      }
      const updatedBalances = applyCreditDeduction(org, pricing.creditCost);
      balanceAfter = updatedBalances.totalAfter;
      await ctx.db.patch(org._id, {
        credits: updatedBalances.credits,
        purchasedCredits: updatedBalances.purchasedCredits,
        updatedAt: Date.now(),
      });

      if (creditsCharged > 0) {
        await insertCreditLog(ctx, {
          orgId: org.workosOrgId,
          userId: userDbId,
          eventType: "usage",
          label: buildUsageLabel(agentName),
          amount: -creditsCharged,
          balanceBefore: before.balanceBefore,
          balanceAfter,
          monthlyCreditsBefore: before.monthlyCreditsBefore,
          monthlyCreditsAfter: updatedBalances.credits,
          purchasedCreditsBefore: before.purchasedCreditsBefore,
          purchasedCreditsAfter: updatedBalances.purchasedCredits,
          creditCost: creditsCharged,
          modelId: args.modelId,
          agentId,
          agentName,
          conversationId: args.conversationId,
          reason: args.reason ?? `AI reply using ${args.modelId}`,
        });
      }
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
    const { orgId, userId } = await getAuthContext(ctx, args.orgId);
    
    const userObj = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!userObj) {
      throw new Error("User not found");
    }

    if (!orgId || orgId === "personal") {
      const before = snapshotCreditBalances(userObj);
      const purchased = nextPurchasedCreditGrant(userObj, 500);
      const balanceAfter = before.monthlyCreditsBefore + purchased.purchasedCredits;
      await ctx.db.patch(userObj._id, {
        purchasedCredits: purchased.purchasedCredits,
        purchasedCreditsGranted: purchased.purchasedCreditsGranted,
        updatedAt: Date.now(),
      });

      await insertCreditLog(ctx, {
        orgId: "",
        userId: userObj._id,
        eventType: "top_up",
        label: buildTopUpLabel(500),
        amount: 500,
        balanceBefore: before.balanceBefore,
        balanceAfter,
        monthlyCreditsBefore: before.monthlyCreditsBefore,
        monthlyCreditsAfter: before.monthlyCreditsBefore,
        purchasedCreditsBefore: before.purchasedCreditsBefore,
        purchasedCreditsAfter: purchased.purchasedCredits,
        creditCost: 500,
        reason: "User topped up credits (manual/test)",
      });

      return { success: true, newCredits: balanceAfter };
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    if (org === null) {
      throw new Error("Organization not found");
    }

    const before = snapshotCreditBalances(org);
    const purchased = nextPurchasedCreditGrant(org, 500);
    const balanceAfter = before.monthlyCreditsBefore + purchased.purchasedCredits;
    await ctx.db.patch(org._id, {
      purchasedCredits: purchased.purchasedCredits,
      purchasedCreditsGranted: purchased.purchasedCreditsGranted,
      updatedAt: Date.now(),
    });

    await insertCreditLog(ctx, {
      orgId: org.workosOrgId,
      userId: userObj._id,
      eventType: "top_up",
      label: buildTopUpLabel(500),
      amount: 500,
      balanceBefore: before.balanceBefore,
      balanceAfter,
      monthlyCreditsBefore: before.monthlyCreditsBefore,
      monthlyCreditsAfter: before.monthlyCreditsBefore,
      purchasedCreditsBefore: before.purchasedCreditsBefore,
      purchasedCreditsAfter: purchased.purchasedCredits,
      creditCost: 500,
      reason: "Organization topped up credits (manual/test)",
    });

    return { success: true, newCredits: balanceAfter };
  },
});

const MONTHLY_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_AGENT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function getUsagePeriodStartMs(stripePeriodEndMs?: number): number {
  if (stripePeriodEndMs && stripePeriodEndMs > Date.now()) {
    return stripePeriodEndMs - MONTHLY_PERIOD_MS;
  }
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

function toUtcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function getDateKeysInRange(startMs: number, endMs: number): string[] {
  const keys: string[] = [];
  const rangeEndMs = Math.min(endMs, Date.now());
  for (let t = startMs; t <= rangeEndMs; t += DAY_MS) {
    keys.push(toUtcDateKey(t));
  }
  return keys;
}

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
    const logOrgId = isPersonal ? "" : orgId;

    let userDoc: Doc<"users"> | null = null;
    let orgDoc: Doc<"organizations"> | null = null;
    let stripeEntityId = userId;
    let periodEndMs: number | undefined;

    if (isPersonal) {
      userDoc = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
        .unique();
      if (!userDoc) {
        return null;
      }
      periodEndMs = userDoc.stripeSubscriptionCurrentPeriodEnd;
    } else {
      orgDoc = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
        .unique();
      if (!orgDoc) {
        return null;
      }
      stripeEntityId = orgId;
      periodEndMs = orgDoc.stripeSubscriptionCurrentPeriodEnd;
    }

    const stripeInfo = await getPlanFromStripe(ctx, stripeEntityId);
    const entity = (userDoc ?? orgDoc)!;
    const { billing } = await syncCreditBilling(ctx, entity, stripeInfo);
    const periodStartMs = getUsagePeriodStartMs(periodEndMs);

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

    const logs = isPersonal
      ? userDoc
        ? await ctx.db
            .query("creditLogs")
            .withIndex("by_userId_and_createdAt", (q) =>
              q.eq("userId", userDoc!._id).gte("createdAt", periodStartMs),
            )
            .collect()
        : []
      : await ctx.db
          .query("creditLogs")
          .withIndex("by_orgId_and_createdAt", (q) =>
            q.eq("orgId", logOrgId).gte("createdAt", periodStartMs),
          )
          .collect();

    const conversationAgentCache = new Map<Id<"conversations">, Id<"agents"> | undefined>();
    const usageByAgent = new Map<string, number>();
    const dailyUsageByAgent = new Map<string, Map<string, number>>();

    for (const log of logs) {
      const eventType = formatCreditLogEventType(log);
      if (eventType !== "usage" && log.type !== "deduction") {
        continue;
      }

      if (log.conversationId && !log.agentId && !conversationAgentCache.has(log.conversationId)) {
        const conversation = await ctx.db.get(log.conversationId);
        conversationAgentCache.set(log.conversationId, conversation?.assignedAgentId);
      }

      const key = resolveLogAgentId(log, conversationAgentCache);
      const amount = log.creditCost ?? Math.abs(log.amount);
      usageByAgent.set(key, (usageByAgent.get(key) ?? 0) + amount);

      const dateKey = toUtcDateKey(log.createdAt);
      if (!dailyUsageByAgent.has(dateKey)) {
        dailyUsageByAgent.set(dateKey, new Map());
      }
      const dayMap = dailyUsageByAgent.get(dateKey)!;
      dayMap.set(key, (dayMap.get(key) ?? 0) + amount);
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

    const periodEndBoundMs = periodEndMs ?? periodStartMs + MONTHLY_PERIOD_MS;
    const dateKeys = getDateKeysInRange(periodStartMs, periodEndBoundMs);

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

    const chartSeriesKeys = new Set(chartSeries.map((series) => series.key));
    const dailyUsage = dateKeys.map((date) => {
      const dayMap = dailyUsageByAgent.get(date) ?? new Map<string, number>();
      const row: Record<string, number | string> = { date, total: 0 };

      for (const [agentKey, amount] of dayMap.entries()) {
        row.total = (row.total as number) + amount;
        if (chartSeriesKeys.has(agentKey)) {
          row[agentKey] = amount;
        } else if (amount > 0) {
          row.other = ((row.other as number | undefined) ?? 0) + amount;
        }
      }

      for (const series of chartSeries) {
        if (row[series.key] === undefined) {
          row[series.key] = 0;
        }
      }
      if (chartSeries.length > 0 && row.other === undefined) {
        row.other = 0;
      }

      return row;
    });

    const chartConfig = [
      { key: "total", label: "Total usage", color: "var(--chart-1)" },
      ...chartSeries,
      ...(chartSeries.length > 0
        ? [{ key: "other", label: "Other agents", color: "var(--chart-5)" }]
        : []),
    ];

    return {
      orgName: isPersonal ? "Personal Workspace" : orgDoc!.name,
      credits: billing.effectiveCredits,
      monthlyAllowance: billing.monthlyAllowance,
      plan: stripeInfo.plan,
      periodStartMs,
      periodEndMs: periodEndBoundMs,
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
    const { userId, orgId } = await getAuthContext(ctx, args.orgId);
    const isPersonal = !orgId || orgId === "personal";
    const logOrgId = isPersonal ? "" : orgId;
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);

    let userDoc: Doc<"users"> | null = null;
    let orgDoc: Doc<"organizations"> | null = null;
    let stripeEntityId = userId;
    let periodEndMs: number | undefined;

    if (isPersonal) {
      userDoc = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
        .unique();
      if (!userDoc) {
        return null;
      }
      periodEndMs = userDoc.stripeSubscriptionCurrentPeriodEnd;
    } else {
      orgDoc = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
        .unique();
      if (!orgDoc) {
        return null;
      }
      stripeEntityId = orgId;
      periodEndMs = orgDoc.stripeSubscriptionCurrentPeriodEnd;
    }

    const stripeInfo = await getPlanFromStripe(ctx, stripeEntityId);
    const entity = (userDoc ?? orgDoc)!;
    const { billing } = await syncCreditBilling(ctx, entity, stripeInfo);
    const periodStartMs = getUsagePeriodStartMs(periodEndMs);

    const logs = isPersonal
      ? userDoc
        ? await ctx.db
            .query("creditLogs")
            .withIndex("by_userId_and_createdAt", (q) =>
              q.eq("userId", userDoc!._id).gte("createdAt", periodStartMs),
            )
            .order("desc")
            .take(limit * 2)
        : []
      : await ctx.db
          .query("creditLogs")
          .withIndex("by_orgId_and_createdAt", (q) =>
            q.eq("orgId", logOrgId).gte("createdAt", periodStartMs),
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
      credits: billing.effectiveCredits,
      monthlyAllowance: billing.monthlyAllowance,
      periodStartMs,
      periodEndMs: periodEndMs ?? periodStartMs + MONTHLY_PERIOD_MS,
      entries,
    };
  },
});
