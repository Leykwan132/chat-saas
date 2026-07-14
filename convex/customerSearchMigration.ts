import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { customerSearchText } from "./customerSearch";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillCustomerSearchText = migrations.define({
  table: "customers",
  migrateOne: (_, customer) => ({
    searchText: customerSearchText(customer),
  }),
});

export const runBackfillCustomerSearchText = migrations.runner(
  internal.customerSearchMigration.backfillCustomerSearchText,
);
