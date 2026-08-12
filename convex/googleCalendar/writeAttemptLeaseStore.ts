import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const leaseResultValidator = v.union(
  v.object({ kind: v.literal("ready") }),
  v.object({ kind: v.literal("success"), externalEventId: v.string() }),
  v.object({ kind: v.literal("stale") }),
);

const recoveryClaimValidator = v.union(
  leaseResultValidator,
  v.object({ kind: v.literal("exhausted") }),
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

export const claimMutationRecovery = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    now: v.number(),
  },
  returns: recoveryClaimValidator,
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (operation === null) return { kind: "stale" as const };
    if (operation.state === "succeeded" && operation.externalEventId !== undefined) {
      return { kind: "success" as const, externalEventId: operation.externalEventId };
    }
    if (
      operation.payloadBindingVersion !== 2 ||
      operation.attemptGeneration !== args.attemptGeneration ||
      operation.attemptPhase !== "provider_mutation_started"
    ) return { kind: "stale" as const };
    if (
      operation.providerMutationStartedAt === undefined ||
      args.now < operation.providerMutationStartedAt + 120_000
    ) return { kind: "stale" as const };
    if ((operation.recoveryRetryCount ?? 0) >= 3) {
      await ctx.db.patch(operation._id, {
        state: "failed",
        errorKind: "failed",
        recoveryExhausted: true,
        attemptLeaseExpiresAt: undefined,
        attemptPhase: undefined,
        providerMutationStartedAt: undefined,
        updatedAt: args.now,
      });
      return { kind: "exhausted" as const };
    }
    await ctx.db.patch(operation._id, {
      recoveryRetryCount: (operation.recoveryRetryCount ?? 0) + 1,
      state: "running",
      errorKind: undefined,
      attemptLeaseExpiresAt: args.now + 60_000,
      updatedAt: args.now,
    });
    return { kind: "ready" as const };
  },
});

export const recordRecoveryConflict = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("recorded") }),
    v.object({ kind: v.literal("success"), externalEventId: v.string() }),
    v.object({ kind: v.literal("stale") }),
  ),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (operation === null) return { kind: "stale" as const };
    if (operation.state === "succeeded" && operation.externalEventId !== undefined) {
      return { kind: "success" as const, externalEventId: operation.externalEventId };
    }
    if (
      operation.attemptGeneration !== args.attemptGeneration ||
      operation.attemptPhase !== "provider_mutation_started"
    ) return { kind: "stale" as const };
    await ctx.db.patch(operation._id, {
      state: "conflict",
      errorKind: "conflict",
      attemptLeaseExpiresAt: undefined,
      attemptPhase: undefined,
      providerMutationStartedAt: undefined,
      updatedAt: args.now,
    });
    return { kind: "recorded" as const };
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
