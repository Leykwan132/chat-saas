import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { usageMonthKeyFromTimestamp, creditDailyUsageNamespace, toUtcDateKey } from "./usageMonthKey";
import {
  agentCostNamespace,
  agentCostSortKey,
  resolveAgentCostUsd,
  type AgentCostSortKey,
} from "./agentCostAggregateModel";

export const lifetimeAggregator = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "rawAgentUsage";
  Namespace: string;
}>(components.modelLifetimeUsage, {
  sortKey: (doc) => doc.usage.totalTokens,
  sumValue: (doc) => doc.usage.totalTokens,
  namespace: (doc) => doc.model,
});

export const monthlyAggregator = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "rawAgentUsage";
  Namespace: string;
}>(components.modelMonthlyUsage, {
  sortKey: (doc) => doc.usage.totalTokens,
  sumValue: (doc) => doc.usage.totalTokens,
  namespace: (doc) =>
    `${usageMonthKeyFromTimestamp(doc.createdAt)}:${doc.model}`,
});

export const agentMonthlyAggregator = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "rawAgentUsage";
  Namespace: string;
}>(components.agentMonthlyUsage, {
  sortKey: (doc) => doc.usage.totalTokens,
  sumValue: (doc) => doc.usage.totalTokens,
  namespace: (doc) =>
    `${usageMonthKeyFromTimestamp(doc.createdAt)}:${doc.agentId ?? "unassigned"}`,
});

export const agentCostAggregator = new TableAggregate<{
  Key: AgentCostSortKey;
  DataModel: DataModel;
  TableName: "rawAgentUsage";
  Namespace: string;
}>(components.agentCostUsage, {
  sortKey: agentCostSortKey,
  sumValue: (doc) => resolveAgentCostUsd(doc) ?? 0,
  namespace: agentCostNamespace,
});

export const creditAgentDailyUsageAggregator = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "creditUsageEvents";
  Namespace: string;
}>(components.creditDailyUsage, {
  sortKey: (doc) => doc.credits,
  sumValue: (doc) => doc.credits,
  namespace: (doc) =>
    creditDailyUsageNamespace(
      doc.userId,
      toUtcDateKey(doc.createdAt),
      doc.agentId ?? "unassigned",
    ),
});

export const creditWorkspaceDailyUsageAggregator = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "creditUsageEvents";
  Namespace: string;
}>(components.creditWorkspaceDailyUsage, {
  sortKey: (doc) => doc.credits,
  sumValue: (doc) => doc.credits,
  namespace: (doc) => `${doc.userId}:${doc.orgId ?? ""}:${toUtcDateKey(doc.createdAt)}`,
});

export const creditAccountDailyUsageAggregator = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "creditUsageEvents";
  Namespace: string;
}>(components.creditAccountDailyUsage, {
  sortKey: (doc) => doc.credits,
  sumValue: (doc) => doc.credits,
  namespace: (doc) => `${doc.userId}:${toUtcDateKey(doc.createdAt)}`,
});

export const analyticsMetrics = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "analyticsMetricEntries";
  Namespace: string;
}>(components.analyticsMetrics, {
  sortKey: (doc) => doc.sortKey,
  sumValue: (doc) => doc.value,
  namespace: (doc) => doc.namespace,
});

export function agentOverviewDailyNamespace(
  agentId: string,
  timeZone: string,
): string {
  return `${agentId}:${timeZone}`;
}

export const agentOverviewAiAssistedDailyAggregator = new TableAggregate<{
  Key: string;
  DataModel: DataModel;
  TableName: "agentOverviewDailyConversationFacts";
  Namespace: string;
}>(components.agentOverviewAiAssistedDaily, {
  sortKey: (doc) => doc.date,
  sumValue: () => 1,
  namespace: (doc) => agentOverviewDailyNamespace(doc.agentId, doc.timeZone),
});

export const agentOverviewHumanEscalationsDailyAggregator = new TableAggregate<{
  Key: string;
  DataModel: DataModel;
  TableName: "agentOverviewHumanEscalationFacts";
  Namespace: string;
}>(components.agentOverviewHumanEscalationsDaily, {
  sortKey: (doc) => doc.date,
  sumValue: () => 1,
  namespace: (doc) => agentOverviewDailyNamespace(doc.agentId, doc.timeZone),
});
