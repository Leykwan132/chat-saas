import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { PaginationOptions } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";
import { creditDailyUsageAggregator } from "./aggregates";
import { assertAgentAccess } from "./agentUsage";
import { getAuthContext } from "./authUtils";
import { formatCreditLogEventType } from "./creditLogs";
import { getBillingEntityForUser, getPlanFromStripe } from "./plans";
import { getModelPricing } from "./llm/modelPricing";
import {
  creditDailyUsageNamespace,
  DAY_MS,
  getDateKeysInRange,
  getUsagePeriodStartMs,
  toUtcDateKey,
} from "./usageMonthKey";
import {
  MODEL_USAGE_OTHERS_COLOR,
  modelUsageChartColor,
} from "../shared/modelUsageChartColors";

const MONTHLY_PERIOD_MS = 30 * DAY_MS;
const MAX_CREDIT_SPEND_PAGE_SIZE = 100;
const TOP_MODEL_SERIES_LIMIT = 8;
const TIME_RANGE_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

type CreditTimeRange = "7d" | "30d" | "90d" | "period";

export const creditTimeRangeValidator = v.optional(
  v.union(
    v.literal("7d"),
    v.literal("30d"),
    v.literal("90d"),
    v.literal("period"),
  ),
);

const SERVICE_LABELS: Record<string, string> = {
  playground: "Playground",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
};

function formatCreditSpentOn(conversation: Doc<"conversations">): string {
  if (conversation.service === "playground") {
    return "Playground";
  }

  const serviceLabel =
    SERVICE_LABELS[conversation.service] ??
    conversation.service.charAt(0).toUpperCase() + conversation.service.slice(1);
  const contact =
    conversation.contactName?.trim() || conversation.contactAddress?.trim();

  return contact ? `${serviceLabel} · ${contact}` : serviceLabel;
}

async function resolveSpentOn(
  ctx: QueryCtx,
  conversationId: Id<"conversations"> | undefined,
  cache: Map<Id<"conversations">, Doc<"conversations"> | null>,
) {
  if (!conversationId) {
    return "Direct usage";
  }

  if (!cache.has(conversationId)) {
    cache.set(conversationId, (await ctx.db.get(conversationId)) ?? null);
  }

  const conversation = cache.get(conversationId);
  return conversation ? formatCreditSpentOn(conversation) : "Unknown conversation";
}

function resolveModelLabel(modelId: string | undefined) {
  if (!modelId) {
    return "Unknown model";
  }
  return getModelPricing(modelId)?.label ?? modelId;
}

type CreditSpendEntry = {
  id: string;
  spentOn: string;
  agentName: string;
  modelLabel: string;
  modelId: string | null;
  credits: number;
  createdAt: number;
};

async function resolveAgentName(
  ctx: QueryCtx,
  agentId: Id<"agents"> | undefined,
  cache: Map<Id<"agents">, string>,
) {
  if (!agentId) {
    return "Unassigned";
  }

  if (!cache.has(agentId)) {
    const agent = await ctx.db.get(agentId);
    cache.set(agentId, agent?.name ?? "Unknown agent");
  }

  return cache.get(agentId)!;
}

async function mapUsageEventToEntry(
  ctx: QueryCtx,
  event: Doc<"creditUsageEvents">,
  conversationCache: Map<Id<"conversations">, Doc<"conversations"> | null>,
  agentCache: Map<Id<"agents">, string>,
): Promise<CreditSpendEntry> {
  return {
    id: event._id,
    spentOn: await resolveSpentOn(ctx, event.conversationId, conversationCache),
    agentName: await resolveAgentName(ctx, event.agentId, agentCache),
    modelLabel: resolveModelLabel(event.modelId),
    modelId: event.modelId ?? null,
    credits: event.credits,
    createdAt: event.createdAt,
  };
}

