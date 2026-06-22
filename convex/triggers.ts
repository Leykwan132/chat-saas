import { customMutation, customCtx } from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { mutation as rawMutation, internalMutation as rawInternalMutation } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import {
  lifetimeAggregator,
  monthlyAggregator,
  agentMonthlyAggregator,
  creditAgentDailyUsageAggregator,
  creditWorkspaceDailyUsageAggregator,
  creditAccountDailyUsageAggregator,
  analyticsMetrics,
} from "./aggregates";

// 1. Initialize triggers registry
export const triggers = new Triggers<DataModel>();

// 2. Register TableAggregate triggers on rawAgentUsage table
triggers.register("rawAgentUsage", lifetimeAggregator.trigger());
triggers.register("rawAgentUsage", monthlyAggregator.trigger());
triggers.register("rawAgentUsage", agentMonthlyAggregator.trigger());
triggers.register("creditUsageEvents", creditAgentDailyUsageAggregator.trigger());
triggers.register("creditUsageEvents", creditWorkspaceDailyUsageAggregator.trigger());
triggers.register("creditUsageEvents", creditAccountDailyUsageAggregator.trigger());
triggers.register("analyticsMetricEntries", analyticsMetrics.trigger());

// Export trigger-wrapped mutations to automatically keep aggregates in sync
export const mutation = customMutation(
  rawMutation,
  customCtx(triggers.wrapDB)
);

export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB)
);
