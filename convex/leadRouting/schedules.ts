import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { assertAvailabilityRead, assertRoutingManage } from "./helpers";
import { refreshWorkflowNodeReadinessForAgent } from "../workflowNodeReadiness";

const DEFAULT_TIMEZONE = "Asia/Kuala_Lumpur";
const DEFAULT_SHIFT_START_MINUTES = 9 * 60;
const DEFAULT_SHIFT_END_MINUTES = 17 * 60;

const DEFAULT_WEEKLY_SHIFTS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startMinutes: DEFAULT_SHIFT_START_MINUTES,
  endMinutes: DEFAULT_SHIFT_END_MINUTES,
}));

async function insertDefaultShifts(ctx: MutationCtx, userScheduleId: Id<"userSchedules">) {
  for (const shift of DEFAULT_WEEKLY_SHIFTS) {
    await ctx.db.insert("userShifts", {
      userScheduleId,
      dayOfWeek: shift.dayOfWeek,
      startMinutes: shift.startMinutes,
      endMinutes: shift.endMinutes,
    });
  }
}

export async function ensureUserScheduleForAgent(
  ctx: MutationCtx,
  args: {
    agentId: Id<"agents">;
    workosUserId: string;
    timezone?: string;
    enabled?: boolean;
  },
): Promise<Id<"userSchedules">> {
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
  const userScheduleId = await ctx.db.insert("userSchedules", {
    agentId: args.agentId,
    workosUserId: args.workosUserId,
    mode: "scheduled",
    manualStatus: "available",
    timezone: args.timezone?.trim() || DEFAULT_TIMEZONE,
    enabled: args.enabled ?? false,
    createdAt: now,
    updatedAt: now,
  });
  await insertDefaultShifts(ctx, userScheduleId);
  return userScheduleId;
}

async function assertOrgMember(ctx: Parameters<typeof assertAvailabilityRead>[0], workosUserId: string) {
  const { orgId } = await getAuthContext(ctx);
  if (!orgId || orgId === "personal") {
    throw new Error("Organization required");
  }
  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
    .unique();
  if (team === null) {
    throw new Error("Team not found");
  }
  const userRow = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  if (userRow === null) {
    throw new Error("User not found");
  }
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userRow._id).eq("teamId", team._id),
    )
    .unique();
  if (membership === null) {
    throw new Error("User is not a member of this team");
  }
}

export const listForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertAvailabilityRead(ctx, args.agentId);
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

export const getForAgentUser = query({
  args: {
    agentId: v.id("agents"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAvailabilityRead(ctx, args.agentId);
    const { userId } = await getAuthContext(ctx);
    if (userId !== args.workosUserId) {
      await assertOrgMember(ctx, args.workosUserId);
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .unique();
    if (user === null) {
      return null;
    }

    const { orgId } = await getAuthContext(ctx);
    const team =
      orgId && orgId !== "personal"
        ? await ctx.db
            .query("teams")
            .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
            .unique()
        : null;

    let isAdmin = false;
    if (team !== null) {
      const membership = await ctx.db
        .query("teamMemberships")
        .withIndex("by_userId_and_teamId", (q) =>
          q.eq("userId", user._id).eq("teamId", team._id),
        )
        .unique();
      isAdmin = membership?.role === "owner" || membership?.role === "admin";
    }

    const schedule = await ctx.db
      .query("userSchedules")
      .withIndex("by_agentId_and_workosUserId", (q) =>
        q.eq("agentId", args.agentId).eq("workosUserId", args.workosUserId),
      )
      .unique();

    if (schedule === null) {
      return {
        user: {
          workosUserId: user.workosUserId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin,
        },
        schedule: null,
        shifts: [],
        timeOff: [],
      };
    }

    const shifts = await ctx.db
      .query("userShifts")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .collect();
    const timeOff = await ctx.db
      .query("userTimeOff")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .collect();

    return {
      user: {
        workosUserId: user.workosUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin,
      },
      schedule: {
        ...schedule,
        timezone: schedule.timezone.trim() || DEFAULT_TIMEZONE,
      },
      shifts,
      timeOff,
    };
  },
});

export const addUser = mutation({
  args: {
    agentId: v.id("agents"),
    workosUserId: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    if (userId !== args.workosUserId) {
      await assertRoutingManage(ctx, args.agentId);
    } else {
      await assertAvailabilityRead(ctx, args.agentId);
    }
    if (userId !== args.workosUserId) {
      await assertOrgMember(ctx, args.workosUserId);
    }

    return await ensureUserScheduleForAgent(ctx, {
      agentId: args.agentId,
      workosUserId: args.workosUserId,
      timezone: args.timezone,
      enabled: false,
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
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.userScheduleId);
    if (schedule === null) {
      throw new Error("Schedule not found");
    }
    const { userId } = await getAuthContext(ctx);
    if (userId !== schedule.workosUserId) {
      await assertRoutingManage(ctx, schedule.agentId);
    } else {
      await assertAvailabilityRead(ctx, schedule.agentId);
    }

    if (args.enabled !== undefined) {
      await assertRoutingManage(ctx, schedule.agentId);
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.mode !== undefined) patch.mode = args.mode;
    if (args.manualStatus !== undefined) patch.manualStatus = args.manualStatus;
    if (args.timezone !== undefined) patch.timezone = args.timezone.trim() || DEFAULT_TIMEZONE;
    if (args.enabled !== undefined) patch.enabled = args.enabled;
    if (args.assignmentPriority !== undefined) {
      patch.assignmentPriority = Math.max(1, Math.floor(args.assignmentPriority));
    }
    if (args.note !== undefined) {
      patch.note = args.note.trim();
    }
    await ctx.db.patch(args.userScheduleId, patch);
    if (args.enabled !== undefined) {
      await refreshWorkflowNodeReadinessForAgent(ctx, schedule.agentId);
    }
  },
});

export const removeUser = mutation({
  args: { userScheduleId: v.id("userSchedules") },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.userScheduleId);
    if (schedule === null) return;
    const { userId } = await getAuthContext(ctx);
    if (userId !== schedule.workosUserId) {
      await assertRoutingManage(ctx, schedule.agentId);
    } else {
      await assertAvailabilityRead(ctx, schedule.agentId);
    }

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
    await refreshWorkflowNodeReadinessForAgent(ctx, schedule.agentId);
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
    const { userId } = await getAuthContext(ctx);
    if (userId !== schedule.workosUserId) {
      await assertRoutingManage(ctx, schedule.agentId);
    } else {
      await assertAvailabilityRead(ctx, schedule.agentId);
    }

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
    const { userId } = await getAuthContext(ctx);
    if (userId !== schedule.workosUserId) {
      await assertRoutingManage(ctx, schedule.agentId);
    } else {
      await assertAvailabilityRead(ctx, schedule.agentId);
    }
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
    const { userId } = await getAuthContext(ctx);
    if (userId !== schedule.workosUserId) {
      await assertRoutingManage(ctx, schedule.agentId);
    } else {
      await assertAvailabilityRead(ctx, schedule.agentId);
    }
    await ctx.db.delete(args.timeOffId);
  },
});