async function mapUsageLogToEntry(
  ctx: QueryCtx,
  log: Doc<"creditLogs">,
  conversationCache: Map<Id<"conversations">, Doc<"conversations"> | null>,
  agentCache: Map<Id<"agents">, string>,
  resolvedAgentId: Id<"agents"> | undefined,
): Promise<CreditSpendEntry> {
  const agentName =
    log.agentName?.trim() ||
    (await resolveAgentName(ctx, resolvedAgentId ?? log.agentId, agentCache));

  return {
    id: log._id,
    spentOn: await resolveSpentOn(ctx, log.conversationId, conversationCache),
    agentName,
    modelLabel: resolveModelLabel(log.modelId),
    modelId: log.modelId ?? null,
    credits: log.creditCost ?? Math.abs(log.amount),
    createdAt: log.createdAt,
  };
}

function normalizeCreditSpendPaginationOpts(paginationOpts: PaginationOptions) {
  return {
    ...paginationOpts,
    numItems: Math.min(
      Math.max(paginationOpts.numItems, 1),
      MAX_CREDIT_SPEND_PAGE_SIZE,
    ),
  };
}

async function paginateCreditSpendFromEvents(
  ctx: QueryCtx,
  args: {
    agentId: Id<"agents">;
    rangeStartMs: number;
    rangeEndMs: number;
    paginationOpts: PaginationOptions;
  },
) {
  const eventsResult = await ctx.db
    .query("creditUsageEvents")
    .withIndex("by_agentId_and_createdAt", (q) =>
      q.eq("agentId", args.agentId).gte("createdAt", args.rangeStartMs),
    )
    .order("desc")
    .paginate(args.paginationOpts);

  const scopedEvents = eventsResult.page.filter(
    (event) => event.createdAt <= args.rangeEndMs,
  );

  const conversationCache = new Map<
    Id<"conversations">,
    Doc<"conversations"> | null
  >();
  const agentCache = new Map<Id<"agents">, string>();
  const page = await Promise.all(
    scopedEvents.map((event) =>
      mapUsageEventToEntry(ctx, event, conversationCache, agentCache),
    ),
  );

  return {
    page,
    isDone: eventsResult.isDone,
    continueCursor: eventsResult.continueCursor,
  };
}

async function paginateCreditSpendFromLogs(
  ctx: QueryCtx,
  args: {
    billingUserId: Id<"users">;
    agentId: Id<"agents">;
    rangeStartMs: number;
    rangeEndMs: number;
    paginationOpts: PaginationOptions;
  },
) {
  const logsResult = await ctx.db
    .query("creditLogs")
    .withIndex("by_userId_and_eventType_and_createdAt", (q) =>
      q
        .eq("userId", args.billingUserId)
        .eq("eventType", "usage")
        .gte("createdAt", args.rangeStartMs),
    )
    .order("desc")
    .paginate(args.paginationOpts);

  const conversationAgentCache = new Map<
    Id<"conversations">,
    Id<"agents"> | undefined
  >();
  const conversationCache = new Map<
    Id<"conversations">,
    Doc<"conversations"> | null
  >();
  const agentCache = new Map<Id<"agents">, string>();
  const page: CreditSpendEntry[] = [];

  for (const log of logsResult.page) {
    if (log.createdAt > args.rangeEndMs) {
      continue;
    }

    if (log.conversationId && !log.agentId && !conversationAgentCache.has(log.conversationId)) {
      const conversation = await ctx.db.get(log.conversationId);
      conversationAgentCache.set(log.conversationId, conversation?.assignedAgentId);
    }

    const resolvedAgentId =
      log.agentId ??
      (log.conversationId
        ? conversationAgentCache.get(log.conversationId)
        : undefined);

    if ((resolvedAgentId ?? ("unassigned" as const)) !== args.agentId) {
      continue;
    }

    page.push(
      await mapUsageLogToEntry(
        ctx,
        log,
        conversationCache,
        agentCache,
        resolvedAgentId,
      ),
    );
  }

  return {
    page,
    isDone: logsResult.isDone,
    continueCursor: logsResult.continueCursor,
  };
}

async function hasAgentCreditUsageEventsInRange(
  ctx: QueryCtx,
  args: {
    agentId: Id<"agents">;
    rangeStartMs: number;
    rangeEndMs: number;
  },
) {
  const event = await ctx.db
    .query("creditUsageEvents")
    .withIndex("by_agentId_and_createdAt", (q) =>
      q
        .eq("agentId", args.agentId)
        .gte("createdAt", args.rangeStartMs)
        .lte("createdAt", args.rangeEndMs),
    )
    .first();

  return event !== null;
}

