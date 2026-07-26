import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import {
  getReferralCodeByCode,
  getReferralCodeByUserId,
  normalizeReferralCode,
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
} from "./referralCodeRecords";
import { getReferralProgramConfig } from "./referralProgramConfig";

const programConfigValidator = v.object({
  rewardCredits: v.number(),
  maxSuccessfulReferrals: v.number(),
  maximumEarningPotential: v.number(),
  codeLength: v.number(),
  codePrefix: v.string(),
});

const codeValidationValidator = v.union(
  v.object({
    status: v.literal("valid"),
    rewardCredits: v.number(),
    maxSuccessfulReferrals: v.number(),
  }),
  v.object({ status: v.literal("invalid") }),
  v.object({ status: v.literal("self_referral") }),
  v.object({ status: v.literal("limit_reached") }),
  v.object({ status: v.literal("already_redeemed") }),
);

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }
  return `${localPart.charAt(0)}***@${domain}`;
}

export const getProgramConfig = query({
  args: {},
  returns: programConfigValidator,
  handler: async (ctx) => {
    await getAuthContext(ctx);
    const config = getReferralProgramConfig();
    return {
      ...config,
      codeLength: REFERRAL_CODE_LENGTH,
      codePrefix: "KILO-",
    };
  },
});

export const validateCode = query({
  args: { code: v.string() },
  returns: codeValidationValidator,
  handler: async (ctx, args) => {
    const { userDbId } = await getAuthContext(ctx);
    const config = getReferralProgramConfig();
    const existingRedemption = await ctx.db
      .query("referralRedemptions")
      .withIndex("by_referredUserId", (q) =>
        q.eq("referredUserId", userDbId),
      )
      .unique();
    if (existingRedemption) {
      return { status: "already_redeemed" as const };
    }

    const normalizedCode = normalizeReferralCode(args.code);
    if (!REFERRAL_CODE_PATTERN.test(normalizedCode)) {
      return { status: "invalid" as const };
    }

    const codeRecord = await getReferralCodeByCode(ctx, normalizedCode);
    if (!codeRecord) {
      return { status: "invalid" as const };
    }
    if (codeRecord.userId === userDbId) {
      return { status: "self_referral" as const };
    }

    if (codeRecord.successfulReferralCount >= config.maxSuccessfulReferrals) {
      return { status: "limit_reached" as const };
    }

    return {
      status: "valid" as const,
      rewardCredits: config.rewardCredits,
      maxSuccessfulReferrals: config.maxSuccessfulReferrals,
    };
  },
});

export const getMyOverview = query({
  args: {},
  returns: v.object({
    code: v.string(),
    successfulReferralCount: v.number(),
    maxSuccessfulReferrals: v.number(),
    rewardCredits: v.number(),
    historicalCreditsEarned: v.number(),
    remainingSlots: v.number(),
    remainingPotentialCredits: v.number(),
    isCapped: v.boolean(),
  }),
  handler: async (ctx) => {
    const { userDbId } = await getAuthContext(ctx);
    const codeRecord = await getReferralCodeByUserId(ctx, userDbId);
    if (!codeRecord) {
      throw new Error("Referral code not found");
    }

    const config = getReferralProgramConfig();
    let historicalCreditsEarned = 0;
    const redemptions = ctx.db
      .query("referralRedemptions")
      .withIndex("by_referrerUserId_and_completedAt", (q) =>
        q.eq("referrerUserId", userDbId),
      );
    for await (const redemption of redemptions) {
      historicalCreditsEarned += redemption.rewardCredits;
    }
    const remainingSlots = Math.max(
      0,
      config.maxSuccessfulReferrals - codeRecord.successfulReferralCount,
    );

    return {
      code: codeRecord.code,
      successfulReferralCount: codeRecord.successfulReferralCount,
      maxSuccessfulReferrals: config.maxSuccessfulReferrals,
      rewardCredits: config.rewardCredits,
      historicalCreditsEarned,
      remainingSlots,
      remainingPotentialCredits: remainingSlots * config.rewardCredits,
      isCapped:
        codeRecord.successfulReferralCount >= config.maxSuccessfulReferrals,
    };
  },
});

export const listMyReferralHistory = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(
      v.object({
        redemptionId: v.id("referralRedemptions"),
        maskedEmail: v.string(),
        completedAt: v.number(),
        rewardCredits: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const { userDbId } = await getAuthContext(ctx);
    const result = await ctx.db
      .query("referralRedemptions")
      .withIndex("by_referrerUserId_and_completedAt", (q) =>
        q.eq("referrerUserId", userDbId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (redemption) => {
        const referredUser = await ctx.db.get(redemption.referredUserId);
        return {
          redemptionId: redemption._id,
          maskedEmail: maskEmail(referredUser?.email ?? ""),
          completedAt: redemption.completedAt,
          rewardCredits: redemption.rewardCredits,
        };
      }),
    );

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
