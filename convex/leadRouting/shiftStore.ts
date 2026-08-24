import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { DEFAULT_AVAILABILITY_SHIFTS } from "../../shared/availabilityDefaults";

export const DEFAULT_SCHEDULE_TIMEZONE = "Asia/Kuala_Lumpur";

export type ScheduleShiftInput = {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

async function insertDefaultShifts(ctx: MutationCtx, userScheduleId: Id<"userSchedules">) {
  for (const shift of DEFAULT_AVAILABILITY_SHIFTS) {
    await ctx.db.insert("userShifts", { userScheduleId, ...shift });
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
  if (existing !== null) return existing._id;
  const now = Date.now();
  const userScheduleId = await ctx.db.insert("userSchedules", {
    agentId: args.agentId,
    workosUserId: args.workosUserId,
    mode: "scheduled",
    manualStatus: "available",
    timezone: args.timezone?.trim() || DEFAULT_SCHEDULE_TIMEZONE,
    enabled: args.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  });
  await insertDefaultShifts(ctx, userScheduleId);
  return userScheduleId;
}

function assertValidShift(shift: ScheduleShiftInput) {
  if (!Number.isInteger(shift.dayOfWeek) || shift.dayOfWeek < 0 || shift.dayOfWeek > 6) {
    throw new Error("Shift day is invalid");
  }
  if (
    !Number.isInteger(shift.startMinutes) ||
    !Number.isInteger(shift.endMinutes) ||
    shift.startMinutes < 0 ||
    shift.endMinutes > 24 * 60 ||
    shift.endMinutes <= shift.startMinutes
  ) {
    throw new Error("Shift time is invalid");
  }
}

export function validateScheduleShifts(shifts: ScheduleShiftInput[]) {
  const sorted = [...shifts].sort((left, right) =>
    left.dayOfWeek - right.dayOfWeek || left.startMinutes - right.startMinutes,
  );
  for (const shift of sorted) assertValidShift(shift);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index]!;
    const next = sorted[index + 1]!;
    if (current.dayOfWeek === next.dayOfWeek && current.endMinutes > next.startMinutes) {
      throw new Error("Shifts cannot overlap on the same day");
    }
  }
}

export async function replaceScheduleShifts(
  ctx: MutationCtx,
  userScheduleId: Id<"userSchedules">,
  shifts: ScheduleShiftInput[],
) {
  validateScheduleShifts(shifts);
  const existing = await ctx.db
    .query("userShifts")
    .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", userScheduleId))
    .take(100);
  if (existing.length === 100) throw new Error("Too many schedule shifts");
  for (const shift of existing) await ctx.db.delete(shift._id);
  for (const shift of shifts) {
    await ctx.db.insert("userShifts", { userScheduleId, ...shift });
  }
  await ctx.db.patch(userScheduleId, { updatedAt: Date.now() });
}
