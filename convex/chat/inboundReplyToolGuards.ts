import type { Tool, ToolExecutionOptions, ToolSet } from "ai";
import { convexToJson, jsonToConvex, type Value } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const mutatingTools = new Set([
  "beginBookingDetailsEdit",
  "startBookingSession",
  "bookAppointment",
  "bookAppointments",
  "saveBookingDetails",
  "sendBookingConfirmation",
  "sendBookingUpdateConfirmation",
  "sendBatchBookingConfirmation",
  "cancelBooking",
  "updateBookingsDateTime",
  "deleteCalendarEvent",
  "escalateToHuman",
  "giveReaction",
]);

export async function assertCurrentReplyRun(
  ctx: Pick<ActionCtx, "runQuery">,
  runId: Id<"inboundReplyRuns">,
) {
  if (!(await ctx.runQuery(internal.inboundReplyTools.isCurrent, { runId })))
    throw new Error("Reply generation was superseded");
}

export function protectGroupedReplyTools(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
  runId: Id<"inboundReplyRuns">,
  tools: ToolSet | undefined,
): ToolSet {
  if (!tools) throw new Error("Reply agent tools are not configured");
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => {
      const execute = definition.execute;
      if (!execute) return [name, definition];
      const guarded: Tool = {
        ...definition,
        execute: async function (
          this: Tool,
          input: unknown,
          options: ToolExecutionOptions,
        ) {
          await assertCurrentReplyRun(ctx, runId);
          if (!mutatingTools.has(name))
            return await execute.call(this, input, options);
          const canonical = JSON.stringify(convexToJson(input as Value));
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(canonical),
          );
          const inputKey = Array.from(new Uint8Array(digest), (value) =>
            value.toString(16).padStart(2, "0"),
          ).join("");
          const claim = await ctx.runMutation(
            internal.inboundReplyTools.begin,
            { runId, toolName: name, inputKey },
          );
          if (claim.cachedResultJson !== undefined)
            return jsonToConvex(JSON.parse(claim.cachedResultJson));
          if (!claim.executionId)
            throw new Error("Tool action has no execution claim");
          const result = await execute.call(this, input, options);
          const resultJson = JSON.stringify(convexToJson(result as Value));
          await ctx.runMutation(internal.inboundReplyTools.complete, {
            executionId: claim.executionId,
            resultJson,
          });
          return result;
        },
      };
      return [name, guarded];
    }),
  );
}
