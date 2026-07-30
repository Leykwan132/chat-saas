import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { getPlan } from './plans';
import { resolvePlanKeyFromStripePriceId } from './planCatalog';
import {
  applyPlanUpgradeToCurrentPeriod,
  ensureFirstCreditPeriod,
  snapshotUserCredit,
} from './creditPeriodPool';
import { insertCreditLog } from './creditLogs';
import { requestTeamDeletion } from './teamDeletion/request';
import { getPersonalTeamForUser, getTeamByWorkosOrgId } from './teamHelpers';

export type SubscriptionUpdateArgs = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: number;
  orgId: string;
};

export type SubscriptionDeletedArgs = {
  stripeSubscriptionId: string;
  orgId: string;
};

export async function handleSubscriptionUpdated(
  ctx: MutationCtx,
  args: SubscriptionUpdateArgs,
): Promise<null> {
  const isPersonal = args.orgId.startsWith('user_');
  const isActive = args.status === 'active' || args.status === 'trialing';
  const plan = isActive
    ? resolvePlanKeyFromStripePriceId(args.priceId)
    : 'free';
  const planConfig = getPlan(plan);
  const newPeriodEndMs = args.currentPeriodEnd * 1000;

  let owner: Doc<'users'>;
  if (isPersonal) {
    const user = await ctx.db
      .query('users')
      .withIndex('by_workosUserId', (query) =>
        query.eq('workosUserId', args.orgId),
      )
      .unique();
    if (!user) {
      throw new Error('User not found');
    }
    const personalTeam = await getPersonalTeamForUser(ctx, user._id);
    if (personalTeam) {
      await ctx.db.patch(personalTeam._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedAt: Date.now(),
      });
    }
    owner = user;
  } else {
    const team = await getTeamByWorkosOrgId(ctx, args.orgId);
    if (!team) {
      throw new Error(`Team not found for organization ${args.orgId}`);
    }
    if (team.deletionStatus !== 'deleting') {
      await ctx.db.patch(team._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedAt: Date.now(),
      });
    }
    if (!team.ownerId) {
      throw new Error('Team owner not found');
    }
    const ownerDoc = await ctx.db.get(team.ownerId);
    if (!ownerDoc) {
      throw new Error('Team owner not found');
    }
    owner = ownerDoc;
  }

  const isPlanChanged = owner.stripePriceId !== args.priceId;
  await ctx.db.patch(owner._id, {
    stripeCustomerId: args.stripeCustomerId,
    stripeSubscriptionId: args.stripeSubscriptionId,
    stripePriceId: args.priceId,
    stripeSubscriptionStatus: args.status,
    stripeSubscriptionCurrentPeriodEnd: newPeriodEndMs,
    updatedAt: Date.now(),
  });
  await ensureFirstCreditPeriod(ctx, owner._id);

  if (!isPersonal && isActive && plan === 'free') {
    await requestTeamDeletion(ctx, {
      workosOrgId: args.orgId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      source: 'stripe',
      preserveOwnerSubscription: true,
    });
    return null;
  }

  if (isPlanChanged && isActive) {
    const before = await snapshotUserCredit(ctx, owner._id);
    await applyPlanUpgradeToCurrentPeriod(ctx, owner._id);
    const after = await snapshotUserCredit(ctx, owner._id);
    await insertCreditLog(ctx, {
      orgId: isPersonal ? '' : args.orgId,
      userId: owner._id,
      eventType: 'grant',
      label: `Plan change (${planConfig.name})`,
      amount: after.totalRemaining - before.totalRemaining,
      balanceBefore: before.totalRemaining,
      balanceAfter: after.totalRemaining,
      monthlyCreditsBefore: before.monthlyRemaining,
      monthlyCreditsAfter: after.monthlyRemaining,
      purchasedCreditsBefore: before.purchasedRemaining,
      purchasedCreditsAfter: after.purchasedRemaining,
      reason: `Subscription changed to ${planConfig.name} plan`,
    });
  }
  return null;
}

export async function handleSubscriptionDeleted(
  ctx: MutationCtx,
  args: SubscriptionDeletedArgs,
): Promise<{ accepted: true; duplicate: boolean }> {
  const isPersonal = args.orgId.startsWith('user_');
  if (!isPersonal) {
    return await requestTeamDeletion(ctx, {
      workosOrgId: args.orgId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      source: 'stripe',
    });
  }

  const owner = await ctx.db
    .query('users')
    .withIndex('by_workosUserId', (query) =>
      query.eq('workosUserId', args.orgId),
    )
    .unique();
  if (!owner) {
    throw new Error('User not found');
  }
  const personalTeam = await getPersonalTeamForUser(ctx, owner._id);
  if (personalTeam) {
    await ctx.db.patch(personalTeam._id, {
      stripeSubscriptionId: undefined,
      updatedAt: Date.now(),
    });
  }
  await ctx.db.patch(owner._id, {
    stripeSubscriptionId: undefined,
    stripePriceId: undefined,
    stripeSubscriptionStatus: 'canceled',
    stripeSubscriptionCurrentPeriodEnd: undefined,
    updatedAt: Date.now(),
  });

  const before = await snapshotUserCredit(ctx, owner._id);
  await insertCreditLog(ctx, {
    orgId: '',
    userId: owner._id,
    eventType: 'adjustment',
    label: 'Plan canceled',
    amount: 0,
    balanceBefore: before.totalRemaining,
    balanceAfter: before.totalRemaining,
    monthlyCreditsBefore: before.monthlyRemaining,
    monthlyCreditsAfter: before.monthlyRemaining,
    purchasedCreditsBefore: before.purchasedRemaining,
    purchasedCreditsAfter: before.purchasedRemaining,
    reason: 'Subscription canceled, reverts to Free plan next cycle',
  });
  return { accepted: true, duplicate: false };
}
