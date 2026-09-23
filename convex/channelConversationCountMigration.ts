import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillChannelConversationCounts = migrations.define({
  table: "channels",
  batchSize: 10,
  migrateOne: async (ctx, channel) => {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) => q.eq("channelId", channel._id))
      .collect();
    return { conversationCount: conversations.length };
  },
});

export const runBackfillChannelConversationCounts = migrations.runner(
  internal.channelConversationCountMigration.backfillChannelConversationCounts,
);
