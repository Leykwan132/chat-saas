import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ensureCalendarAvailabilityPreload } from "../calendarAvailabilityPreload";
import { loadInlineCalendarAvailability } from "../calendarAvailabilityInline";
import { loadGoogleCalendarHealthByUser, type UserCalendarAvailability } from "../googleCalendar/availability";
import { getUserByWorkosId } from "../teamHelpers";
import type { RosterEntry } from "./types";

export type AvailabilityRosterEntry = RosterEntry & {
  calendarAvailability: UserCalendarAvailability;
  futureAssignedEventCount: number;
  googleCalendarHealthy: boolean;
};

export async function loadAvailabilityRoster(
  ctx: MutationCtx,
  args: {
    agentId: Id<"agents">;
    teamId: Id<"teams">;
    windowStartAt: number;
    windowEndAt: number;
  },
) {
  const schedules = await ctx.db
    .query("userSchedules")
    .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
    .take(100);
  const entries: RosterEntry[] = [];
  for (const schedule of schedules) {
    const shifts = await ctx.db
      .query("userShifts")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .take(100);
    const timeOff = await ctx.db
      .query("userTimeOff")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .take(100);
    const user = await getUserByWorkosId(ctx, schedule.workosUserId);
    entries.push({ schedule, shifts, timeOff, user });
  }
  const userIds = [...new Set(entries.flatMap((entry) => entry.user === null ? [] : [entry.user._id]))];
  const now = Date.now();
  let availabilityByUser = await loadInlineCalendarAvailability(ctx, {
    teamId: args.teamId,
    userIds,
    startAt: args.windowStartAt,
    endAt: args.windowEndAt,
    now,
  });
  let worker;
  if (availabilityByUser === null) {
    const preload = await ensureCalendarAvailabilityPreload(ctx, {
      teamId: args.teamId,
      agentId: args.agentId,
      userIds,
      startAt: args.windowStartAt,
      endAt: args.windowEndAt,
      now,
    });
    if (preload.state === "pending") worker = preload.worker;
    else availabilityByUser = preload.byUser;
  }
  if (availabilityByUser === null) {
    return {
      entries: entries.map((entry): AvailabilityRosterEntry => ({
        ...entry,
        calendarAvailability: { safe: false, intervals: [] },
        futureAssignedEventCount: 0,
        googleCalendarHealthy: false,
      })),
      worker,
    };
  }
  const healthByUser = await loadGoogleCalendarHealthByUser(ctx, userIds);
  const futureCounts = new Map(await Promise.all(userIds.map(async (userId) => {
    const rows = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_teamId_and_role_and_userId_and_eventStartAt", (q) => q
        .eq("teamId", args.teamId)
        .eq("role", "assigned")
        .eq("userId", userId)
        .gte("eventStartAt", now))
      .take(100);
    return [userId, rows.length] as const;
  })));
  return {
    entries: entries.map((entry): AvailabilityRosterEntry => ({
      ...entry,
      calendarAvailability: entry.user === null
        ? { safe: false, intervals: [] }
        : availabilityByUser.get(entry.user._id) ?? { safe: false, intervals: [] },
      futureAssignedEventCount: entry.user === null ? 0 : futureCounts.get(entry.user._id) ?? 0,
      googleCalendarHealthy: entry.user !== null && healthByUser.get(entry.user._id) === true,
    })),
  };
}
