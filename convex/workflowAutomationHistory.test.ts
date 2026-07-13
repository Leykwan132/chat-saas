/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

test('returns 25 newest agent-isolated workflow automation history records', async () => {
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
      await ctx.db.insert('workflowAutomationRuns', {
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
  expect(firstPage.isDone).toBe(false);
  await expect(t.withIdentity({ subject: 'intruder' }).query(
    api.workflowAutomationHistory.list,
    {
      agentId: fixture.agentId,
      automationKind: 'reminder',
      paginationOpts: { numItems: 25, cursor: null },
    },
  )).rejects.toThrow();
});
