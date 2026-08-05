import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { assertManageableAgent } from '../agentAccess';
import {
  notificationKindsForAgent,
  telegramNotificationKindsValidator,
} from './kinds';

function assertUniqueKinds(kinds: string[]) {
  if (new Set(kinds).size !== kinds.length) {
    throw new Error('Each notification type can only be selected once');
  }
}

export const getForAgent = query({
  args: { agentId: v.id('agents') },
  returns: v.object({ kinds: telegramNotificationKindsValidator }),
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    return { kinds: notificationKindsForAgent(agent.telegramNotificationKinds) };
  },
});

export const setForAgent = mutation({
  args: {
    agentId: v.id('agents'),
    kinds: telegramNotificationKindsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    assertUniqueKinds(args.kinds);
    await ctx.db.patch(agent._id, {
      telegramNotificationKinds: args.kinds,
      updatedAt: Date.now(),
    });
    return null;
  },
});
