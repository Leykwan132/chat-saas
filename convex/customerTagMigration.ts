import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import {
  customerTagWorkspaceKey,
  ensureCustomerTags,
  isCustomerTagCatalogEligible,
} from "./customerTags";

const migrations = new Migrations<DataModel>(components.migrations);

export function getCustomerTagBackfillInput(
  customer: Pick<Doc<"customers">, "orgId" | "userId" | "tags">,
) {
  if (!customer.orgId && customer.userId === undefined) {
    return null;
  }
  return {
    workspaceKey: customerTagWorkspaceKey(customer.orgId, customer.userId),
    tags: [...new Set(customer.tags.filter(isCustomerTagCatalogEligible))],
  };
}

export const backfillCustomerTags = migrations.define({
  table: "customers",
  batchSize: 25,
  migrateOne: async (ctx, customer) => {
    const input = getCustomerTagBackfillInput(customer);
    if (input === null) return;
    await ensureCustomerTags(ctx.db, input.workspaceKey, input.tags);
  },
});

export const runBackfillCustomerTags = migrations.runner(
  internal.customerTagMigration.backfillCustomerTags,
);
