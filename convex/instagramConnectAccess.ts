import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { assertInstagramConnectAllowed } from "../shared/instagramAccess";

export async function assertWorkosUserCanConnectInstagram(
  ctx: ActionCtx,
  workosUserId: string,
) {
  const user = await ctx.runQuery(internal.users.internalGetByWorkosUserId, {
    workosUserId,
  });
  assertInstagramConnectAllowed(user?.email);
}
