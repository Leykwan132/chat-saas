import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import {
  assertAvailabilityRead,
  assertRoutingManage,
  assertRoutingRead,
  getOrCreateLeadAssignmentSettings,
} from "./helpers";
import { isUserEligible } from "./eligibility";
import { getAuthContext, resolveChannelOrgId } from "../authUtils";

const assignmentMethodValidator = v.union(
  v.literal("balanced"),
  v.literal("round_robin"),
  v.literal("manual"),
);

function normalizeAssignmentMethod(
  method: string,
): "balanced" | "round_robin" | "manual" {
  if (method === "balanced" || method === "priority") return "balanced";
  if (method === "manual") return "manual";
  return "round_robin";
}

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
      method: normalizeAssignmentMethod(row.method),
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
  args: {
    agentId: v.id("agents"),
    workosUserIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAvailabilityRead(ctx, args.agentId);
    const { orgId, userId } = await getAuthContext(ctx);
    const scopedOrgId = resolveChannelOrgId(orgId, userId);

    const services = ["playground", "whatsapp", "instagram", "messenger"] as const;
    const counts: Record<string, number> = {};

    for (const workosUserId of args.workosUserIds) {
      let openCount = 0;
      for (const service of services) {
        const rows = await ctx.db
          .query("conversations")
          .withIndex("by_orgId_and_service_and_assignedAgentId_and_assignedUserId", (q) =>
            q
              .eq("orgId", scopedOrgId)
              .eq("service", service)
              .eq("assignedAgentId", args.agentId)
              .eq("assignedUserId", workosUserId),
          )
          .collect();
        openCount += rows.filter((row) => row.status === "open").length;
      }
      counts[workosUserId] = openCount;
    }
    return counts;
  },
});
