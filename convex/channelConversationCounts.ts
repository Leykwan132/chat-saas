import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export async function decrementChannelConversationCount(
  ctx: MutationCtx,
  channelId: Id<"channels"> | undefined,
) {
  if (channelId === undefined) return;

  const channel = await ctx.db.get(channelId);
  if (channel === null) return;
  if (channel.conversationCount < 1) {
    throw new Error("Channel conversation count is below one");
  }

  await ctx.db.patch(channelId, {
    conversationCount: channel.conversationCount - 1,
  });
}
