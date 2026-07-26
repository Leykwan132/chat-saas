import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import type { TopUpEntrySource } from "./creditEntries";

const migrations = new Migrations<DataModel>(components.migrations);

export function getMigratedTopUpEntrySource(
  entry: Pick<Doc<"topUpEntries">, "source" | "stripePaymentIntentId">,
): TopUpEntrySource {
  if (entry.source) {
    return entry.source;
  }
  return entry.stripePaymentIntentId ? "purchase" : "manual";
}

export const backfillTopUpEntrySources = migrations.define({
  table: "topUpEntries",
  migrateOne: async (ctx, entry) => {
    if (entry.source) {
      return;
    }
    await ctx.db.patch(entry._id, {
      source: getMigratedTopUpEntrySource(entry),
    });
  },
});

export const runBackfillTopUpEntrySources = migrations.runner(
  internal.topUpEntrySourceMigration.backfillTopUpEntrySources,
);
