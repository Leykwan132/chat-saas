import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { ensureReferralCodeForUser } from "./referralCodeRecords";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillReferralCodes = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    await ensureReferralCodeForUser(ctx, user._id);
  },
});

export const runBackfillReferralCodes = migrations.runner(
  internal.referralCodeMigration.backfillReferralCodes,
);
