import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { googleCalendarErrorKindValidator } from "./contracts";

const outcomeValidator = v.union(
  v.object({ kind: v.literal("success"), externalEventId: v.string() }),
  v.object({ kind: v.literal("conflict") }),
  v.object({ kind: v.literal("stale") }),
  v.object({ kind: v.literal("recorded") }),
);

function currentAttempt(
  operation: Doc<"googleCalendarWriteOperations">,
  attemptGeneration: number,
) {
  if (operation.state === "succeeded" && operation.externalEventId !== undefined) {
    return { kind: "success" as const, externalEventId: operation.externalEventId };
  }
  if (operation.recoveryClaimGeneration !== undefined) {
    return { kind: "stale" as const };
  }
  if (
    operation.attemptGeneration === attemptGeneration &&
    operation.attemptPhase === "provider_mutation_started" &&
    operation.state !== "conflict"
  ) return null;
  if (operation.state !== "running" || operation.attemptGeneration !== attemptGeneration) {
    return { kind: "stale" as const };
  }
  return null;
}

export const recordOutcome = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    kind: googleCalendarErrorKindValidator,
    now: v.number(),
  },
  returns: outcomeValidator,
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (operation === null) throw new Error("Google Calendar write operation not found");
    const terminal = currentAttempt(operation, args.attemptGeneration);
    if (terminal !== null) return terminal;
    const connection = await ctx.db.get(operation.connectionId);
    if (connection === null) throw new Error("Google Calendar connection not found");
    const providerMutationAmbiguous = operation.attemptPhase === "provider_mutation_started" &&
      (args.kind === "retryable" || args.kind === "failed" ||
        (args.kind === "conflict" && operation.recoveryClaimLeaseExpiresAt !== undefined));
    await ctx.db.patch(operation._id, {
      state: providerMutationAmbiguous
        ? "pending"
        : args.kind === "conflict" ? "conflict" : args.kind === "retryable" ? "pending" : "failed",
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
    } else if (!providerMutationAmbiguous && (args.kind === "retryable" || args.kind === "failed")) {
      await ctx.db.patch(connection._id, { lastErrorKind: args.kind, updatedAt: args.now });
    }
    return { kind: "recorded" as const };
  },
});
