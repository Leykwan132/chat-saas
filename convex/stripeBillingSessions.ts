import { StripeSubscriptions } from '@convex-dev/stripe';
import type { ActionCtx } from './_generated/server';
import { components, internal } from './_generated/api';
import { getBillingWorkosUserId } from './billingScope';
import { getAuthContext } from './authUtils';
import {
  getExtraCreditsPack,
  getExtraCreditsPriceId,
  getStripePriceId,
  type ExtraCreditsPackId,
  type PlanKey,
} from './planCatalog';
import {
  STRIPE_CREDITS_AMOUNT_METADATA_KEY,
  STRIPE_EXTRA_CREDITS_METADATA_TYPE,
} from '../shared/planCatalog';
import {
  createCheckoutSessionWithPromotionCodes,
  type CheckoutMetadata,
  type CheckoutSessionParams,
} from './stripeCheckout';

const stripeClient = new StripeSubscriptions(components.stripe, {});

type BillingUserRecord = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  stripeCustomerId?: string | null;
};

export type CreateCheckoutArgs = {
  plan?: string;
  interval?: 'monthly' | 'annual';
  mode: 'subscription' | 'payment';
  extraCreditsPackId?: ExtraCreditsPackId;
  orgId?: string | null;
  cancelPath?: string;
};

export type CreatePortalArgs = {
  orgId?: string | null;
  returnPath?: string;
};

function isPaidPlanKey(plan: string): plan is Exclude<PlanKey, 'free'> {
  return plan === 'starter' || plan === 'growth' || plan === 'business';
}

export async function createCheckoutForBillingUser(
  ctx: ActionCtx,
  args: CreateCheckoutArgs,
): Promise<{ url: string | null }> {
  const auth = await getAuthContext(ctx);
  const billingBlocked = await ctx.runQuery(internal.whiteLabel.billing.isBillingBlockedForTeam, {
    teamId: auth.activeTeamId,
  });
  if (billingBlocked) {
    throw new Error('Billing is managed by your partner.');
  }
  const userId = await getBillingWorkosUserId(ctx);
  const user = (await ctx.runQuery(internal.stripe.internalGetUser, {
    userId,
  })) as BillingUserRecord | null;
  if (!user) {
    throw new Error('User not found');
  }

  const name = user.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user.email;
  const customer = await stripeClient.getOrCreateCustomer(ctx, {
    userId,
    email: user.email,
    name,
  });

  let priceId: string;
  let extraCreditsPack: ReturnType<typeof getExtraCreditsPack> | null = null;
  if (args.mode === 'payment') {
    if (!args.extraCreditsPackId) {
      throw new Error('Extra credits pack is required for payment checkout');
    }
    extraCreditsPack = getExtraCreditsPack(args.extraCreditsPackId);
    priceId = getExtraCreditsPriceId(args.extraCreditsPackId);
  } else {
    if (!args.plan || !args.interval || !isPaidPlanKey(args.plan)) {
      throw new Error('Plan and interval are required for subscription checkout');
    }
    priceId = getStripePriceId(args.plan, args.interval);
  }

  const frontendUrl = (
    process.env.APP_BASE_URL || 'http://localhost:5173'
  ).replace(/\/+$/, '');
  const successUrl = `${frontendUrl}/workspace?success=true`;
  const cancelUrl = args.cancelPath
    ? `${frontendUrl}${args.cancelPath.startsWith('/') ? args.cancelPath : `/${args.cancelPath}`}`
    : `${frontendUrl}/onboarding`;
  const creditMetadata: CheckoutMetadata | null = extraCreditsPack
    ? {
        orgId: userId,
        type: STRIPE_EXTRA_CREDITS_METADATA_TYPE,
        extraCreditsPackId: extraCreditsPack.id,
        [STRIPE_CREDITS_AMOUNT_METADATA_KEY]: String(extraCreditsPack.credits),
      }
    : null;
  const sessionParams: CheckoutSessionParams = {
    priceId,
    customerId: customer.customerId,
    mode: args.mode,
    successUrl,
    cancelUrl,
    metadata: creditMetadata ?? { orgId: userId, type: 'subscription' },
  };

  if (args.mode === 'subscription') {
    sessionParams.subscriptionMetadata = { orgId: userId };
  } else if (creditMetadata) {
    sessionParams.paymentIntentMetadata = creditMetadata;
  }

  const session = await createCheckoutSessionWithPromotionCodes(sessionParams);
  return { url: session.url };
}

export async function createPortalForBillingUser(
  ctx: ActionCtx,
  args: CreatePortalArgs,
): Promise<{ url: string }> {
  const auth = await getAuthContext(ctx);
  const billingBlocked = await ctx.runQuery(internal.whiteLabel.billing.isBillingBlockedForTeam, {
    teamId: auth.activeTeamId,
  });
  if (billingBlocked) {
    throw new Error('Billing is managed by your partner.');
  }
  const userId = await getBillingWorkosUserId(ctx);
  const user = (await ctx.runQuery(internal.stripe.internalGetUser, {
    userId,
  })) as BillingUserRecord | null;
  if (!user) {
    throw new Error('User not found');
  }
  if (!user.stripeCustomerId) {
    throw new Error('No Stripe billing customer found.');
  }

  const frontendUrl = (
    process.env.APP_BASE_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
  ).replace(/\/+$/, '');
  const returnPath =
    args.returnPath ?? '/workspace/settings?section=plan';
  const returnUrl = `${frontendUrl}${
    returnPath.startsWith('/') ? returnPath : `/${returnPath}`
  }`;
  const session = await stripeClient.createCustomerPortalSession(ctx, {
    customerId: user.stripeCustomerId,
    returnUrl,
  });
  return { url: session.url };
}
