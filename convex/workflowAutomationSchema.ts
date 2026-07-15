import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  workflowAutomationActivationScopeValidator,
  workflowWhatsappTemplateSnapshotValidator,
} from './workflowAutomationValidators';

export const workflowAutomationRunStatusValidator = v.union(
  v.literal('scheduled'),
  v.literal('sent'),
  v.literal('failed'),
  v.literal('skipped'),
  v.literal('cancelled'),
);

export const workflowAutomationRunsTable = defineTable({
  workflowId: v.id('workflows'),
  agentId: v.id('agents'),
  orgId: v.string(),
  automationKind: v.union(v.literal('reminder'), v.literal('followUp')),
  subjectType: v.union(
    v.literal('appointment'),
    v.literal('conversation'),
    v.literal('reconciliation'),
  ),
  subjectKey: v.string(),
  deduplicationKey: v.string(),
  appointmentId: v.optional(v.id('calendarEvents')),
  appointmentStartAt: v.optional(v.number()),
  conversationId: v.optional(v.id('conversations')),
  customerId: v.optional(v.id('customers')),
  channelId: v.optional(v.id('channels')),
  sourceMessageId: v.optional(v.id('messages')),
  configurationRevision: v.number(),
  activationScope: workflowAutomationActivationScopeValidator,
  attempt: v.number(),
  scheduledAt: v.number(),
  status: workflowAutomationRunStatusValidator,
  currentWorkId: v.optional(v.string()),
  workIds: v.array(v.string()),
  templateSnapshot: workflowWhatsappTemplateSnapshotValidator,
  reason: v.optional(v.string()),
  providerMessageId: v.optional(v.string()),
  estimatedCostMyr: v.optional(v.number()),
  costAccountingStatus: v.optional(v.union(v.literal('priced'), v.literal('unpriced'))),
  attemptedAt: v.optional(v.number()),
  sentAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_deduplicationKey', ['deduplicationKey'])
  .index('by_agentId_and_automationKind_and_updatedAt', [
    'agentId',
    'automationKind',
    'updatedAt',
  ])
  .index('by_agentId_and_automationKind_and_status', [
    'agentId',
    'automationKind',
    'status',
  ])
  .index('by_appointmentId', ['appointmentId'])
  .index('by_conversationId', ['conversationId']);

export const workflowAutomationCostTotalsTable = defineTable({
  agentId: v.id('agents'),
  automationKind: v.union(v.literal('reminder'), v.literal('followUp')),
  estimatedTotalSpentMyr: v.number(),
  pricedSentCount: v.number(),
  unpricedSentCount: v.number(),
  updatedAt: v.number(),
}).index('by_agentId_and_automationKind', ['agentId', 'automationKind']);

export const workflowFollowUpTimersTable = defineTable({
  workflowId: v.id('workflows'),
  agentId: v.id('agents'),
  conversationId: v.id('conversations'),
  customerId: v.id('customers'),
  channelId: v.id('channels'),
  configurationRevision: v.number(),
  latestOutboundMessageId: v.id('messages'),
  latestOutboundAt: v.number(),
  dueAt: v.number(),
  nextAttempt: v.number(),
  status: v.union(v.literal('active'), v.literal('closed'), v.literal('cancelled')),
  currentRunId: v.optional(v.id('workflowAutomationRuns')),
  currentWorkId: v.optional(v.string()),
  workIds: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_workflowId_and_conversationId', ['workflowId', 'conversationId'])
  .index('by_agentId_and_status', ['agentId', 'status'])
  .index('by_conversationId', ['conversationId']);

export const workflowAutomationOperationsTable = defineTable({
  workflowId: v.id('workflows'),
  agentId: v.id('agents'),
  automationKind: v.union(v.literal('reminder'), v.literal('followUp')),
  operationKind: v.union(v.literal('reconcile'), v.literal('cancel')),
  configurationRevision: v.number(),
  status: v.union(
    v.literal('scheduled'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('cancelled'),
  ),
  currentWorkId: v.optional(v.string()),
  cursor: v.optional(v.string()),
  workIds: v.array(v.string()),
  reason: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index('by_agentId_and_automationKind_and_status', [
  'agentId',
  'automationKind',
  'status',
]);
