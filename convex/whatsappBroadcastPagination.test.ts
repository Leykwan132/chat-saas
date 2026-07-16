/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

test('paginates broadcast schedules newest first without overlap', async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId: 'broadcast-pagination-owner',
      email: 'broadcast-pagination@example.com',
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'personal',
      name: 'Personal Workspace',
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert('agents', {
      name: 'Broadcast Pagination Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'broadcast-pagination-owner',
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert('channels', {
      orgId: '',
      service: 'whatsapp',
      wabaId: 'broadcast-pagination-waba',
      phoneNumberId: 'broadcast-pagination-phone',
      accessToken: 'test-token',
      status: 'connected',
      connectedByUserId: 'broadcast-pagination-owner',
      createdAt: now,
      updatedAt: now,
    });
    for (let index = 0; index < 12; index += 1) {
      await ctx.db.insert('whatsappBroadcastSchedules', {
        agentId,
        orgId: '',
        channelId,
        templateName: `campaign-${index}`,
        templateLanguage: 'en',
        scheduledAt: now + index,
        status: 'completed',
        createdBy: 'broadcast-pagination-owner',
        createdAt: now + index,
        totalCount: 1,
        okCount: 1,
        failCount: 0,
      });
    }
    return { agentId };
  });
  const authed = t.withIdentity({ subject: 'broadcast-pagination-owner' });
  const firstPage = await authed.query(api.whatsappBroadcast.listSchedulesForAgent, {
    agentId: fixture.agentId,
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(firstPage.page).toHaveLength(10);
  expect(firstPage.page.map((item) => item.templateName)).toEqual([
    'campaign-11',
    'campaign-10',
    'campaign-9',
    'campaign-8',
    'campaign-7',
    'campaign-6',
    'campaign-5',
    'campaign-4',
    'campaign-3',
    'campaign-2',
  ]);
  expect(firstPage.isDone).toBe(false);

  const secondPage = await authed.query(api.whatsappBroadcast.listSchedulesForAgent, {
    agentId: fixture.agentId,
    paginationOpts: { numItems: 10, cursor: firstPage.continueCursor },
  });
  expect(secondPage.page.map((item) => item.templateName)).toEqual([
    'campaign-1',
    'campaign-0',
  ]);
  expect(secondPage.isDone).toBe(true);
  expect(
    new Set(
      [...firstPage.page, ...secondPage.page].map((item) => item._id),
    ).size,
  ).toBe(12);
});
