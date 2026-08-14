import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getZonedDayAndMinutes } from "../leadRouting/eligibility";
import { getUserByWorkosId } from "../teamHelpers";
import { displayNameForUser, serviceTimeZone } from "./fields";
import type { BookingSlot, RosterEntry } from "./types";

async function loadRoster(ctx: MutationCtx, agentId: Id<"agents">): Promise<RosterEntry[]> {
  const schedules = await ctx.db
    .query("userSchedules")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
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
  return entries;
}

function isWithinShift(startAt: number, endAt: number, schedule: Doc<"userSchedules">, shifts: Doc<"userShifts">[]) {
  const start = getZonedDayAndMinutes(startAt, schedule.timezone);
  const end = getZonedDayAndMinutes(Math.max(startAt, endAt - 1), schedule.timezone);
  if (start.dayOfWeek !== end.dayOfWeek) return false;
  return shifts.some(
    (shift) =>
      shift.dayOfWeek === start.dayOfWeek &&
      start.minutes >= shift.startMinutes &&
      end.minutes < shift.endMinutes,
  );
}

export function isAssignedToService(
  service: Doc<"appointmentServices">,
  workosUserId: string,
) {
  return service.assignedWorkosUserIds === undefined || service.assignedWorkosUserIds.includes(workosUserId);
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function hasTimeOffOverlap(startAt: number, endAt: number, rows: Doc<"userTimeOff">[]) {
  return rows.some((row) => overlaps(startAt, endAt, row.startAt, row.endAt));
}

async function hasCalendarConflict(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    startAt: number;
    endAt: number;
    excludeEventId?: Id<"calendarEvents">;
  },
) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_eventStartAt", (q) =>
      q
        .eq("teamId", args.teamId)
        .eq("role", "assigned")
        .eq("userId", args.userId)
        .gte("eventStartAt", args.startAt - 24 * 60 * 60 * 1000)
        .lt("eventStartAt", args.endAt),
    )
    .take(100);
  for (const participant of participants) {
    const event = await ctx.db.get(participant.eventId);
    if (
      event !== null &&
      event._id !== args.excludeEventId &&
      event.status !== "cancelled" &&
      overlaps(args.startAt, args.endAt, event.startAt, event.endAt)
    ) {
      return true;
    }
  }
  return false;
}

async function entryAvailableForSlot(
  ctx: MutationCtx,
  service: Doc<"appointmentServices">,
  teamId: Id<"teams">,
  entry: RosterEntry,
  startAt: number,
  endAt: number,
  excludeEventId?: Id<"calendarEvents">,
) {
  if (entry.user === null) return false;
  if (!isAssignedToService(service, entry.schedule.workosUserId)) return false;
  if (!isWithinShift(startAt, endAt, entry.schedule, entry.shifts)) return false;
  if (hasTimeOffOverlap(startAt, endAt, entry.timeOff)) return false;
  return !(await hasCalendarConflict(ctx, {
    teamId,
    userId: entry.user._id,
    startAt,
    endAt,
    excludeEventId,
  }));
}

async function countFutureAssignedEvents(ctx: MutationCtx, teamId: Id<"teams">, userId: Id<"users">, now: number) {
  const rows = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_eventStartAt", (q) =>
      q
        .eq("teamId", teamId)
        .eq("role", "assigned")
        .eq("userId", userId)
        .gte("eventStartAt", now),
    )
    .take(100);
  return rows.length;
}

async function chooseAssigneeForSlot(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    entries: RosterEntry[];
    startAt: number;
    endAt: number;
    excludeEventId?: Id<"calendarEvents">;
  },
): Promise<RosterEntry | null> {
  const available: RosterEntry[] = [];
  for (const entry of args.entries) {
    if (await entryAvailableForSlot(ctx, args.service, args.teamId, entry, args.startAt, args.endAt, args.excludeEventId)) {
      available.push(entry);
    }
  }
  if (available.length === 0) return null;

  if (args.service.assignmentStrategy === "specific_user") {
    return available.find((entry) => entry.schedule.workosUserId === args.service.specificWorkosUserId) ?? null;
  }

  const conversationOwnerWorkosUserId = args.conversation?.assignedUserId;
  if (args.service.assignmentStrategy === "conversation_owner" && conversationOwnerWorkosUserId) {
    const owner = available.find((entry) => entry.schedule.workosUserId === conversationOwnerWorkosUserId);
    if (owner) return owner;
  }

  if (args.service.assignmentStrategy === "round_robin") {
    const sorted = [...available].sort((a, b) => a.schedule.createdAt - b.schedule.createdAt);
    const ids = sorted.map((entry) => entry.schedule.workosUserId);
    const lastIndex = args.service.lastAssignedWorkosUserId ? ids.indexOf(args.service.lastAssignedWorkosUserId) : -1;
    return sorted[(lastIndex + 1) % sorted.length] ?? null;
  }

  const withCounts = [];
  for (const entry of available) {
    if (entry.user === null) continue;
    withCounts.push({
      entry,
      count: await countFutureAssignedEvents(ctx, args.teamId, entry.user._id, Date.now()),
    });
  }
  withCounts.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;
    return a.entry.schedule.createdAt - b.entry.schedule.createdAt;
  });
  return withCounts[0]?.entry ?? null;
}

