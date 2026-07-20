import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillAnalyticsV2Conversations = migrations.define({
  table: "conversations",
  batchSize: 10,
  migrateOne: async (ctx, conversation) => {
    await ctx.scheduler.runAfter(
      0,
      internal.analyticsProjectionRepair.repairConversation,
      { conversationId: conversation._id },
    );
  },
});

export const runBackfillAnalyticsV2 = migrations.runner(
  internal.analyticsProjectionMigration.backfillAnalyticsV2Conversations,
);
