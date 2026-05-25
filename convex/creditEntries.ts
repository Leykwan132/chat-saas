import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getMonthlyCredits, getPurchasedCredits, type CreditEntity } from "./creditBalance";

export type CreditScope = {
  orgId: string;
  userId?: Id<"users">;
};

export type StripePeriodInfo = {
  status?: string;
  currentPeriodEnd?: number;
};

function hasActiveStripeBilling(status: string | undefined): boolean {
  return status === "active" || status === "trialing";
}

export function getCalendarMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Stable key for the active monthly credit bucket (calendar month or Stripe period). */
export function getCreditPeriodKey(stripeInfo: StripePeriodInfo): string {
  if (
    stripeInfo.currentPeriodEnd &&
    hasActiveStripeBilling(stripeInfo.status)
  ) {
    return `stripe:${stripeInfo.currentPeriodEnd}`;
  }
  return `month:${getCalendarMonthKey()}`;
}

export function scopeFromUser(user: Doc<"users">): CreditScope {
  return { orgId: "", userId: user._id };
}

export function scopeFromOrg(org: Doc<"organizations">): CreditScope {
  return { orgId: org.workosOrgId };
}

async function getCreditPeriodByKey(
  ctx: Pick<QueryCtx, "db">,
  scope: CreditScope,
  periodKey: string,
): Promise<Doc<"creditPeriods"> | null> {
  if (scope.orgId !== "") {
    return await ctx.db
      .query("creditPeriods")
      .withIndex("by_orgId_and_periodKey", (q) =>
        q.eq("orgId", scope.orgId).eq("periodKey", periodKey),
      )
      .unique();
  }
  if (scope.userId) {
    return await ctx.db
      .query("creditPeriods")
      .withIndex("by_userId_and_periodKey", (q) =>
        q.eq("userId", scope.userId!).eq("periodKey", periodKey),
      )
      .unique();
  }
  return null;
}

async function listTopUpEntries(
  ctx: Pick<QueryCtx, "db">,
  scope: CreditScope,
): Promise<Array<Doc<"topUpEntries">>> {
  if (scope.orgId !== "") {
    return await ctx.db
      .query("topUpEntries")
      .withIndex("by_orgId", (q) => q.eq("orgId", scope.orgId))
      .collect();
  }
  if (scope.userId) {
    return await ctx.db
      .query("topUpEntries")
      .withIndex("by_userId", (q) => q.eq("userId", scope.userId!))
      .collect();
  }
  return [];
}

export async function getActiveCreditPeriod(
  ctx: Pick<QueryCtx, "db">,
  scope: CreditScope,
  periodKey: string,
): Promise<Doc<"creditPeriods"> | null> {
  return await getCreditPeriodByKey(ctx, scope, periodKey);
}

export async function getCreditPeriodSummary(
  ctx: Pick<QueryCtx, "db">,
  scope: CreditScope,
  periodKey: string,
) {
  const period = await getCreditPeriodByKey(ctx, scope, periodKey);
  return {
    monthlyCredits: period?.balance ?? 0,
    monthlyAllowance: period?.amount ?? 0,
    creditPeriodId: period?._id,
  };
}

export async function getTopUpSummary(
  ctx: Pick<QueryCtx, "db">,
  scope: CreditScope,
) {
  const entries = await listTopUpEntries(ctx, scope);
  return {
    purchasedCredits: entries.reduce((sum, entry) => sum + entry.balance, 0),
    purchasedCreditsGranted: entries.reduce((sum, entry) => sum + entry.amount, 0),
    activeTopUpCount: entries.filter((entry) => entry.balance > 0).length,
  };
}

