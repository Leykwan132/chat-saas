/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { recordWorkflowAutomationSentCost } from './workflowAutomationCost';

const modules = import.meta.glob('./**/*.ts');

test('returns agent-isolated history without exposing Workpool reasons', async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId: 'history-owner',
      email: 'history@example.com',
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'personal',
      name: 'Personal',
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('teamMemberships', { teamId, userId, role: 'owner', createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert('agents', {
      name: 'History Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'history-owner',
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert('workflows', {
      agentId,
      orgId: '',
      userId: 'history-owner',
      name: 'Workflow',
      createdAt: now,
      updatedAt: now,
    });
    for (let index = 0; index < 30; index += 1) {
      const runId = await ctx.db.insert('workflowAutomationRuns', {
        workflowId,
        agentId,
        orgId: '',
        automationKind: 'reminder',
        subjectType: 'appointment',
        subjectKey: `appointment-${index}`,
        deduplicationKey: `reminder-${index}`,
        configurationRevision: 1,
        activationScope: 'futureOnly',
        attempt: 1,
        scheduledAt: now + index,
        status: index % 2 === 0 ? 'sent' : 'cancelled',
        reason: index === 29
          ? 'Workpool job cancelled'
          : index === 27
            ? 'Appointment cancelled'
            : index === 25
              ? 'Background workpool retry cancelled'
              : undefined,
        workIds: [`work-${index}`],
        templateSnapshot: {
          key: 'reminder\ten_US',
          name: 'reminder',
          language: 'en_US',
          category: 'UTILITY',
          components: [],
        },
        createdAt: now + index,
        updatedAt: now + index,
      });
      if (index % 2 === 0) {
        const run = await ctx.db.get(runId);
        await recordWorkflowAutomationSentCost(ctx, run!);
      }
    }
    return { agentId };
  });
  const authed = t.withIdentity({ subject: 'history-owner' });
  const firstPage = await authed.query(api.workflowAutomationHistory.list, {
    agentId: fixture.agentId,
    automationKind: 'reminder',
    paginationOpts: { numItems: 25, cursor: null },
  });
  expect(firstPage.page).toHaveLength(25);
  expect(firstPage.page[0].subjectKey).toBe('appointment-29');
  expect(firstPage.page[0].status).toBe('cancelled');
  expect(firstPage.page[0].reason).toBeUndefined();
  expect(firstPage.page[0].estimatedCostMyr).toBeUndefined();
  expect(firstPage.page[1].estimatedCostMyr).toBe(0.07);
  expect(firstPage.page[2]).toMatchObject({ reason: 'Appointment cancelled' });
  expect(firstPage.page[4].reason).toBeUndefined();
  expect(firstPage.isDone).toBe(false);
  const estimatedTotal = await authed.query(api.workflowAutomationHistory.estimatedTotal, {
    agentId: fixture.agentId,
    automationKind: 'reminder',
  });
  expect(estimatedTotal.estimatedTotalSpentMyr).toBe(1.05);
  expect(estimatedTotal.sentCount).toBe(15);
  await expect(t.withIdentity({ subject: 'intruder' }).query(
    api.workflowAutomationHistory.list,
    {
      agentId: fixture.agentId,
      automationKind: 'reminder',
      paginationOpts: { numItems: 25, cursor: null },
    },
  )).rejects.toThrow();
  await expect(t.withIdentity({ subject: 'intruder' }).query(
    api.workflowAutomationHistory.estimatedTotal,
    { agentId: fixture.agentId, automationKind: 'reminder' },
  )).rejects.toThrow();
});
