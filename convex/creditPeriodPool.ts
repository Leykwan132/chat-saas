import { v } from "convex/values";
import { Workpool } from "@convex-dev/workpool";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getPlanFromStripe } from "./plans";
import { PLAN_CATALOG, type PlanKey } from "./planCatalog";
import { insertCreditLog } from "./creditLogs";

export const creditPeriodPool = new Workpool(
  components.creditPeriodWorkpool,
  { maxParallelism: 10 },
);

function getPlan(planName: string | undefined): (typeof PLAN_CATALOG)[PlanKey] {
  const key = (planName ?? "free") as PlanKey;
  return PLAN_CATALOG[key] ?? PLAN_CATALOG.free;
}

/** Day-of-month a user's credit cycle is anchored to (their creation day). */
function anchorDayFor(userCreatedAt: number): number {
  return new Date(userCreatedAt).getUTCDate();
}

/** Add one calendar month to `startMs`, clamping `anchorDay` to month length. */
function addOneMonth(startMs: number, anchorDay: number): number {
  const d = new Date(startMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const daysInTarget = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const day = Math.min(anchorDay, daysInTarget);
  return Date.UTC(year, month + 1, day);
}

/** Compute the next period `[periodStart, periodEnd)` following `latest`. */
function computeNextPeriod(
  latest: Doc<"userCreditPeriods"> | null,
  userCreatedAt: number,
): { periodStart: number; periodEnd: number } {
  const anchorDay = anchorDayFor(userCreatedAt);
  if (latest) {
    const periodStart = latest.periodEnd;
    const periodEnd = addOneMonth(periodStart, anchorDay);
    return { periodStart, periodEnd };
  }
  const periodStart = userCreatedAt;
  const periodEnd = addOneMonth(periodStart, anchorDay);
  return { periodStart, periodEnd };
}

/**
 * Compute the bounds of the current (non-expired) billing cycle for a user,
 * walking forward from their creation day without inserting any periods.
 * Used by the data migration to place the carried-over balance into the
 * correct current cycle.
 */
export function computeCurrentPeriodBounds(
  userCreatedAt: number,
): { periodStart: number; periodEnd: number } {
  const anchorDay = anchorDayFor(userCreatedAt);
  let periodStart = userCreatedAt;
  let periodEnd = addOneMonth(periodStart, anchorDay);
  const now = Date.now();
  let guard = 0;
  while (periodEnd <= now && guard < 24) {
    periodStart = periodEnd;
    periodEnd = addOneMonth(periodStart, anchorDay);
    guard++;
  }
  return { periodStart, periodEnd };
}

async function getLatestPeriod(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"userCreditPeriods"> | null> {
  return await ctx.db
    .query("userCreditPeriods")
    .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
}

async function getPeriodByStart(
  ctx: QueryCtx,
  userId: Id<"users">,
  periodStart: number,
): Promise<Doc<"userCreditPeriods"> | null> {
  return await ctx.db
    .query("userCreditPeriods")
    .withIndex("by_userId_and_periodStart", (q) =>
      q.eq("userId", userId).eq("periodStart", periodStart),
    )
    .unique();
}

/** Read the Stripe plan + monthly credit grant for a billing user. */
export async function readPlanForUser(
  ctx: QueryCtx,
  user: Doc<"users">,
): Promise<{ plan: PlanKey; grantedCredits: number }> {
  const stripeInfo = await getPlanFromStripe(ctx, user.workosUserId);
  return {
    plan: stripeInfo.plan,
    grantedCredits: getPlan(stripeInfo.plan).monthlyCredits,
  };
}

/** Sum of remaining top-up credits for a user (carried forward, FIFO). */
export async function getTopUpRemaining(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<number> {
  const entries = await ctx.db
    .query("topUpEntries")
    .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
    .collect();
  return entries.reduce(
    (sum, e) => sum + ((e.grantedCredits ?? 0) - (e.usedCredits ?? 0)),
    0,
  );
}

/** Sum of granted top-up credits for a user. */
export async function getTopUpGranted(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<number> {
  const entries = await ctx.db
    .query("topUpEntries")
    .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
    .collect();
  return entries.reduce((sum, e) => sum + (e.grantedCredits ?? 0), 0);
}

export type UserCreditSnapshot = {
  period: Doc<"userCreditPeriods"> | null;
  monthlyRemaining: number;
  monthlyGranted: number;
  monthlyUsed: number;
  purchasedRemaining: number;
  purchasedGranted: number;
  totalRemaining: number;
};

/** Read-only snapshot of a user's current quota state (no writes). */
export async function snapshotUserCredit(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<UserCreditSnapshot> {
  const period = await getLatestPeriod(ctx, userId);
  const now = Date.now();
  const current = period && period.periodEnd > now ? period : null;
  const monthlyGranted = current?.grantedCredits ?? 0;
  const monthlyUsed = current?.usedCredits ?? 0;
  const monthlyRemaining = current ? monthlyGranted - monthlyUsed : 0;
  const purchasedRemaining = await getTopUpRemaining(ctx, userId);
  const purchasedGranted = await getTopUpGranted(ctx, userId);
  return {
    period: current,
    monthlyRemaining,
    monthlyGranted,
    monthlyUsed,
    purchasedRemaining,
    purchasedGranted,
    totalRemaining: monthlyRemaining + purchasedRemaining,
  };
}

/** Insert a monthly_reset credit log for a newly created period. */
async function logMonthlyReset(
  ctx: MutationCtx,
  user: Doc<"users">,
  period: Doc<"userCreditPeriods">,
  previousPeriod: Doc<"userCreditPeriods"> | null,
) {
  const purchasedRemaining = await getTopUpRemaining(ctx, user._id);
  const monthlyBefore = previousPeriod
    ? previousPeriod.grantedCredits - previousPeriod.usedCredits
    : 0;
  const totalBefore = monthlyBefore + purchasedRemaining;
  const monthlyAfter = period.grantedCredits;
  const totalAfter = monthlyAfter + purchasedRemaining;

  await insertCreditLog(ctx, {
    orgId: "",
    userId: user._id,
    periodId: period._id,
    eventType: "monthly_reset",
    label: "Monthly reset",
    amount: totalAfter - totalBefore,
    balanceBefore: totalBefore,
    balanceAfter: totalAfter,
    monthlyCreditsBefore: monthlyBefore,
    monthlyCreditsAfter: monthlyAfter,
    purchasedCreditsBefore: purchasedRemaining,
    purchasedCreditsAfter: purchasedRemaining,
    reason: `Monthly credit reset (${period.grantedCredits} credits)`,
  });
}

/**
 * Walk forward from the latest period (or user creation) creating any missing
 * periods until the current (non-expired) one exists. Idempotent: skips period
 * starts that already exist. Schedules the next worker at the current period's
 * end. This is the single source of period creation, used by both the worker
 * and the lazy deduction safety net.
 */
async function createNextPeriodIfNeeded(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"userCreditPeriods">> {
  const now = Date.now();
  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new Error("User not found");
  }
  let latest = await getLatestPeriod(ctx, userId);
  if (!latest || latest.periodEnd <= now) {
    const { periodStart, periodEnd } = computeNextPeriod(latest, user.createdAt);
    const existing = await getPeriodByStart(ctx, userId, periodStart);
    if (existing) {
      latest = existing;
    } else {
      const { plan, grantedCredits } = await readPlanForUser(ctx, user);
      const ts = Date.now();
      const id = await ctx.db.insert("userCreditPeriods", {
        userId,
        periodStart,
        periodEnd,
        grantedCredits,
        usedCredits: 0,
        planKey: plan,
        createdAt: ts,
        updatedAt: ts,
      });
      const created = await ctx.db.get(id);
      if (created === null) {
        throw new Error("Failed to create credit period");
      }
      await logMonthlyReset(ctx, user, created, latest);
      latest = created;
    }
  }
  if (latest) {
    await creditPeriodPool.enqueueMutation(
      ctx,
      internal.creditPeriodPool.creditPeriodWorker,
      { userId },
      { runAt: latest.periodEnd },
    );
  }
  return latest!;
}

/**
 * Returns the user's current (non-expired) credit period, creating it (and any
 * skipped intermediate periods) if needed. Lazy safety net so deductions never
 * block on the work pool.
 */
export async function getOrCreateCurrentPeriod(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"userCreditPeriods">> {
  const latest = await getLatestPeriod(ctx, userId);
  if (latest && latest.periodEnd > Date.now()) {
    return latest;
  }
  return await createNextPeriodIfNeeded(ctx, userId);
}

/**
 * Bootstrap the first credit period for a user.
 * Safe to call repeatedly — no-ops if any period already exists.
 */
export async function ensureFirstCreditPeriod(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const existing = await getLatestPeriod(ctx, userId);
  if (existing) return;
  await createNextPeriodIfNeeded(ctx, userId);
}

/** Bump the current period's allocation on a mid-cycle plan upgrade. */
export async function applyPlanUpgradeToCurrentPeriod(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const current = await getOrCreateCurrentPeriod(ctx, userId);
  const user = await ctx.db.get(userId);
  if (user === null) return;
  const { plan, grantedCredits } = await readPlanForUser(ctx, user);
  if (current.grantedCredits === grantedCredits && current.planKey === plan) {
    return;
  }
  await ctx.db.patch(current._id, {
    grantedCredits,
    planKey: plan,
    updatedAt: Date.now(),
  });
}

/** Work pool worker: creates the next period if due and reschedules itself. */
export const creditPeriodWorker = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await createNextPeriodIfNeeded(ctx, args.userId);
  },
});

/** Helper function to reset a user's credit quota. */
async function resetUserQuota(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new Error("User not found");
  }
  const { plan, grantedCredits } = await readPlanForUser(ctx, user);
  const current = await getOrCreateCurrentPeriod(ctx, userId);

  const monthlyBefore = current.grantedCredits - current.usedCredits;
  const ts = Date.now();
  await ctx.db.patch(current._id, {
    grantedCredits,
    usedCredits: 0,
    planKey: plan,
    updatedAt: ts,
  });

  const updated = await ctx.db.get(current._id);
  if (updated === null) {
    throw new Error("Failed to retrieve updated period");
  }

  const purchasedRemaining = await getTopUpRemaining(ctx, userId);
  const totalBefore = monthlyBefore + purchasedRemaining;
  const totalAfter = grantedCredits + purchasedRemaining;

  await insertCreditLog(ctx, {
    orgId: "",
    userId,
    periodId: current._id,
    eventType: "monthly_reset",
    label: "Admin reset",
    amount: totalAfter - totalBefore,
    balanceBefore: totalBefore,
    balanceAfter: totalAfter,
    monthlyCreditsBefore: monthlyBefore,
    monthlyCreditsAfter: grantedCredits,
    purchasedCreditsBefore: purchasedRemaining,
    purchasedCreditsAfter: purchasedRemaining,
    reason: `Admin credit reset to ${grantedCredits} credits`,
  });
}

/** Admin mutation to manually reset a single user's credit quota based on their plan. */
export const resetUserQuotaAdmin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await resetUserQuota(ctx, args.userId);
    return { success: true };
  },
});

/** Admin mutation to manually reset credit quotas for all users in batched jobs. */
export const resetAllUsersQuotaAdmin = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 100;
    const page = await ctx.db
      .query("users")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    for (const user of page.page) {
      await resetUserQuota(ctx, user._id);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.creditPeriodPool.resetAllUsersQuotaAdmin,
        { cursor: page.continueCursor },
      );
    }

    return { success: true };
  },
});
