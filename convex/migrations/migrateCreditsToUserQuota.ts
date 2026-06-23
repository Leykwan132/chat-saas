import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  computeCurrentPeriodBounds,
  readPlanForUser,
  creditPeriodPool,
} from "../creditPeriodPool";

const BATCH_SIZE = 50;

/**
 * One-time migration from the legacy running-balance credit system
 * (`creditPeriods.balance` / `topUpEntries.amount+balance`, user-scoped) to the
 * new user-scoped quota system (`userCreditPeriods` / `topUpEntries`
 * granted/used).
 *
 * For each user it:
 *   1. Creates the current `userCreditPeriods` row, carrying over the latest
 *      legacy `creditPeriods` remaining balance
 *      (grantedCredits = amount, usedCredits = amount - balance).
 *   2. Patches legacy `topUpEntries` rows to add grantedCredits / usedCredits
 *      (grantedCredits = amount, usedCredits = amount - balance).
 *   3. Enqueues the credit-period worker at the current period's end so future
 *      cycles are scheduled.
 *
 * Idempotent: skips users that already have a `userCreditPeriods` row and
 * top-up rows that already have grantedCredits. Paginates over users via
 * `cursor`, self-rescheduling until all users are processed.
 *
 * Run with: npx convex run migrations/migrateCreditsToUserQuota:migrateCreditsToUserQuota '{}'
 */
export const migrateCreditsToUserQuota = internalMutation({
  args: { cursor: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .order("asc")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    let migrated = 0;
    let lastId: Id<"users"> | undefined;

    for (const user of users.page) {
      lastId = user._id;
      await migrateUser(ctx, user);
      migrated += 1;
    }

    if (!users.isDone && lastId !== undefined) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.migrateCreditsToUserQuota.migrateCreditsToUserQuota,
        { cursor: lastId },
      );
    }

    return { migrated, isDone: users.isDone };
  },
});

async function migrateUser(ctx: any, user: Doc<"users">) {
  // Skip if a user credit period already exists (idempotent).
  const existing = await ctx.db
    .query("userCreditPeriods")
    .withIndex("by_userId_and_periodStart", (q: any) => q.eq("userId", user._id))
    .first();
  if (existing !== null) {
    return;
  }

  const { plan, grantedCredits: planGrant } = await readPlanForUser(ctx, user);

  // Carry over the user's latest legacy monthly period, if any.
  let grantedCredits = planGrant;
  let usedCredits = 0;
  const legacyPeriod = await ctx.db
    .query("creditPeriods")
    .withIndex("by_userId_and_periodKey", (q: any) => q.eq("userId", user._id))
    .order("desc")
    .first();
  if (legacyPeriod) {
    grantedCredits = legacyPeriod.amount;
    usedCredits = Math.max(0, legacyPeriod.amount - legacyPeriod.balance);
  }

  const { periodStart, periodEnd } = computeCurrentPeriodBounds(user.createdAt);
  const now = Date.now();
  await ctx.db.insert("userCreditPeriods", {
    userId: user._id,
    periodStart,
    periodEnd,
    grantedCredits,
    usedCredits,
    planKey: plan,
    createdAt: now,
    updatedAt: now,
  });

  // Migrate legacy top-up entries (add grantedCredits / usedCredits).
  const legacyTopUps = await ctx.db
    .query("topUpEntries")
    .withIndex("by_userId_and_createdAt", (q: any) => q.eq("userId", user._id))
    .collect();
  for (const entry of legacyTopUps) {
    if (entry.grantedCredits !== undefined) continue;
    const amount = entry.amount ?? 0;
    const balance = entry.balance ?? amount;
    await ctx.db.patch(entry._id, {
      grantedCredits: amount,
      usedCredits: Math.max(0, amount - balance),
      updatedAt: now,
    });
  }

  // Schedule the next cycle.
  await creditPeriodPool.enqueueMutation(
    ctx,
    internal.creditPeriodPool.creditPeriodWorker,
    { userId: user._id },
    { runAt: periodEnd },
  );
}
