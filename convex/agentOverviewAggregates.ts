import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { DailyOverviewRow } from "./agentOverviewDaily";
import {
  agentOverviewAiAssistedDailyAggregator,
  agentOverviewDailyNamespace,
  agentOverviewHumanEscalationsDailyAggregator,
} from "./aggregates";
import {
  getActiveTeamForUser,
  getTeamByWorkosOrgId,
  getUserByWorkosId,
  normalizeTimeZone,
  PERSONAL_ORG_ID,
} from "./teamHelpers";
import { toTimeZoneDateKey } from "./timeZoneDateKeys";
import { triggers } from "./triggers";

const MAX_RAW_ESCALATION_ROWS = 5000;

type AgentOverviewAggregateTotals = {
  aiAssistedConversations: number;
  humanEscalations: number;
};

export type AgentOverviewDailyAggregateRow = {
  date: string;
  aiAssistedConversations: number;
  humanEscalations: number;
};

export type AgentOverviewDailyAggregateResult = {
  rows: AgentOverviewDailyAggregateRow[];
  hasAiAssistedFacts: boolean;
  hasHumanEscalationFacts: boolean;
};

async function resolveConversationTimeZone(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
) {
  if (conversation.orgId !== PERSONAL_ORG_ID && conversation.orgId !== "personal") {
    const team = await getTeamByWorkosOrgId(ctx, conversation.orgId);
    return normalizeTimeZone(team?.timeZone);
  }

  if (conversation.userId !== undefined) {
    const user = await getUserByWorkosId(ctx, conversation.userId);
    if (user !== null) {
      const team = await getActiveTeamForUser(ctx, user);
      return normalizeTimeZone(team.timeZone);
    }
  }

  return normalizeTimeZone(undefined);
}

export async function recordAiAssistedConversationFact(
  ctx: MutationCtx,
  args: {
    conversation: Doc<"conversations">;
    agentId: Id<"agents">;
    timestamp: number;
  },
) {
  const timeZone = await resolveConversationTimeZone(ctx, args.conversation);
  const date = toTimeZoneDateKey(args.timestamp, timeZone);
  const existingFact = await ctx.db
    .query("agentOverviewDailyConversationFacts")
    .withIndex("by_agentId_and_conversationId_and_timeZone_and_date", (q) =>
      q
        .eq("agentId", args.agentId)
        .eq("conversationId", args.conversation._id)
        .eq("timeZone", timeZone)
        .eq("date", date),
    )
    .unique();

  if (existingFact !== null) {
    return;
  }

  const triggerCtx = triggers.wrapDB(ctx);
  await triggerCtx.db.insert("agentOverviewDailyConversationFacts", {
    agentId: args.agentId,
    conversationId: args.conversation._id,
    orgId: args.conversation.orgId,
    timeZone,
    date,
    createdAt: args.timestamp,
  });
}

export async function recordHumanEscalationFact(
  ctx: MutationCtx,
  args: {
    conversation: Doc<"conversations">;
    agentId: Id<"agents">;
    conversationLogId?: Id<"conversationLogs">;
    timestamp: number;
  },
) {
  if (args.conversationLogId !== undefined) {
    const existingFact = await ctx.db
      .query("agentOverviewHumanEscalationFacts")
      .withIndex("by_conversationLogId", (q) =>
        q.eq("conversationLogId", args.conversationLogId),
      )
      .unique();

    if (existingFact !== null) {
      return;
    }
  }

  const timeZone = await resolveConversationTimeZone(ctx, args.conversation);
  const date = toTimeZoneDateKey(args.timestamp, timeZone);
  const triggerCtx = triggers.wrapDB(ctx);
  await triggerCtx.db.insert("agentOverviewHumanEscalationFacts", {
    agentId: args.agentId,
    conversationId: args.conversation._id,
    conversationLogId: args.conversationLogId,
    orgId: args.conversation.orgId,
    timeZone,
    date,
    createdAt: args.timestamp,
  });
}

export const recordAiAssistedConversationAggregate = recordAiAssistedConversationFact;

function dateBounds(date: string) {
  return { lower: { key: date, inclusive: true }, upper: { key: date, inclusive: true } };
}

async function hasAiAssistedFacts(
  ctx: QueryCtx,
  args: {
    agentId: Id<"agents">;
    timeZone: string;
    firstDate: string;
    lastDate: string;
  },
) {
  const fact = await ctx.db
    .query("agentOverviewDailyConversationFacts")
    .withIndex("by_agentId_and_timeZone_and_date", (q) =>
      q
        .eq("agentId", args.agentId)
        .eq("timeZone", args.timeZone)
        .gte("date", args.firstDate)
        .lte("date", args.lastDate),
    )
    .first();

  return fact !== null;
}

