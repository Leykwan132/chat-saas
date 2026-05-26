import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";
import { getPlanFromStripe } from "./plans";
import { getUserByWorkosId } from "./teamHelpers";

type DbCtx = QueryCtx | MutationCtx;

/** Stripe subscriptions and credit balances always belong to the user, not the active team. */
export async function getBillingWorkosUserId(
  ctx: DbCtx | ActionCtx,
): Promise<string> {
  const { userId } = await getAuthContext(ctx);
  return userId;
}

export async function getBillingUser(
  ctx: DbCtx,
  workosUserId: string,
): Promise<Doc<"users">> {
  const user = await getUserByWorkosId(ctx, workosUserId);
  if (user === null) {
    throw new Error("User not found");
  }
  return user;
}

export async function getBillingPlanFromStripe(
  ctx: DbCtx | ActionCtx,
  workosUserId?: string,
) {
  const billingUserId = workosUserId ?? (await getBillingWorkosUserId(ctx));
  if ("runQuery" in ctx) {
    return await ctx.runQuery(internal.plans.internalGetPlanFromStripe, {
      entityId: billingUserId,
    });
  }
  return await getPlanFromStripe(ctx, billingUserId);
}
