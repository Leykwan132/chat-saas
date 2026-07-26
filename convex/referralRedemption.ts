import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { createTopUpEntry } from "./creditEntries";
import { insertCreditLog } from "./creditLogs";
import { snapshotUserCredit } from "./creditPeriodPool";
import { getBillingEntityForUser } from "./plans";
import {
  getReferralCodeByCode,
  normalizeReferralCode,
  REFERRAL_CODE_PATTERN,
} from "./referralCodeRecords";
import { getReferralProgramConfig } from "./referralProgramConfig";

type ReferralFailureCode =
  | "INVALID_REFERRAL_CODE"
  | "SELF_REFERRAL"
  | "REFERRAL_LIMIT_REACHED"
  | "ALREADY_REDEEMED";

function fail(code: ReferralFailureCode): never {
  throw new ConvexError({ code });
}

async function grantReferralCredits(
  ctx: MutationCtx,
  user: Doc<"users">,
  rewardCredits: number,
) {
  const before = await snapshotUserCredit(ctx, user._id);
  const topUpEntryId = await createTopUpEntry(ctx, user._id, {
    source: "referral",
    grantedCredits: rewardCredits,
    label: "Referral reward",
  });
  const balanceAfter = before.totalRemaining + rewardCredits;
  const nonMonthlyAfter = before.purchasedRemaining + rewardCredits;

  await insertCreditLog(ctx, {
    orgId: "",
    userId: user._id,
    eventType: "grant",
    label: `Referral reward (+${rewardCredits.toLocaleString()} credits)`,
    amount: rewardCredits,
    balanceBefore: before.totalRemaining,
    balanceAfter,
    monthlyCreditsBefore: before.monthlyRemaining,
    monthlyCreditsAfter: before.monthlyRemaining,
    purchasedCreditsBefore: before.purchasedRemaining,
    purchasedCreditsAfter: nonMonthlyAfter,
    creditCost: rewardCredits,
    topUpEntryId,
    reason: "Referral reward",
  });

  return topUpEntryId;
}

export async function redeemReferralDuringOnboarding(
  ctx: MutationCtx,
  referredUser: Doc<"users">,
  referralCode: string | undefined,
): Promise<number | null> {
  const existingRedemption = await ctx.db
    .query("referralRedemptions")
    .withIndex("by_referredUserId", (q) =>
      q.eq("referredUserId", referredUser._id),
    )
    .unique();
  if (existingRedemption) {
    return existingRedemption.rewardCredits;
  }
  if (!referralCode || referredUser.onboarded) {
    return null;
  }
  const config = getReferralProgramConfig();

  const normalizedCode = normalizeReferralCode(referralCode);
  if (!REFERRAL_CODE_PATTERN.test(normalizedCode)) {
    fail("INVALID_REFERRAL_CODE");
  }

  const codeRecord = await getReferralCodeByCode(ctx, normalizedCode);
  if (!codeRecord) {
    fail("INVALID_REFERRAL_CODE");
  }
  if (codeRecord.userId === referredUser._id) {
    fail("SELF_REFERRAL");
  }

  if (codeRecord.successfulReferralCount >= config.maxSuccessfulReferrals) {
    fail("REFERRAL_LIMIT_REACHED");
  }

  const referrerUser = await ctx.db.get(codeRecord.userId);
  if (!referrerUser) {
    fail("INVALID_REFERRAL_CODE");
  }

  const { billingUser: referrerBillingUser } =
    await getBillingEntityForUser(ctx, referrerUser);
  const { billingUser: referredBillingUser } =
    await getBillingEntityForUser(ctx, referredUser);
  const referrerTopUpEntryId = await grantReferralCredits(
    ctx,
    referrerBillingUser,
    config.rewardCredits,
  );
  const referredTopUpEntryId = await grantReferralCredits(
    ctx,
    referredBillingUser,
    config.rewardCredits,
  );
  const completedAt = Date.now();

  await ctx.db.insert("referralRedemptions", {
    referralCodeId: codeRecord._id,
    referrerUserId: referrerUser._id,
    referredUserId: referredUser._id,
    rewardCredits: config.rewardCredits,
    referrerTopUpEntryId,
    referredTopUpEntryId,
    completedAt,
  });
  await ctx.db.patch(codeRecord._id, {
    successfulReferralCount: codeRecord.successfulReferralCount + 1,
    updatedAt: completedAt,
  });

  return config.rewardCredits;
}
