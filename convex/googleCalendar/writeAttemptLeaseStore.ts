import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { googleCalendarErrorKindValidator } from "./contracts";

const leaseResultValidator = v.union(
  v.object({ kind: v.literal("ready") }),
  v.object({ kind: v.literal("success"), externalEventId: v.string() }),
  v.object({ kind: v.literal("stale") }),
);

const recoveryClaimValidator = v.union(
  v.object({ kind: v.literal("ready"), recoveryClaimGeneration: v.number() }),
  v.object({ kind: v.literal("success"), externalEventId: v.string() }),
  v.object({ kind: v.literal("running") }),
  v.object({ kind: v.literal("stale") }),
  v.object({ kind: v.literal("exhausted") }),
);

const recoveryOutcomeValidator = v.union(
  v.object({ kind: v.literal("recorded") }),
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
      operation.recoveryClaimGeneration !== undefined ||
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
    if (operation.providerMutationStartedAt === undefined) return { kind: "stale" as const };
    if (
      operation.recoveryClaimGeneration === undefined &&
      operation.attemptLeaseExpiresAt !== undefined &&
      args.now < operation.attemptLeaseExpiresAt
    ) return { kind: "running" as const };
    if (
      operation.recoveryClaimLeaseExpiresAt !== undefined &&
      args.now < operation.recoveryClaimLeaseExpiresAt
    ) return { kind: "running" as const };
    if ((operation.recoveryRetryCount ?? 0) >= 3) {
      await ctx.db.patch(operation._id, {
        state: "failed",
        errorKind: "failed",
        recoveryExhausted: true,
        recoveryClaimLeaseExpiresAt: undefined,
        attemptLeaseExpiresAt: undefined,
        attemptPhase: undefined,
        providerMutationStartedAt: undefined,
        updatedAt: args.now,
      });
      return { kind: "exhausted" as const };
    }
    const recoveryClaimGeneration = (operation.recoveryClaimGeneration ?? 0) + 1;
    const recoveryClaimLeaseExpiresAt = args.now + 120_000;
    await ctx.db.patch(operation._id, {
      recoveryRetryCount: (operation.recoveryRetryCount ?? 0) + 1,
      recoveryClaimGeneration,
      recoveryClaimLeaseExpiresAt,
      state: "running",
      errorKind: undefined,
      attemptLeaseExpiresAt: recoveryClaimLeaseExpiresAt,
      updatedAt: args.now,
    });
    return { kind: "ready" as const, recoveryClaimGeneration };
  },
});

export const finishMutationRecovery = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    recoveryClaimGeneration: v.number(),
    kind: googleCalendarErrorKindValidator,
    now: v.number(),
  },
  returns: recoveryOutcomeValidator,
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (operation === null) return { kind: "stale" as const };
    if (operation.state === "succeeded" && operation.externalEventId !== undefined) {
      return { kind: "success" as const, externalEventId: operation.externalEventId };
    }
    if (
      operation.attemptGeneration !== args.attemptGeneration ||
      operation.recoveryClaimGeneration !== args.recoveryClaimGeneration ||
      operation.attemptPhase !== "provider_mutation_started"
    ) return { kind: "stale" as const };
    const connection = await ctx.db.get(operation.connectionId);
    if (connection === null) return { kind: "stale" as const };
    const providerMutationAmbiguous =
      args.kind === "conflict" || args.kind === "retryable" || args.kind === "failed";
    await ctx.db.patch(operation._id, {
      state: providerMutationAmbiguous ? "pending" : "failed",
      errorKind: args.kind,
      attemptLeaseExpiresAt: providerMutationAmbiguous
        ? operation.recoveryClaimLeaseExpiresAt
        : undefined,
      attemptPhase: providerMutationAmbiguous ? operation.attemptPhase : undefined,
      providerMutationStartedAt: providerMutationAmbiguous
        ? operation.providerMutationStartedAt
        : undefined,
      recoveryClaimLeaseExpiresAt: providerMutationAmbiguous
        ? operation.recoveryClaimLeaseExpiresAt
        : undefined,
      updatedAt: args.now,
    });
    if (args.kind === "needs_reauthorization" || args.kind === "forbidden") {
      await ctx.db.patch(connection._id, {
        state: "needs_reauthorization", lastErrorKind: args.kind, updatedAt: args.now,
      });
    } else if (args.kind === "not_connected") {
      await ctx.db.patch(connection._id, {
        state: "disconnected", lastErrorKind: args.kind, updatedAt: args.now,
      });
    }
    return { kind: "recorded" as const };
  },
});

export const recordRecoveryConflict = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    recoveryClaimGeneration: v.optional(v.number()),
    now: v.number(),
  },
  returns: recoveryOutcomeValidator,
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (operation === null) return { kind: "stale" as const };
    if (operation.state === "succeeded" && operation.externalEventId !== undefined) {
      return { kind: "success" as const, externalEventId: operation.externalEventId };
    }
    if (
      operation.attemptGeneration !== args.attemptGeneration ||
      operation.attemptPhase !== "provider_mutation_started" ||
      operation.recoveryClaimGeneration !== args.recoveryClaimGeneration
    ) return { kind: "stale" as const };
    await ctx.db.patch(operation._id, {
      state: "conflict",
      errorKind: "conflict",
      attemptLeaseExpiresAt: undefined,
      attemptPhase: undefined,
      providerMutationStartedAt: undefined,
      recoveryClaimLeaseExpiresAt: undefined,
      updatedAt: args.now,
    });
    return { kind: "recorded" as const };
  },
});
