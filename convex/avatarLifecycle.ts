import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

export const recordLifecycleEvent = internalMutation({
  args: {
    sessionId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    sourceEventId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('avatarEvents')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .unique();
    if (existing) return false;
    await ctx.db.insert('avatarEvents', {
      sessionId: args.sessionId,
      eventId: args.eventId,
      eventType: args.eventType,
      sourceEventId: args.sourceEventId ?? undefined,
      createdAt: Date.now(),
    });
    return true;
  },
});
