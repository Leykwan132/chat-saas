import { customAlphabet } from "nanoid";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const REFERRAL_CODE_PREFIX = "KILO-";
const REFERRAL_CODE_BODY_LENGTH = 8;
const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const createCodeBody = customAlphabet(
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_BODY_LENGTH,
);

export const REFERRAL_CODE_PATTERN = /^KILO-[A-HJ-NP-Z2-9]{8}$/;
export const REFERRAL_CODE_LENGTH =
  REFERRAL_CODE_PREFIX.length + REFERRAL_CODE_BODY_LENGTH;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function getReferralCodeByUserId(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"referralCodes"> | null> {
  return await ctx.db
    .query("referralCodes")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function getReferralCodeByCode(
  ctx: QueryCtx,
  code: string,
): Promise<Doc<"referralCodes"> | null> {
  return await ctx.db
    .query("referralCodes")
    .withIndex("by_code", (q) => q.eq("code", normalizeReferralCode(code)))
    .unique();
}

export async function ensureReferralCodeForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"referralCodes">> {
  const existing = await getReferralCodeByUserId(ctx, userId);
  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${REFERRAL_CODE_PREFIX}${createCodeBody()}`;
    const collision = await getReferralCodeByCode(ctx, code);
    if (collision) {
      continue;
    }

    const now = Date.now();
    const referralCodeId = await ctx.db.insert("referralCodes", {
      userId,
      code,
      successfulReferralCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const created = await ctx.db.get(referralCodeId);
    if (!created) {
      throw new Error("Referral code was not created");
    }
    return created;
  }

  throw new Error("Unable to generate a unique referral code");
}
