/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { recordWorkflowAutomationSentCost } from './workflowAutomationCost';

const modules = import.meta.glob('./**/*.ts');

test('records known sent costs once and keeps automation totals separate', async () => {
  const t = convexTest(schema, modules);
  const result = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert('agents', {
      name: 'Cost Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'cost-owner',
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert('workflows', {
      agentId,
      orgId: '',
      userId: 'cost-owner',
      name: 'Workflow',
      createdAt: now,
      updatedAt: now,
    });
    const insertRun = async (
      automationKind: 'reminder' | 'followUp',
      category: string,
      suffix: string,
    ) => {
      const runId = await ctx.db.insert('workflowAutomationRuns', {
        workflowId,
        agentId,
        orgId: '',
        automationKind,
        subjectType: automationKind === 'reminder' ? 'appointment' : 'conversation',
        subjectKey: suffix,
        deduplicationKey: suffix,
        configurationRevision: 1,
        activationScope: 'futureOnly',
        attempt: 1,
        scheduledAt: now,
        status: 'sent',
        workIds: [],
        templateSnapshot: {
          key: `${suffix}\ten_US`,
          name: suffix,
          language: 'en_US',
          category,
          components: [],
        },
        createdAt: now,
        updatedAt: now,
      });
      const run = await ctx.db.get(runId);
      await recordWorkflowAutomationSentCost(ctx, run!);
      return runId;
    };
    const reminderRunId = await insertRun('reminder', 'UTILITY', 'reminder');
    const reminderRun = await ctx.db.get(reminderRunId);
    await recordWorkflowAutomationSentCost(ctx, reminderRun!);
    await insertRun('followUp', 'MARKETING', 'follow-up');
    const reminderTotal = await ctx.db
      .query('workflowAutomationCostTotals')
      .withIndex('by_agentId_and_automationKind', (query) => (
        query.eq('agentId', agentId).eq('automationKind', 'reminder')
      ))
      .unique();
    const followUpTotal = await ctx.db
      .query('workflowAutomationCostTotals')
      .withIndex('by_agentId_and_automationKind', (query) => (
        query.eq('agentId', agentId).eq('automationKind', 'followUp')
      ))
      .unique();
    return { reminderRun: await ctx.db.get(reminderRunId), reminderTotal, followUpTotal };
  });
  expect(result.reminderRun?.estimatedCostMyr).toBe(0.07);
  expect(result.reminderTotal?.estimatedTotalSpentMyr).toBe(0.07);
  expect(result.reminderTotal?.pricedSentCount).toBe(1);
  expect(result.followUpTotal?.estimatedTotalSpentMyr).toBe(0.3467);
});

test('marks unknown template categories unpriced without guessing a cost', async () => {
  const t = convexTest(schema, modules);
  const result = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert('agents', {
      name: 'Unknown Cost Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'cost-owner',
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert('workflows', {
      agentId,
      orgId: '',
      userId: 'cost-owner',
      name: 'Workflow',
      createdAt: now,
      updatedAt: now,
    });
    const runId = await ctx.db.insert('workflowAutomationRuns', {
      workflowId,
      agentId,
      orgId: '',
      automationKind: 'reminder',
      subjectType: 'appointment',
      subjectKey: 'unknown',
      deduplicationKey: 'unknown',
      configurationRevision: 1,
      activationScope: 'futureOnly',
      attempt: 1,
      scheduledAt: now,
      status: 'sent',
      workIds: [],
      templateSnapshot: {
        key: 'unknown\ten_US',
        name: 'unknown',
        language: 'en_US',
        category: 'UNKNOWN',
        components: [],
      },
      createdAt: now,
      updatedAt: now,
    });
    const run = await ctx.db.get(runId);
    await recordWorkflowAutomationSentCost(ctx, run!);
    const total = await ctx.db
      .query('workflowAutomationCostTotals')
      .withIndex('by_agentId_and_automationKind', (query) => (
        query.eq('agentId', agentId).eq('automationKind', 'reminder')
      ))
      .unique();
    return { run: await ctx.db.get(runId), total };
  });
  expect(result.run?.costAccountingStatus).toBe('unpriced');
  expect(result.run?.estimatedCostMyr).toBeUndefined();
  expect(result.total?.estimatedTotalSpentMyr).toBe(0);
  expect(result.total?.unpricedSentCount).toBe(1);
});