async function paginateAgentCreditSpendHistory(
  ctx: QueryCtx,
  args: {
    billingUserId: Id<"users">;
    agentId: Id<"agents">;
    rangeStartMs: number;
    rangeEndMs: number;
    paginationOpts: PaginationOptions;
  },
) {
  const paginationOpts = normalizeCreditSpendPaginationOpts(args.paginationOpts);
  const useEventsPath = await hasAgentCreditUsageEventsInRange(ctx, {
    agentId: args.agentId,
    rangeStartMs: args.rangeStartMs,
    rangeEndMs: args.rangeEndMs,
  });

  if (useEventsPath) {
    return paginateCreditSpendFromEvents(ctx, {
      agentId: args.agentId,
      rangeStartMs: args.rangeStartMs,
      rangeEndMs: args.rangeEndMs,
      paginationOpts,
    });
  }

  return paginateCreditSpendFromLogs(ctx, {
    billingUserId: args.billingUserId,
    agentId: args.agentId,
    rangeStartMs: args.rangeStartMs,
    rangeEndMs: args.rangeEndMs,
    paginationOpts,
  });
}

function resolveCreditUsageRange(
  timeRange: CreditTimeRange,
  periodStartMs: number,
  periodEndMs: number,
) {
  if (timeRange === "period") {
    return { rangeStartMs: periodStartMs, rangeEndMs: periodEndMs };
  }

  const days = TIME_RANGE_DAYS[timeRange];
  const rangeEndMs = Math.min(periodEndMs, Date.now());
  const rangeStartMs = Math.max(
    periodStartMs,
    rangeEndMs - (days - 1) * DAY_MS,
  );
  return { rangeStartMs, rangeEndMs };
}

async function sumDailyCreditsForAgents(
  ctx: QueryCtx,
  billingUserId: Id<"users">,
  dateKeys: string[],
  agentKeys: string[],
) {
  if (dateKeys.length === 0 || agentKeys.length === 0) {
    return [] as number[];
  }

  const requests = dateKeys.flatMap((dateKey) =>
    agentKeys.map((agentKey) => ({
      namespace: creditDailyUsageNamespace(billingUserId, dateKey, agentKey),
    })),
  );

  return await creditDailyUsageAggregator.sumBatch(ctx, requests);
}

function buildDailyUsageRows(
  dateKeys: string[],
  agentKeys: string[],
  sums: number[],
) {
  return dateKeys.map((date, dateIndex) => {
    const row: Record<string, number | string> = { date, total: 0 };
    agentKeys.forEach((agentKey, agentIndex) => {
      const credits = sums[dateIndex * agentKeys.length + agentIndex] ?? 0;
      row[agentKey] = credits;
      row.total = (row.total as number) + credits;
    });
    return row;
  });
}

async function listUsageLogsForPeriod(
  ctx: QueryCtx,
  billingUserId: Id<"users">,
  periodStartMs: number,
) {
  const indexedLogs = await ctx.db
    .query("creditLogs")
    .withIndex("by_userId_and_eventType_and_createdAt", (q) =>
      q.eq("userId", billingUserId).eq("eventType", "usage").gte("createdAt", periodStartMs),
    )
    .collect();

  if (indexedLogs.length > 0) {
    return indexedLogs;
  }

  const legacyLogs = await ctx.db
    .query("creditLogs")
    .withIndex("by_userId_and_createdAt", (q) =>
      q.eq("userId", billingUserId).gte("createdAt", periodStartMs),
    )
    .collect();

  return legacyLogs.filter(
    (log) => formatCreditLogEventType(log) === "usage",
  );
}

