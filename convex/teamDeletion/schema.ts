import { defineTable } from "convex/server";
import { v } from "convex/values";

export const teamDeletionStatusValidator = v.literal("deleting");

export const teamDeletionPhaseValidator = v.union(
  v.literal("stopWork"),
  v.literal("disconnectChannels"),
  v.literal("externalData"),
  v.literal("localData"),
  v.literal("verify"),
  v.literal("deleteOrganization"),
  v.literal("finalize"),
);

export const teamDeletionJobsTable = defineTable({
  teamId: v.id("teams"),
  workosOrgId: v.string(),
  stripeSubscriptionId: v.optional(v.string()),
  source: v.union(v.literal("stripe"), v.literal("workos")),
  phase: teamDeletionPhaseValidator,
  cursor: v.optional(v.string()),
  workId: v.optional(v.string()),
  lastError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_teamId", ["teamId"])
  .index("by_workosOrgId", ["workosOrgId"])
  .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]);
