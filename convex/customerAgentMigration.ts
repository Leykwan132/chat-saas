import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

type CustomerAgentMigrationCustomer<TAgentId extends string> = {
  agentId?: TAgentId;
  orgId: string;
  service: string;
  source: string;
  userId?: string;
};

export function getSafePersonalCustomerAgentPatch<TAgentId extends string>({
  customer,
  personalAgentIds,
  now,
}: {
  customer: CustomerAgentMigrationCustomer<TAgentId>;
  personalAgentIds: readonly TAgentId[];
  now: number;
}) {
  if (
    customer.agentId !== undefined ||
    customer.orgId !== "" ||
    customer.service !== "manual" ||
    customer.source !== "manual" ||
    customer.userId === undefined ||
    personalAgentIds.length !== 1
  ) {
    return undefined;
  }

  return { agentId: personalAgentIds[0], updatedAt: now };
}

export const backfillSafePersonalManualCustomerAgents = migrations.define({
  table: "customers",
  batchSize: 25,
  migrateOne: async (ctx, customer) => {
    const ownerWorkosUserId = customer.userId;
    if (ownerWorkosUserId === undefined) return;
    const personalAgents = await ctx.db
      .query("agents")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", ownerWorkosUserId).eq("orgId", ""),
      )
      .take(2);

    return getSafePersonalCustomerAgentPatch({
      customer,
      personalAgentIds: personalAgents.map((agent) => agent._id),
      now: Date.now(),
    });
  },
});

export const runBackfillSafePersonalManualCustomerAgents = migrations.runner(
  internal.customerAgentMigration.backfillSafePersonalManualCustomerAgents,
);
