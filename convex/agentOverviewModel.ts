import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  applyAgentOverviewDailyAggregates,
  listAgentOverviewDailyAggregates,
  listRawHumanEscalationsForAgent,
} from "./agentOverviewAggregates";
import { listAbandonedConversations } from "./agentOverviewAbandonments";
import { getMessagesToCloseStats } from "./agentOverviewClose";
import { addDailyValue, blankDailyRows, incrementDaily } from "./agentOverviewDaily";
import {
  getAiAssistedConversationStats,
  listAiMessagesForAgent,
  getOutgoingMessageCountsForConversations,
} from "./agentOverviewMessages";
import { assertAgentAccess } from "./agentUsage";
import { getAgentOverviewSentimentDistribution } from "./agentOverviewSentiment";
import { getAgentOverviewTrendingTopics } from "./agentOverviewTopics";
import { getAuthContext } from "./authUtils";
import { getBillingEntityForUser } from "./plans";
import { getActiveTeamForUser, normalizeTimeZone } from "./teamHelpers";
import { DAY_MS, getUsagePeriodStartMs } from "./usageMonthKey";
import { getDateKeysInTimeZoneRange } from "./timeZoneDateKeys";

const MONTHLY_PERIOD_MS = 30 * DAY_MS;
const MAX_OVERVIEW_ROWS = 5000;
const TIME_RANGE_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export type OverviewTimeRange = "7d" | "30d" | "90d" | "period";

async function getBillingPeriod(ctx: QueryCtx) {
  const { userDbId } = await getAuthContext(ctx);
  const user = await ctx.db.get(userDbId);
  if (user === null) {
    throw new Error("User not found");
  }

  const activeTeam = await getActiveTeamForUser(ctx, user);
  const { billingUser } = await getBillingEntityForUser(ctx, user);
  const periodStartMs = getUsagePeriodStartMs(
    billingUser.stripeSubscriptionCurrentPeriodEnd,
  );
  const periodEndMs =
    billingUser.stripeSubscriptionCurrentPeriodEnd ??
    periodStartMs + MONTHLY_PERIOD_MS;

  return {
    periodStartMs,
    periodEndMs,
    timeZone: normalizeTimeZone(activeTeam.timeZone),
  };
}