/** Creates the monthly credit bucket if missing (backfill from legacy `credits` field). */
export async function ensureActiveCreditPeriod(
  ctx: MutationCtx,
  scope: CreditScope,
  periodKey: string,
  monthlyAllowance: number,
  legacyMonthlyBalance?: number,
): Promise<Doc<"creditPeriods">> {
  const existing = await getCreditPeriodByKey(ctx, scope, periodKey);
  if (existing) {
    return existing;
  }

  const balance = legacyMonthlyBalance ?? monthlyAllowance;
  const now = Date.now();
  const id = await ctx.db.insert("creditPeriods", {
    orgId: scope.orgId,
    userId: scope.userId,
    periodKey,
    amount: monthlyAllowance,
    balance,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (created === null) {
    throw new Error("Failed to create credit period");
  }
  return created;
}

/** Starts a fresh monthly bucket on billing cycle rollover. */
export async function createCreditPeriodReset(
  ctx: MutationCtx,
  scope: CreditScope,
  periodKey: string,
  monthlyAllowance: number,
): Promise<Doc<"creditPeriods">> {
  const existing = await getCreditPeriodByKey(ctx, scope, periodKey);
  if (existing) {
    await ctx.db.patch(existing._id, {
      amount: monthlyAllowance,
      balance: monthlyAllowance,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(existing._id);
    if (updated === null) {
      throw new Error("Failed to reset credit period");
    }
    return updated;
  }

  return await ensureActiveCreditPeriod(
    ctx,
    scope,
    periodKey,
    monthlyAllowance,
    monthlyAllowance,
  );
}

/** Backfill a single legacy top-up row when `purchasedCredits` exists but no entries do. */
export async function ensureTopUpEntriesFromLegacy(
  ctx: MutationCtx,
  scope: CreditScope,
  entity: CreditEntity,
): Promise<void> {
  const legacyBalance = getPurchasedCredits(entity);
  if (legacyBalance <= 0) {
    return;
  }

  const entries = await listTopUpEntries(ctx, scope);
  const migratedBalance = entries.reduce((sum, entry) => sum + entry.balance, 0);
  if (migratedBalance >= legacyBalance) {
    return;
  }

  const remaining = legacyBalance - migratedBalance;
  await createTopUpEntry(ctx, scope, {
    amount: remaining,
    balance: remaining,
    label: "Legacy top-up balance",
  });
}

export async function createTopUpEntry(
  ctx: MutationCtx,
  scope: CreditScope,
  args: {
    amount: number;
    balance?: number;
    label?: string;
    stripePaymentIntentId?: string;
  },
): Promise<Id<"topUpEntries">> {
  const now = Date.now();
  return await ctx.db.insert("topUpEntries", {
    orgId: scope.orgId,
    userId: scope.userId,
    amount: args.amount,
    balance: args.balance ?? args.amount,
    label: args.label,
    stripePaymentIntentId: args.stripePaymentIntentId,
    createdAt: now,
    updatedAt: now,
  });
}

export type CreditDeductionResult = {
  monthlyDeducted: number;
  topUpDeducted: number;
  creditPeriodId?: Id<"creditPeriods">;
  topUpAllocations: Array<{ topUpEntryId: Id<"topUpEntries">; amount: number }>;
};

/** Deduct from the active monthly bucket first, then top-up entries (FIFO). */
export async function deductFromCreditEntries(
  ctx: MutationCtx,
  scope: CreditScope,
  periodKey: string,
  cost: number,
): Promise<CreditDeductionResult> {
  if (cost <= 0) {
    return { monthlyDeducted: 0, topUpDeducted: 0, topUpAllocations: [] };
  }

  let remaining = cost;
  const result: CreditDeductionResult = {
    monthlyDeducted: 0,
    topUpDeducted: 0,
    topUpAllocations: [],
  };

  const period = await getCreditPeriodByKey(ctx, scope, periodKey);
  if (period && period.balance > 0) {
    const fromMonthly = Math.min(period.balance, remaining);
    await ctx.db.patch(period._id, {
      balance: period.balance - fromMonthly,
      updatedAt: Date.now(),
    });
    result.monthlyDeducted = fromMonthly;
    result.creditPeriodId = period._id;
    remaining -= fromMonthly;
  }

  if (remaining > 0) {
    const topUps = (await listTopUpEntries(ctx, scope))
      .filter((entry) => entry.balance > 0)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const entry of topUps) {
      if (remaining <= 0) {
        break;
      }
      const fromTopUp = Math.min(entry.balance, remaining);
      await ctx.db.patch(entry._id, {
        balance: entry.balance - fromTopUp,
        updatedAt: Date.now(),
      });
      result.topUpDeducted += fromTopUp;
      result.topUpAllocations.push({ topUpEntryId: entry._id, amount: fromTopUp });
      remaining -= fromTopUp;
    }
  }

  if (remaining > 0) {
    throw new Error("Insufficient credits");
  }

  return result;
}

/** Keep denormalized `credits` / `purchasedCredits` on users & orgs in sync with entries. */
export async function syncDenormalizedCreditFields(
  ctx: MutationCtx,
  entityId: Id<"users"> | Id<"organizations">,
  scope: CreditScope,
  periodKey: string,
  fallbackEntity?: CreditEntity,
): Promise<{ monthlyCredits: number; purchasedCredits: number }> {
  const period = await getCreditPeriodByKey(ctx, scope, periodKey);
  const topUpSummary = await getTopUpSummary(ctx, scope);
  const monthlyCredits = period?.balance ?? getMonthlyCredits(fallbackEntity ?? {});
  const purchasedCredits = topUpSummary.purchasedCredits;

  await ctx.db.patch(entityId as any, {
    credits: monthlyCredits,
    purchasedCredits,
    updatedAt: Date.now(),
  });

  return { monthlyCredits, purchasedCredits };
}

/** Ensure entry tables exist and match legacy balances on first touch. */
export async function ensureCreditEntryState(
  ctx: MutationCtx,
  entity: Doc<"users"> | Doc<"organizations">,
  scope: CreditScope,
  periodKey: string,
  monthlyAllowance: number,
): Promise<void> {
  await ensureActiveCreditPeriod(
    ctx,
    scope,
    periodKey,
    monthlyAllowance,
    getMonthlyCredits(entity),
  );
  await ensureTopUpEntriesFromLegacy(ctx, scope, entity);
  await syncDenormalizedCreditFields(ctx, entity._id, scope, periodKey, entity);
}
