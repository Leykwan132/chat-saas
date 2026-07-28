/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import stripeSchema from '../node_modules/@convex-dev/stripe/dist/component/schema.js';
import workpoolSchema from '../node_modules/@convex-dev/workpool/dist/component/schema.js';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const stripeModules = {
  public: () =>
    import('../node_modules/@convex-dev/stripe/dist/component/public.js'),
  private: () =>
    import('../node_modules/@convex-dev/stripe/dist/component/private.js'),
  '_generated/server': () =>
    import(
      '../node_modules/@convex-dev/stripe/dist/component/_generated/server.js'
    ),
};
const workpoolModules = {
  complete: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/complete.js'),
  config: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/config.js'),
  crons: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/crons.js'),
  danger: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/danger.js'),
  kick: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/kick.js'),
  lib: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/lib.js'),
  logging: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/logging.js'),
  loop: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/loop.js'),
  recovery: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/recovery.js'),
  stats: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/stats.js'),
  worker: () =>
    import('../node_modules/@convex-dev/workpool/dist/component/worker.js'),
  '_generated/server': () =>
    import(
      '../node_modules/@convex-dev/workpool/dist/component/_generated/server.js'
    ),
};

function initTest() {
  const testContext = convexTest(schema, modules);
  testContext.registerComponent('stripe', stripeSchema, stripeModules);
  testContext.registerComponent(
    'teamDeletionWorkpool',
    workpoolSchema,
    workpoolModules,
  );
  return testContext;
}

describe('team Free price subscription update', () => {
  test('starts destructive cleanup once while preserving active Free billing', async () => {
    const testContext = initTest();
    const fixture = await testContext.run(async (ctx) => {
      const now = Date.now();
      const ownerId = await ctx.db.insert('users', {
        workosUserId: 'user_owner',
        email: 'owner@example.com',
        stripeCustomerId: 'cus_owner',
        stripeSubscriptionId: 'sub_team',
        stripePriceId: 'mock_pro_mo',
        stripeSubscriptionStatus: 'active',
        createdAt: now,
        updatedAt: now,
      });
      const personalTeamId = await ctx.db.insert('teams', {
        type: 'personal',
        name: 'Personal',
        ownerId,
        createdAt: now,
        updatedAt: now,
      });
      const teamId = await ctx.db.insert('teams', {
        type: 'organizational',
        name: 'Team',
        ownerId,
        workosOrgId: 'org_team',
        stripeSubscriptionId: 'sub_team',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('teamMemberships', {
        teamId,
        userId: ownerId,
        role: 'owner',
        createdAt: now,
      });
      const creditPeriodId = await ctx.db.insert('userCreditPeriods', {
        userId: ownerId,
        periodStart: now - 1_000,
        periodEnd: now + 30 * 24 * 60 * 60 * 1_000,
        grantedCredits: 15_000,
        usedCredits: 2_000,
        planKey: 'growth',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(ownerId, { activeTeamId: teamId });
      return { creditPeriodId, ownerId, personalTeamId, teamId };
    });

    const update = {
      orgId: 'org_team',
      stripeSubscriptionId: 'sub_team',
      stripeCustomerId: 'cus_owner',
      status: 'active',
      priceId: 'mock_free_mo',
      currentPeriodEnd: 1_900_000_000,
    };

    await testContext.mutation(
      internal.stripe.handleSubscriptionUpdatedInternal,
      update,
    );
    await testContext.mutation(
      internal.stripe.handleSubscriptionUpdatedInternal,
      update,
    );

    const state = await testContext.run(async (ctx) => ({
      team: await ctx.db.get(fixture.teamId),
      owner: await ctx.db.get(fixture.ownerId),
      creditPeriod: await ctx.db.get(fixture.creditPeriodId),
      jobs: await ctx.db
        .query('teamDeletionJobs')
        .withIndex('by_teamId', (query) => query.eq('teamId', fixture.teamId))
        .take(2),
      creditLogs: await ctx.db
        .query('creditLogs')
        .withIndex('by_userId_and_createdAt', (query) =>
          query.eq('userId', fixture.ownerId),
        )
        .take(2),
    }));

    expect(state.team?.deletionStatus).toBe('deleting');
    expect(state.team?.stripeSubscriptionId).toBeUndefined();
    expect(state.owner?.activeTeamId).toBe(fixture.personalTeamId);
    expect(state.owner?.stripeSubscriptionId).toBe('sub_team');
    expect(state.owner?.stripePriceId).toBe('mock_free_mo');
    expect(state.owner?.stripeSubscriptionStatus).toBe('active');
    expect(state.creditPeriod?.planKey).toBe('free');
    expect(state.creditPeriod?.grantedCredits).toBe(50);
    expect(state.creditPeriod?.usedCredits).toBe(0);
    expect(state.jobs).toHaveLength(1);
    expect(state.creditLogs).toHaveLength(1);
  });
});