function resolveOverviewRange(
  timeRange: OverviewTimeRange,
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

async function listPeriodConversations(
  ctx: QueryCtx,
  agent: Doc<"agents">,
  periodStartMs: number,
  periodEndMs: number,
) {
  if (agent.orgId && agent.orgId !== "personal") {
    return await ctx.db
      .query("conversations")
      .withIndex("by_orgId_and_assignedAgentId_and_lastMessageAt", (q) =>
        q
          .eq("orgId", agent.orgId)
          .eq("assignedAgentId", agent._id)
          .gte("lastMessageAt", periodStartMs)
          .lt("lastMessageAt", periodEndMs),
      )
      .take(MAX_OVERVIEW_ROWS);
  }

  return await ctx.db
    .query("conversations")
    .withIndex("by_userId_and_assignedAgentId_and_lastMessageAt", (q) =>
      q
        .eq("userId", agent.userId)
        .eq("assignedAgentId", agent._id)
        .gte("lastMessageAt", periodStartMs)
        .lt("lastMessageAt", periodEndMs),
    )
    .take(MAX_OVERVIEW_ROWS);
}

async function listAiBookings(
  ctx: QueryCtx,
  agentId: Id<"agents">,
  periodStartMs: number,
  periodEndMs: number,
) {
  const rows = await ctx.db
    .query("calendarEvents")
    .withIndex("by_agentId_and_bookingSource_and_createdAt", (q) =>
      q
        .eq("agentId", agentId)
        .eq("bookingSource", "ai")
        .gte("createdAt", periodStartMs)
        .lt("createdAt", periodEndMs),
    )
    .take(MAX_OVERVIEW_ROWS);

  return rows.filter((event) => event.status !== "cancelled");
}

export async function getAgentOverviewSummary(
  ctx: QueryCtx,
  agentId: Id<"agents">,
  timeRange: OverviewTimeRange = "period",
) {
  const agent = await assertAgentAccess(ctx, agentId);
  const { periodStartMs, periodEndMs, timeZone } = await getBillingPeriod(ctx);
  const { rangeStartMs, rangeEndMs } = resolveOverviewRange(
    timeRange,
    periodStartMs,
    periodEndMs,
  );
  const dateKeys = getDateKeysInTimeZoneRange(
    rangeStartMs,
    rangeEndMs,
    timeZone,
  );
  const daily = blankDailyRows(dateKeys);
  const rowsByDate = new Map(daily.map((row) => [row.date, row]));
  const aggregateResult = await listAgentOverviewDailyAggregates(ctx, {
    agentId,
    timeZone,
    dateKeys,
  });
  const aggregateTotals = applyAgentOverviewDailyAggregates(
    rowsByDate,
    aggregateResult.rows,
    {
      aiAssistedConversations: aggregateResult.hasAiAssistedFacts,
      humanEscalations: aggregateResult.hasHumanEscalationFacts,
    },
  );
  const useAiAssistedAggregate = aggregateResult.hasAiAssistedFacts;
  const useHumanEscalationAggregate = aggregateResult.hasHumanEscalationFacts;
  const conversations = await listPeriodConversations(
    ctx,
    agent,
    rangeStartMs,
    rangeEndMs,
  );
  const aiMessages = useAiAssistedAggregate
    ? []
    : await listAiMessagesForAgent(ctx, agentId, rangeStartMs, rangeEndMs);
  const bookings = await listAiBookings(
    ctx,
    agentId,
    rangeStartMs,
    rangeEndMs,
  );
  const escalations = useHumanEscalationAggregate
    ? []
    : await listRawHumanEscalationsForAgent(ctx, agentId, rangeStartMs, rangeEndMs);
  const messageCounts = await getOutgoingMessageCountsForConversations(
    ctx,
    conversations,
    rangeStartMs,
    rangeEndMs,
    timeZone,
  );
  const aiAssistedStats = useAiAssistedAggregate
    ? null
    : getAiAssistedConversationStats(aiMessages, timeZone);
  const closeStats = await getMessagesToCloseStats(
    ctx,
    agentId,
    bookings,
    timeZone,
  );

  for (const conversation of conversations) {
    incrementDaily(rowsByDate, conversation.lastMessageAt, timeZone, "conversations");
  }
  messageCounts.dailyMessageCountsByDate.forEach((count, date) => {
    addDailyValue(rowsByDate, date, "messages", count);
  });
  aiAssistedStats?.dailyAiAssistedConversationCountsByDate.forEach((count, date) => {
    addDailyValue(rowsByDate, date, "aiAssistedConversations", count);
  });
  for (const message of aiMessages) {
    incrementDaily(rowsByDate, message.createdAt, timeZone, "aiMessages");
  }
  for (const booking of bookings) {
    incrementDaily(rowsByDate, booking.createdAt, timeZone, "bookings");
  }
  for (const escalation of escalations) {
    incrementDaily(rowsByDate, escalation.performedAt, timeZone, "escalations");
  }
  closeStats.dailyCloseStatsByDate.forEach((stats, date) => {
    addDailyValue(rowsByDate, date, "messagesToClose", stats.messagesToClose);
    addDailyValue(rowsByDate, date, "conversationsClosed", stats.conversationsClosed);
  });

  const conversationCount = conversations.length;
  const aiAssistedConversationCount =
    aiAssistedStats?.aiAssistedConversationCount ??
    aggregateTotals.aiAssistedConversations;
  const humanEscalations = useHumanEscalationAggregate
    ? aggregateTotals.humanEscalations
    : escalations.length;
  const bookedAppointments = bookings.length;
  const abandonedConversations = listAbandonedConversations(
    conversations,
    bookings,
  );
  for (const conversation of abandonedConversations) {
    incrementDaily(
      rowsByDate,
      conversation.lastCustomerMessageAt ?? conversation.lastMessageAt,
      timeZone,
      "abandonedConversations",
    );
  }

  return {
    periodStartMs: rangeStartMs,
    periodEndMs: rangeEndMs,
    timeZone,
    conversationCount,
    aiAssistedConversationCount,
    totalMessagesSent: messageCounts.totalMessagesSent,
    messagesSentByAgent: aiMessages.length,
    bookedAppointments,
    abandonedConversations: abandonedConversations.length,
    bookedRate:
      aiAssistedConversationCount === 0
        ? null
        : bookedAppointments / aiAssistedConversationCount,
    escalations: humanEscalations,
    avgMessagesToClose: closeStats.avgMessagesToClose,
    sentimentDistribution: getAgentOverviewSentimentDistribution(conversations),
    daily,
    trendingTopics: await getAgentOverviewTrendingTopics(
      ctx,
      conversations,
      rangeStartMs,
      rangeEndMs,
    ),
  };
}