async function buildDailyUsageFromLogs(
  ctx: QueryCtx,
  logs: Doc<"creditLogs">[],
  dateKeys: string[],
  agentKeys: string[],
) {
  const conversationAgentCache = new Map<
    Id<"conversations">,
    Id<"agents"> | undefined
  >();
  const dailyByAgent = new Map<string, Map<string, number>>();

  for (const log of logs) {
    if (log.conversationId && !log.agentId && !conversationAgentCache.has(log.conversationId)) {
      const conversation = await ctx.db.get(log.conversationId);
      conversationAgentCache.set(log.conversationId, conversation?.assignedAgentId);
    }

    let agentKey = log.agentId ?? "unassigned";
    if (!log.agentId && log.conversationId) {
      agentKey = conversationAgentCache.get(log.conversationId) ?? "unassigned";
    }

    const dateKey = toUtcDateKey(log.createdAt);
    if (!dailyByAgent.has(dateKey)) {
      dailyByAgent.set(dateKey, new Map());
    }
    const dayMap = dailyByAgent.get(dateKey)!;
    const amount = log.creditCost ?? Math.abs(log.amount);
    dayMap.set(agentKey, (dayMap.get(agentKey) ?? 0) + amount);
  }

  return dateKeys.map((date) => {
    const dayMap = dailyByAgent.get(date) ?? new Map<string, number>();
    const row: Record<string, number | string> = { date, total: 0 };
    for (const agentKey of agentKeys) {
      const credits = dayMap.get(agentKey) ?? 0;
      row[agentKey] = credits;
      row.total = (row.total as number) + credits;
    }
    return row;
  });
}

type AgentCreditUsageRecord = {
  modelId: string | undefined;
  credits: number;
  createdAt: number;
};

async function listAgentCreditUsageRecords(
  ctx: QueryCtx,
  args: {
    billingUserId: Id<"users">;
    agentId: Id<"agents">;
    rangeStartMs: number;
    rangeEndMs: number;
  },
): Promise<AgentCreditUsageRecord[]> {
  const events = await ctx.db
    .query("creditUsageEvents")
    .withIndex("by_agentId_and_createdAt", (q) =>
      q.eq("agentId", args.agentId).gte("createdAt", args.rangeStartMs),
    )
    .collect();

  const scopedEvents = events.filter(
    (event) => event.createdAt <= args.rangeEndMs,
  );

  if (scopedEvents.length > 0) {
    return scopedEvents.map((event) => ({
      modelId: event.modelId,
      credits: event.credits,
      createdAt: event.createdAt,
    }));
  }

  const logs = await listUsageLogsForPeriod(ctx, args.billingUserId, args.rangeStartMs);
  const conversationAgentCache = new Map<
    Id<"conversations">,
    Id<"agents"> | undefined
  >();
  const records: AgentCreditUsageRecord[] = [];

  for (const log of logs) {
    if (log.createdAt > args.rangeEndMs) {
      continue;
    }

    if (log.conversationId && !log.agentId && !conversationAgentCache.has(log.conversationId)) {
      const conversation = await ctx.db.get(log.conversationId);
      conversationAgentCache.set(log.conversationId, conversation?.assignedAgentId);
    }

    const resolvedAgentId =
      log.agentId ??
      (log.conversationId
        ? conversationAgentCache.get(log.conversationId)
        : undefined);

    if ((resolvedAgentId ?? ("unassigned" as const)) !== args.agentId) {
      continue;
    }

    records.push({
      modelId: log.modelId,
      credits: log.creditCost ?? Math.abs(log.amount),
      createdAt: log.createdAt,
    });
  }

  return records;
}

