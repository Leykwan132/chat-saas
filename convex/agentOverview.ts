import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAgentOverviewSummary } from "./agentOverviewModel";

const overviewTimeRangeValidator = v.optional(
  v.union(
    v.literal("7d"),
    v.literal("30d"),
    v.literal("90d"),
    v.literal("period"),
  ),
);

export const getSummary = query({
  args: {
    agentId: v.id("agents"),
    timeRange: overviewTimeRangeValidator,
  },
  handler: async (ctx, args) => {
    return await getAgentOverviewSummary(
      ctx,
      args.agentId,
      args.timeRange ?? "period",
    );
  },
});
