import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { indexLegacyParticipantAvailability } from "./calendarAvailabilityIntervals";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillCalendarAvailabilityIntervals = migrations.define({
  table: "calendarEventParticipants",
  batchSize: 10,
  migrateOne: async (ctx, participant) => {
    if (participant.availabilityIndexedAt !== undefined) return;
    await indexLegacyParticipantAvailability(ctx, participant, Date.now());
  },
});

export const runCalendarAvailabilityMigrations = migrations.runner();
