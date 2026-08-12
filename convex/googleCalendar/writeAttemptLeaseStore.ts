import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const leaseResultValidator = v.union(
  v.object({ kind: v.literal("ready") }),
  v.object({ kind: v.literal("success"), externalEventId: v.string() }),
  v.object({ kind: v.literal("stale") }),
);

export const renewAttemptLease = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    phase: v.union(v.literal("preparing"), v.literal("provider_mutation_started")),
    now: v.number(),
  },
  returns: leaseResultValidator,
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (operation === null) return { kind: "stale" as const };
    if (operation.state === "succeeded" && operation.externalEventId !== undefined) {
      return { kind: "success" as const, externalEventId: operation.externalEventId };
    }
    if (
      operation.payloadBindingVersion !== 2 ||
      operation.attemptGeneration !== args.attemptGeneration ||
      (args.phase === "preparing" && operation.attemptPhase !== "preparing") ||
      (args.phase === "provider_mutation_started" &&
        operation.attemptPhase !== "preparing" &&
        operation.attemptPhase !== "provider_mutation_started")
    ) return { kind: "stale" as const };
    await ctx.db.patch(operation._id, {
      state: "running",
      attemptPhase: args.phase,
      providerMutationStartedAt: args.phase === "provider_mutation_started"
        ? operation.providerMutationStartedAt ?? args.now
        : undefined,
      attemptLeaseExpiresAt: args.now + 60_000,
      updatedAt: args.now,
    });
    return { kind: "ready" as const };
  },
});

export const deferMutationRecovery = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (
      operation !== null && operation.state !== "succeeded" &&
      operation.attemptGeneration === args.attemptGeneration &&
      operation.attemptPhase === "provider_mutation_started"
    ) {
      await ctx.db.patch(operation._id, {
        state: "pending",
        errorKind: "retryable",
        attemptLeaseExpiresAt: args.now + 60_000,
        updatedAt: args.now,
      });
    }
    return null;
  },
});