function buildAgentModelCreditDailyUsage(
  records: AgentCreditUsageRecord[],
  dateKeys: string[],
) {
  const modelTotals = new Map<string, number>();
  const dailyByModel = new Map<string, Map<string, number>>();

  for (const record of records) {
    const modelId = record.modelId ?? "unknown";
    const dateKey = toUtcDateKey(record.createdAt);
    modelTotals.set(modelId, (modelTotals.get(modelId) ?? 0) + record.credits);

    if (!dailyByModel.has(dateKey)) {
      dailyByModel.set(dateKey, new Map());
    }
    const dayMap = dailyByModel.get(dateKey)!;
    dayMap.set(modelId, (dayMap.get(modelId) ?? 0) + record.credits);
  }

  const rankedModels = [...modelTotals.entries()].sort((a, b) => b[1] - a[1]);
  const topModelIds = rankedModels
    .slice(0, TOP_MODEL_SERIES_LIMIT)
    .map(([modelId]) => modelId);
  const modelIdToKey = new Map(
    topModelIds.map((modelId, index) => [modelId, `model_${index}`]),
  );
  const hasOthers = rankedModels.length > topModelIds.length;

  const series: Array<{
    key: string;
    modelId: string;
    label: string;
    color: string;
  }> = topModelIds.map((modelId, index) => ({
    key: `model_${index}`,
    modelId,
    label:
      modelId === "unknown"
        ? "Unknown model"
        : resolveModelLabel(modelId),
    color: modelUsageChartColor(index),
  }));

  if (hasOthers) {
    series.push({
      key: "others",
      modelId: "others",
      label: "Others",
      color: MODEL_USAGE_OTHERS_COLOR,
    });
  }

  const daily = dateKeys.map((date) => {
    const dayMap = dailyByModel.get(date) ?? new Map<string, number>();
    const row: Record<string, number | string> = { date, total: 0 };
    let others = 0;

    for (const [modelId, credits] of dayMap.entries()) {
      row.total = (row.total as number) + credits;
      const seriesKey = modelIdToKey.get(modelId);
      if (seriesKey) {
        row[seriesKey] = ((row[seriesKey] as number | undefined) ?? 0) + credits;
      } else {
        others += credits;
      }
    }

    for (const { key } of series) {
      if (key !== "others" && row[key] === undefined) {
        row[key] = 0;
      }
    }

    if (hasOthers) {
      row.others = others;
    }

    return row;
  });

  return { series, daily };
}

export async function getDailyCreditUsageForAgents(
  ctx: QueryCtx,
  args: {
    billingUserId: Id<"users">;
    periodStartMs: number;
    periodEndMs: number;
    agentKeys: string[];
  },
) {
  const dateKeys = getDateKeysInRange(args.periodStartMs, args.periodEndMs);
  if (dateKeys.length === 0 || args.agentKeys.length === 0) {
    return { dateKeys, dailyUsage: [] as Array<Record<string, number | string>> };
  }

  const aggregateSums = await sumDailyCreditsForAgents(
    ctx,
    args.billingUserId,
    dateKeys,
    args.agentKeys,
  );
  const aggregateTotal = aggregateSums.reduce((sum, value) => sum + value, 0);

  if (aggregateTotal > 0) {
    return {
      dateKeys,
      dailyUsage: buildDailyUsageRows(dateKeys, args.agentKeys, aggregateSums),
    };
  }

  const logs = await listUsageLogsForPeriod(ctx, args.billingUserId, args.periodStartMs);
  return {
    dateKeys,
    dailyUsage: await buildDailyUsageFromLogs(ctx, logs, dateKeys, args.agentKeys),
  };
}

