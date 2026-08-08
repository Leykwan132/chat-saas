import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

export async function deleteConversationAgentThread(
  ctx: MutationCtx,
  threadId: string,
): Promise<void> {
  await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
    threadId,
  });
}