function roundUpToSlotInterval(time: number, intervalMinutes = 30) {
  const intervalMs = intervalMinutes * 60 * 1000;
  return Math.ceil(time / intervalMs) * intervalMs;
}

function sortSlotsWithPreferredTime(slots: BookingSlot[], service: Doc<"appointmentServices">) {
  const preferredTimeMinutes = service.preferredTimeMinutes;
  if (preferredTimeMinutes === undefined || preferredTimeMinutes.length === 0) {
    return slots;
  }

  const timeZone = serviceTimeZone(service);
  const used = new Set<number>();
  const sorted: BookingSlot[] = [];

  for (const preferredMinutes of preferredTimeMinutes) {
    for (const slot of slots) {
      if (used.has(slot.startAt)) continue;
      const { minutes } = getZonedDayAndMinutes(slot.startAt, timeZone);
      if (minutes === preferredMinutes) {
        sorted.push(slot);
        used.add(slot.startAt);
      }
    }
  }

  for (const slot of slots) {
    if (!used.has(slot.startAt)) {
      sorted.push(slot);
    }
  }

  return sorted;
}

export async function generateSlots(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    rangeStartAt: number;
    rangeEndAt: number;
    limit: number;
    prioritizePreferredTimes?: boolean;
    excludeEventId?: Id<"calendarEvents">;
  },
): Promise<BookingSlot[]> {
  const roster = await loadRoster(ctx, args.service.agentId);
  const durationMs = args.service.durationMinutes * 60 * 1000;
  const bufferMs = (args.service.bufferMinutes ?? 0) * 60 * 1000;
  const slots: BookingSlot[] = [];
  const maxCandidates = args.prioritizePreferredTimes === false ? args.limit : 200;
  for (
    let startAt = roundUpToSlotInterval(args.rangeStartAt);
    startAt + durationMs <= args.rangeEndAt && slots.length < maxCandidates;
    startAt += 30 * 60 * 1000
  ) {
    const endAt = startAt + durationMs;
    const assignee = await chooseAssigneeForSlot(ctx, {
      service: args.service,
      conversation: args.conversation,
      teamId: args.teamId,
      entries: roster,
      startAt: startAt - bufferMs,
      endAt: endAt + bufferMs,
      excludeEventId: args.excludeEventId,
    });
    if (assignee?.user) {
      slots.push({
        startAt,
        endAt,
        assignedUserId: assignee.user._id,
        assignedWorkosUserId: assignee.schedule.workosUserId,
        assignedDisplayName: displayNameForUser(assignee.user),
      });
    }
  }
  const orderedSlots = args.prioritizePreferredTimes === false
    ? slots
    : sortSlotsWithPreferredTime(slots, args.service);
  return orderedSlots.slice(0, args.limit);
}

export async function resolveAvailableInterval(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    startAt: number;
    endAt: number;
  },
): Promise<BookingSlot | null> {
  if (args.endAt <= args.startAt) return null;
  const entries = await loadRoster(ctx, args.service.agentId);
  const bufferMs = (args.service.bufferMinutes ?? 0) * 60 * 1000;
  const assignee = await chooseAssigneeForSlot(ctx, {
    service: args.service,
    conversation: args.conversation,
    teamId: args.teamId,
    entries,
    startAt: args.startAt - bufferMs,
    endAt: args.endAt + bufferMs,
  });
  if (assignee?.user === undefined || assignee.user === null) return null;
  return {
    startAt: args.startAt,
    endAt: args.endAt,
    assignedUserId: assignee.user._id,
    assignedWorkosUserId: assignee.schedule.workosUserId,
    assignedDisplayName: displayNameForUser(assignee.user),
  };
}
