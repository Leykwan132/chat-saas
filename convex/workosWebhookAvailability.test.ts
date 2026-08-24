/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

test('enables a new organizational member for existing agents', async () => {
  const t = convexTest(schema, modules);
  const agentId = await t.run(async (ctx) => {
    const now = Date.now();
    const ownerId = await ctx.db.insert('users', {
      workosUserId: 'existing-team-owner',
      email: 'owner@example.com',
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'organizational',
      name: 'New Member Availability',
      ownerId,
      workosOrgId: 'org-new-member',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('teamMemberships', {
      teamId,
      userId: ownerId,
      role: 'owner',
      createdAt: now,
    });
    return await ctx.db.insert('agents', {
      name: 'Existing Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Availability defaults',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'existing-team-owner',
      orgId: 'org-new-member',
      createdAt: now,
      updatedAt: now,
    });
  });

  await t.mutation(internal.workosWebhook.dispatch, {
    eventId: 'event-new-member-availability',
    eventType: 'organization_membership.created',
    data: {
      user_id: 'new-availability-member',
      organization_id: 'org-new-member',
      role: { slug: 'member' },
      email: 'new-member@example.com',
    },
  });

  const { schedule, shifts } = await t.run(async (ctx) => {
    const schedule = await ctx.db
      .query('userSchedules')
      .withIndex('by_agentId_and_workosUserId', (q) =>
        q.eq('agentId', agentId).eq('workosUserId', 'new-availability-member'),
      )
      .unique();
    return {
      schedule,
      shifts: schedule === null
        ? []
        : await ctx.db
          .query('userShifts')
          .withIndex('by_userScheduleId', (q) => q.eq('userScheduleId', schedule._id))
          .collect(),
    };
  });

  expect(schedule?.enabled).toBe(true);
  expect(shifts.map(({ dayOfWeek, startMinutes, endMinutes }) => ({
    dayOfWeek,
    startMinutes,
    endMinutes,
  }))).toEqual([
    { dayOfWeek: 1, startMinutes: 540, endMinutes: 1020 },
    { dayOfWeek: 2, startMinutes: 540, endMinutes: 1020 },
    { dayOfWeek: 3, startMinutes: 540, endMinutes: 1020 },
    { dayOfWeek: 4, startMinutes: 540, endMinutes: 1020 },
    { dayOfWeek: 5, startMinutes: 540, endMinutes: 1020 },
  ]);
});
