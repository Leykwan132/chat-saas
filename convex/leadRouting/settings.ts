import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import {
  assertRoutingManage,
  assertRoutingRead,
  getOrCreateLeadAssignmentSettings,
} from "./helpers";
import { isUserEligible } from "./eligibility";
import { getAuthContext } from "../authUtils";

const assignmentMethodValidator = v.union(
  v.literal("round_robin"),
  v.literal("priority"),
  v.literal("tags"),
);

const tagRuleValidator = v.object({
  tag: v.string(),
  workosUserId: v.string(),
});

export const getForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertRoutingRead(ctx, args.agentId);
    const row = await ctx.db
      .query("leadAssignmentSettings")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .unique();
    if (row === null) {
      return {
        agentId: args.agentId,
        method: "round_robin" as const,
        aiEnabledOnInbound: true,
        aiWhenOutsideSchedule: false,
        tagRules: [] as Array<{ tag: string; workosUserId: string }>,
        lastAssignedWorkosUserId: undefined,
        lastAssignedAt: undefined,
      };
    }
    return {
      ...row,
      method:
        row.method === "balanced"
          ? ("priority" as const)
          : row.method,
      tagRules: row.tagRules ?? [],
    };
  },
});

export const updateForAgent = mutation({
  args: {
    agentId: v.id("agents"),
    method: v.optional(assignmentMethodValidator),
    aiEnabledOnInbound: v.optional(v.boolean()),
    aiWhenOutsideSchedule: v.optional(v.boolean()),
    tagRules: v.optional(v.array(tagRuleValidator)),
  },
  handler: async (ctx, args) => {
    await assertRoutingManage(ctx, args.agentId);
    const row = await getOrCreateLeadAssignmentSettings(ctx, args.agentId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.method !== undefined) patch.method = args.method;
    if (args.aiEnabledOnInbound !== undefined) {
      patch.aiEnabledOnInbound = args.aiEnabledOnInbound;
    }
    if (args.aiWhenOutsideSchedule !== undefined) {
      patch.aiWhenOutsideSchedule = args.aiWhenOutsideSchedule;
    }
    if (args.tagRules !== undefined) {
      patch.tagRules = args.tagRules
        .map((rule) => ({
          tag: rule.tag.trim().toLowerCase(),
          workosUserId: rule.workosUserId.trim(),
        }))
        .filter((rule) => rule.tag.length > 0 && rule.workosUserId.length > 0);
    }
    await ctx.db.patch(row._id, patch);
  },
});

export const listEligibleUsers = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertRoutingRead(ctx, args.agentId);
    const now = Date.now();
    const schedules = await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const eligible: string[] = [];
    for (const schedule of schedules) {
      const shifts = await ctx.db
        .query("userShifts")
        .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
        .collect();
      const timeOff = await ctx.db
        .query("userTimeOff")
        .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
        .collect();
      if (isUserEligible(now, schedule, shifts, timeOff)) {
        eligible.push(schedule.workosUserId);
      }
    }
    return eligible;
  },
});

export const rosterCount = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertRoutingRead(ctx, args.agentId);
    const schedules = await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();
    return schedules.filter((s) => s.enabled).length;
  },
});

export const getRosterOpenLeadCounts = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertRoutingRead(ctx, args.agentId);
    const { orgId } = await getAuthContext(ctx);
    if (!orgId) {
      throw new Error("Organization required");
    }

    const schedules = await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const services = ["playground", "whatsapp", "instagram", "messenger"] as const;
    const counts: Record<string, number> = {};

    for (const schedule of schedules) {
      let openCount = 0;
      for (const service of services) {
        const rows = await ctx.db
          .query("conversations")
          .withIndex("by_orgId_and_service_and_assignedAgentId_and_assignedUserId", (q) =>
            q
              .eq("orgId", orgId)
              .eq("service", service)
              .eq("assignedAgentId", args.agentId)
              .eq("assignedUserId", schedule.workosUserId),
          )
          .collect();
        openCount += rows.filter((row) => row.status === "open").length;
      }
      counts[schedule.workosUserId] = openCount;
    }
    return counts;
  },
});