async function hasHumanEscalationFacts(
  ctx: QueryCtx,
  args: {
    agentId: Id<"agents">;
    timeZone: string;
    firstDate: string;
    lastDate: string;
  },
) {
  const fact = await ctx.db
    .query("agentOverviewHumanEscalationFacts")
    .withIndex("by_agentId_and_timeZone_and_date", (q) =>
      q
        .eq("agentId", args.agentId)
        .eq("timeZone", args.timeZone)
        .gte("date", args.firstDate)
        .lte("date", args.lastDate),
    )
    .first();

  return fact !== null;
}

async function listAggregateRows(
  ctx: QueryCtx,
  args: {
    agentId: Id<"agents">;
    timeZone: string;
    dateKeys: string[];
  },
) {
  const namespace = agentOverviewDailyNamespace(args.agentId, args.timeZone);
  const requests = args.dateKeys.map((date) => ({
    namespace,
    bounds: dateBounds(date),
  }));
  const aiAssistedSums =
    requests.length > 0
      ? await agentOverviewAiAssistedDailyAggregator.sumBatch(ctx, requests)
      : [];
  const humanEscalationSums =
    requests.length > 0
      ? await agentOverviewHumanEscalationsDailyAggregator.sumBatch(ctx, requests)
      : [];

  return args.dateKeys.map((date, index) => ({
    date,
    aiAssistedConversations: aiAssistedSums[index] ?? 0,
    humanEscalations: humanEscalationSums[index] ?? 0,
  }));
}

export async function listAgentOverviewDailyAggregates(
  ctx: QueryCtx,
  args: {
    agentId: Id<"agents">;
    timeZone: string;
    dateKeys: string[];
  },
): Promise<AgentOverviewDailyAggregateResult> {
  const firstDate = args.dateKeys[0];
  const lastDate = args.dateKeys.at(-1);
  if (firstDate === undefined || lastDate === undefined) {
    return {
      rows: [],
      hasAiAssistedFacts: false,
      hasHumanEscalationFacts: false,
    };
  }

  const rows = await listAggregateRows(ctx, args);
  const hasAiAssisted = await hasAiAssistedFacts(ctx, {
    agentId: args.agentId,
    timeZone: args.timeZone,
    firstDate,
    lastDate,
  });
  const hasHumanEscalation = await hasHumanEscalationFacts(ctx, {
    agentId: args.agentId,
    timeZone: args.timeZone,
    firstDate,
    lastDate,
  });

  return {
    rows,
    hasAiAssistedFacts: hasAiAssisted,
    hasHumanEscalationFacts: hasHumanEscalation,
  };
}

export async function listRawHumanEscalationsForAgent(
  ctx: QueryCtx,
  agentId: Id<"agents">,
  periodStartMs: number,
  periodEndMs: number,
) {
  return await ctx.db
    .query("conversationLogs")
    .withIndex("by_actorAgentId_and_action_and_performedAt", (q) =>
      q
        .eq("actorAgentId", agentId)
        .eq("action", "escalation_raised")
        .gte("performedAt", periodStartMs)
        .lt("performedAt", periodEndMs),
    )
    .take(MAX_RAW_ESCALATION_ROWS);
}

export function applyAgentOverviewDailyAggregates(
  rowsByDate: Map<string, DailyOverviewRow>,
  aggregateRows: AgentOverviewDailyAggregateRow[],
  options: {
    aiAssistedConversations: boolean;
    humanEscalations: boolean;
  },
): AgentOverviewAggregateTotals {
  const totals = {
    aiAssistedConversations: 0,
    humanEscalations: 0,
  };

  for (const aggregateRow of aggregateRows) {
    const row = rowsByDate.get(aggregateRow.date);
    if (options.aiAssistedConversations) {
      totals.aiAssistedConversations += aggregateRow.aiAssistedConversations;
    }
    if (options.humanEscalations) {
      totals.humanEscalations += aggregateRow.humanEscalations;
    }
    if (row !== undefined && options.aiAssistedConversations) {
      row.aiAssistedConversations += aggregateRow.aiAssistedConversations;
    }
    if (row !== undefined && options.humanEscalations) {
      row.escalations += aggregateRow.humanEscalations;
    }
  }

  return totals;
}