export const getAgentCreditUsage = query({
  args: {
    agentId: v.id("agents"),
    timeRange: creditTimeRangeValidator,
  },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx, args.agentId);

    const { userId } = await getAuthContext(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!user) {
      return null;
    }

    const { billingUser: userDoc } = await getBillingEntityForUser(ctx, user);
    const stripeInfo = await getPlanFromStripe(ctx, userDoc.workosUserId);
    const periodStartMs = getUsagePeriodStartMs(userDoc.stripeSubscriptionCurrentPeriodEnd);
    const periodEndMs =
      userDoc.stripeSubscriptionCurrentPeriodEnd ?? periodStartMs + MONTHLY_PERIOD_MS;
    const timeRange = args.timeRange ?? "period";
    const { rangeStartMs, rangeEndMs } = resolveCreditUsageRange(
      timeRange,
      periodStartMs,
      periodEndMs,
    );
    const dateKeys = getDateKeysInRange(rangeStartMs, rangeEndMs);
    const agentKey = args.agentId;

    const aggregateSums = await sumDailyCreditsForAgents(
      ctx,
      userDoc._id,
      dateKeys,
      [agentKey],
    );
    let dailyRows = buildDailyUsageRows(dateKeys, [agentKey], aggregateSums);
    const aggregateTotal = aggregateSums.reduce((sum, value) => sum + value, 0);

    if (aggregateTotal === 0) {
      const logs = await listUsageLogsForPeriod(ctx, userDoc._id, rangeStartMs);
      const conversationAgentCache = new Map<
        Id<"conversations">,
        Id<"agents"> | undefined
      >();
      const scopedLogs = [];

      for (const log of logs) {
        if (log.conversationId && !log.agentId && !conversationAgentCache.has(log.conversationId)) {
          const conversation = await ctx.db.get(log.conversationId);
          conversationAgentCache.set(log.conversationId, conversation?.assignedAgentId);
        }

        const resolvedAgentId =
          log.agentId ??
          (log.conversationId
            ? conversationAgentCache.get(log.conversationId)
            : undefined);

        if ((resolvedAgentId ?? ("unassigned" as const)) === args.agentId) {
          scopedLogs.push(log);
        }
      }

      dailyRows = await buildDailyUsageFromLogs(
        ctx,
        scopedLogs,
        dateKeys,
        [agentKey],
      );
    }

    let cumulativeCredits = 0;
    const dailyUsage = dailyRows.map((row) => {
      const credits = (row[agentKey] as number | undefined) ?? 0;
      cumulativeCredits += credits;
      return {
        date: row.date as string,
        credits,
        cumulativeCredits,
      };
    });
    const totalCreditsUsed = dailyUsage.reduce((sum, row) => sum + row.credits, 0);
    const usageRecords = await listAgentCreditUsageRecords(ctx, {
      billingUserId: userDoc._id,
      agentId: args.agentId,
      rangeStartMs,
      rangeEndMs,
    });
    const modelUsage = buildAgentModelCreditDailyUsage(usageRecords, dateKeys);

    return {
      plan: stripeInfo.plan,
      periodStartMs: rangeStartMs,
      periodEndMs: rangeEndMs,
      totalCreditsUsed,
      dailyUsage,
      modelUsage,
    };
  },
});

export const getAgentCreditSpendHistory = query({
  args: {
    agentId: v.id("agents"),
    timeRange: creditTimeRangeValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx, args.agentId);

    const { userId } = await getAuthContext(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!user) {
      return {
        periodStartMs: 0,
        periodEndMs: 0,
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const { billingUser: userDoc } = await getBillingEntityForUser(ctx, user);
    const periodStartMs = getUsagePeriodStartMs(userDoc.stripeSubscriptionCurrentPeriodEnd);
    const periodEndMs =
      userDoc.stripeSubscriptionCurrentPeriodEnd ?? periodStartMs + MONTHLY_PERIOD_MS;
    const timeRange = args.timeRange ?? "period";
    const { rangeStartMs, rangeEndMs } = resolveCreditUsageRange(
      timeRange,
      periodStartMs,
      periodEndMs,
    );
    const paginationResult = await paginateAgentCreditSpendHistory(ctx, {
      billingUserId: userDoc._id,
      agentId: args.agentId,
      rangeStartMs,
      rangeEndMs,
      paginationOpts: args.paginationOpts,
    });

    return {
      periodStartMs: rangeStartMs,
      periodEndMs: rangeEndMs,
      ...paginationResult,
    };
  },
});

export const backfillCreditUsageEvents = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.min(Math.max(args.batchSize ?? 200, 1), 500);
    const page = await ctx.db
      .query("creditLogs")
      .withIndex("by_createdAt")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: batchSize,
      });

    let inserted = 0;
    let skipped = 0;

    for (const log of page.page) {
      if (formatCreditLogEventType(log) !== "usage" || !log.userId) {
        skipped += 1;
        continue;
      }

      const credits = log.creditCost ?? Math.abs(log.amount);
      if (credits <= 0) {
        skipped += 1;
        continue;
      }

      const existing = await ctx.db
        .query("creditUsageEvents")
        .withIndex("by_creditLogId", (q) => q.eq("creditLogId", log._id))
        .unique();
      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("creditUsageEvents", {
        userId: log.userId,
        agentId: log.agentId,
        modelId: log.modelId,
        credits,
        conversationId: log.conversationId,
        creditLogId: log._id,
        createdAt: log.createdAt,
      });
      inserted += 1;
    }

    return {
      inserted,
      skipped,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
