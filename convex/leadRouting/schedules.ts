import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { assertRoutingManage, assertRoutingRead } from "./helpers";

const DEFAULT_TIMEZONE = "UTC";

async function assertOrgMember(ctx: Parameters<typeof assertRoutingRead>[0], workosUserId: string) {
  const { orgId } = await getAuthContext(ctx);
  if (!orgId || orgId === "personal") {
    throw new Error("Organization required");
  }
  const org = await ctx.db
    .query("organizations")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
    .unique();
  if (org === null) {
    throw new Error("Organization not found");
  }
  const userRow = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  if (userRow === null || !org.members.includes(userRow._id)) {
    throw new Error("User is not a member of this organization");
  }
}

export const listForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertRoutingRead(ctx, args.agentId);
    const schedules = await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .collect();

    const result = [];
    for (const schedule of schedules) {
      const shifts = await ctx.db
        .query("userShifts")
        .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
        .collect();
      const timeOff = await ctx.db
        .query("userTimeOff")
        .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
        .collect();
      result.push({ schedule, shifts, timeOff });
    }
    return result;
  },
});

export const addUser = mutation({
  args: {
    agentId: v.id("agents"),
    workosUserId: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRoutingManage(ctx, args.agentId);
    await assertOrgMember(ctx, args.workosUserId);

    const existing = await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId_and_workosUserId", (q) =>
        q.eq("agentId", args.agentId).eq("workosUserId", args.workosUserId),
      )
      .unique();
    if (existing !== null) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("userSchedules", {
      agentId: args.agentId,
      workosUserId: args.workosUserId,
      mode: "manual",
      manualStatus: "available",
      timezone: args.timezone?.trim() || DEFAULT_TIMEZONE,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateUser = mutation({
  args: {
    userScheduleId: v.id("userSchedules"),
    mode: v.optional(v.union(v.literal("manual"), v.literal("scheduled"))),
    manualStatus: v.optional(v.union(v.literal("available"), v.literal("away"))),
    timezone: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    assignmentPriority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.userScheduleId);
    if (schedule === null) {
      throw new Error("Schedule not found");
    }
    await assertRoutingManage(ctx, schedule.agentId);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.mode !== undefined) patch.mode = args.mode;
    if (args.manualStatus !== undefined) patch.manualStatus = args.manualStatus;
    if (args.timezone !== undefined) patch.timezone = args.timezone.trim() || DEFAULT_TIMEZONE;
    if (args.enabled !== undefined) patch.enabled = args.enabled;
    if (args.assignmentPriority !== undefined) {
      patch.assignmentPriority = Math.max(1, Math.floor(args.assignmentPriority));
    }
    await ctx.db.patch(args.userScheduleId, patch);
  },
});

export const removeUser = mutation({
  args: { userScheduleId: v.id("userSchedules") },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.userScheduleId);
    if (schedule === null) return;
    await assertRoutingManage(ctx, schedule.agentId);

    const shifts = await ctx.db
      .query("userShifts")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", args.userScheduleId))
      .collect();
    for (const shift of shifts) {
      await ctx.db.delete(shift._id);
    }
    const timeOff = await ctx.db
      .query("userTimeOff")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", args.userScheduleId))
      .collect();
    for (const row of timeOff) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(args.userScheduleId);
  },
});

export const setShifts = mutation({
  args: {
    userScheduleId: v.id("userSchedules"),
    shifts: v.array(
      v.object({
        dayOfWeek: v.number(),
        startMinutes: v.number(),
        endMinutes: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.userScheduleId);
    if (schedule === null) {
      throw new Error("Schedule not found");
    }
    await assertRoutingManage(ctx, schedule.agentId);

    // Validate overlaps
    const sorted = [...args.shifts].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startMinutes - b.startMinutes;
    });
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i]!;
      const next = sorted[i + 1]!;
      if (cur.dayOfWeek === next.dayOfWeek && cur.endMinutes > next.startMinutes) {
        throw new Error("Shifts cannot overlap on the same day");
      }
    }

    const existing = await ctx.db
      .query("userShifts")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", args.userScheduleId))
      .collect();
    for (const shift of existing) {
      await ctx.db.delete(shift._id);
    }
    for (const shift of args.shifts) {
      await ctx.db.insert("userShifts", {
        userScheduleId: args.userScheduleId,
        dayOfWeek: shift.dayOfWeek,
        startMinutes: shift.startMinutes,
        endMinutes: shift.endMinutes,
      });
    }
    await ctx.db.patch(args.userScheduleId, { updatedAt: Date.now() });
  },
});

export const addTimeOff = mutation({
  args: {
    userScheduleId: v.id("userSchedules"),
    startAt: v.number(),
    endAt: v.number(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.userScheduleId);
    if (schedule === null) {
      throw new Error("Schedule not found");
    }
    await assertRoutingManage(ctx, schedule.agentId);
    if (args.endAt <= args.startAt) {
      throw new Error("Invalid time off range");
    }
    return await ctx.db.insert("userTimeOff", {
      userScheduleId: args.userScheduleId,
      startAt: args.startAt,
      endAt: args.endAt,
      label: args.label?.trim() || undefined,
    });
  },
});

export const removeTimeOff = mutation({
  args: { timeOffId: v.id("userTimeOff") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.timeOffId);
    if (row === null) return;
    const schedule = await ctx.db.get(row.userScheduleId);
    if (schedule === null) return;
    await assertRoutingManage(ctx, schedule.agentId);
    await ctx.db.delete(args.timeOffId);
  },
});