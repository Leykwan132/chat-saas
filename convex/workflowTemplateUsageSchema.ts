import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const workflowTemplateIdValidator = v.union(
  v.literal('qa'),
  v.literal('real-estate'),
  v.literal('e-commerce'),
);

export const workflowTemplateUsageTable = defineTable({
  agentId: v.id('agents'),
  templateId: workflowTemplateIdValidator,
  firstUsedAt: v.number(),
  lastUsedAt: v.number(),
  saveCount: v.number(),
}).index('by_agentId_and_templateId', ['agentId', 'templateId']);

export const workflowTemplateUsageTotalsTable = defineTable({
  templateId: workflowTemplateIdValidator,
  uniqueAgentCount: v.number(),
  saveCount: v.number(),
  updatedAt: v.number(),
}).index('by_templateId', ['templateId']);
