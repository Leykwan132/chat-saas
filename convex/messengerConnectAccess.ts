import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { assertMessengerConnectAllowed } from "../shared/messengerAccess";

export async function assertWorkosUserCanConnectMessenger(
  ctx: ActionCtx,
  workosUserId: string,
) {
  const user = await ctx.runQuery(internal.users.internalGetByWorkosUserId, {
    workosUserId,
  });
  assertMessengerConnectAllowed(user?.email);
}
