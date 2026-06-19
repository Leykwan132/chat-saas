import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { usageMonthKeyFromTimestamp } from "./usageMonthKey";

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
