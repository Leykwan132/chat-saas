import { customMutation, customCtx } from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { mutation as rawMutation, internalMutation as rawInternalMutation } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import {
  lifetimeAggregator,
  monthlyAggregator,
  agentMonthlyAggregator,
  agentCostAggregator,
  agentTokenAggregator,
  creditAgentDailyUsageAggregator,
  creditWorkspaceDailyUsageAggregator,
  creditAccountDailyUsageAggregator,
  analyticsMetrics,
  agentOverviewAiAssistedDailyAggregator,
  agentOverviewHumanEscalationsDailyAggregator,
} from "./aggregates";
import {
  refreshInboxSummariesForCalendarEvent,
  refreshInboxSummariesForChannel,
  refreshInboxSummariesForCustomer,
  removeInboxConversationSummary,
  upsertInboxConversationSummary,
} from "./inboxConversationSummary";
import {
  refreshInboxMessageSearchDocumentsForConversation,
  removeInboxChatSearchDocument,
  removeInboxMessageSearchDocument,
  upsertInboxChatSearchDocument,
  upsertInboxMessageSearchDocument,
} from "./inboxSearchProjection";

// 1. Initialize triggers registry
export const triggers = new Triggers<DataModel>();

// 2. Register TableAggregate triggers on rawAgentUsage table
triggers.register("rawAgentUsage", lifetimeAggregator.trigger());
triggers.register("rawAgentUsage", monthlyAggregator.trigger());
triggers.register("rawAgentUsage", agentMonthlyAggregator.trigger());
triggers.register("rawAgentUsage", agentCostAggregator.trigger());
triggers.register("rawAgentUsage", agentTokenAggregator.trigger());
triggers.register("creditUsageEvents", creditAgentDailyUsageAggregator.trigger());
triggers.register("creditUsageEvents", creditWorkspaceDailyUsageAggregator.trigger());
triggers.register("creditUsageEvents", creditAccountDailyUsageAggregator.trigger());
triggers.register("analyticsMetricEntries", analyticsMetrics.trigger());
triggers.register(
  "agentOverviewDailyConversationFacts",
  agentOverviewAiAssistedDailyAggregator.idempotentTrigger(),
);
triggers.register(
  "agentOverviewHumanEscalationFacts",
  agentOverviewHumanEscalationsDailyAggregator.idempotentTrigger(),
);
triggers.register("conversations", async (ctx, change) => {
  if (change.operation === "delete") {
    await removeInboxConversationSummary(ctx, change.id);
    return;
  }
  await upsertInboxConversationSummary(ctx, change.id);
});
triggers.register("inboxConversationSummaries", async (ctx, change) => {
  const conversationId = change.newDoc?.conversationId ?? change.oldDoc?.conversationId;
  if (conversationId === undefined) {
    return;
  }
  if (change.operation === "delete") {
    await removeInboxChatSearchDocument(ctx, conversationId);
  } else {
    await upsertInboxChatSearchDocument(ctx, conversationId);
  }
  await refreshInboxMessageSearchDocumentsForConversation(ctx, conversationId);
});
triggers.register("messages", async (ctx, change) => {
  if (change.operation === "delete") {
    await removeInboxMessageSearchDocument(ctx, change.id);
    return;
  }
  await upsertInboxMessageSearchDocument(ctx, change.id);
});
triggers.register("customers", async (ctx, change) => {
  await refreshInboxSummariesForCustomer(ctx, change.id);
});
triggers.register("channels", async (ctx, change) => {
  await refreshInboxSummariesForChannel(ctx, change.id);
});
triggers.register("appointmentBookingSessions", async (ctx, change) => {
  const conversationIds = new Set(
    [change.oldDoc?.conversationId, change.newDoc?.conversationId].filter(
      (conversationId): conversationId is NonNullable<typeof conversationId> =>
        conversationId !== undefined,
    ),
  );
  for (const conversationId of conversationIds) {
    await upsertInboxConversationSummary(ctx, conversationId);
  }
});
triggers.register("calendarEvents", async (ctx, change) => {
  await refreshInboxSummariesForCalendarEvent(ctx, change.id);
});

// Export trigger-wrapped mutations to automatically keep aggregates in sync
export const mutation = customMutation(
  rawMutation,
  customCtx(triggers.wrapDB)
);

export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB)
);
