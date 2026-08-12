import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const SHORT_INTERVAL_MS = 31 * DAY_MS;
const MAX_MONTH_BUCKETS = 24;
const MAX_INTERVAL_BUCKETS = 32;

export type AvailabilityBucketKind = "day" | "month" | "long";
export type AvailabilityBucket = { kind: AvailabilityBucketKind; key: string };

function monthKey(time: number) {
  const date = new Date(time);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(time: number) {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function monthStart(time: number) {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function dayBuckets(startAt: number, endAt: number): AvailabilityBucket[] {
  const first = Math.floor(startAt / DAY_MS);
  const last = Math.floor((endAt - 1) / DAY_MS);
  return Array.from({ length: last - first + 1 }, (_, offset) => ({
    kind: "day" as const,
    key: String(first + offset),
  }));
}

function monthBuckets(startAt: number, endAt: number): AvailabilityBucket[] | null {
  const buckets: AvailabilityBucket[] = [];
  for (let cursor = monthStart(startAt); cursor < endAt; cursor = nextMonth(cursor)) {
    if (buckets.length === MAX_MONTH_BUCKETS) return null;
    buckets.push({ kind: "month", key: monthKey(cursor) });
  }
  return buckets;
}

export function availabilityBucketsForInterval(startAt: number, endAt: number) {
  if (endAt <= startAt) throw new Error("Calendar availability interval is invalid");
  if (endAt - startAt <= SHORT_INTERVAL_MS) return dayBuckets(startAt, endAt);
  return monthBuckets(startAt, endAt) ?? [{ kind: "long" as const, key: "all" }];
}

export function availabilityBucketsForWindow(startAt: number, endAt: number) {
  if (endAt <= startAt || endAt - startAt > SHORT_INTERVAL_MS) return null;
  return [
    ...dayBuckets(startAt, endAt),
    ...(monthBuckets(startAt, endAt) ?? []),
    { kind: "long" as const, key: "all" },
  ];
}

export function eventBlocksCalendarAvailability(event: Doc<"calendarEvents">) {
  if (event.status === "cancelled" || event.externalStatus === "cancelled") return false;
  return event.externalTransparency !== "transparent";
}

export async function removeParticipantAvailabilityIntervals(
  ctx: MutationCtx,
  participantId: Id<"calendarEventParticipants">,
) {
  const intervals = await ctx.db
    .query("calendarAvailabilityIntervals")
    .withIndex("by_participantId", (q) => q.eq("participantId", participantId))
    .take(MAX_INTERVAL_BUCKETS + 1);
  if (intervals.length > MAX_INTERVAL_BUCKETS) {
    throw new Error("Calendar participant availability index is invalid");
  }
  for (const interval of intervals) await ctx.db.delete(interval._id);
}

async function insertParticipantAvailabilityIntervals(
  ctx: MutationCtx,
  participant: Doc<"calendarEventParticipants">,
  event: Doc<"calendarEvents"> | null,
  indexedAt: number,
) {
  if (
    event !== null && participant.role === "assigned" && participant.userId !== undefined &&
    eventBlocksCalendarAvailability(event)
  ) {
    for (const bucket of availabilityBucketsForInterval(event.startAt, event.endAt)) {
      await ctx.db.insert("calendarAvailabilityIntervals", {
        participantId: participant._id,
        eventId: event._id,
        teamId: participant.teamId,
        userId: participant.userId,
        bucketKind: bucket.kind,
        bucketKey: bucket.key,
        startAt: event.startAt,
        endAt: event.endAt,
        externalOwnerUserId: event.externalOwnerUserId,
        createdAt: indexedAt,
      });
    }
  }
  await ctx.db.patch(participant._id, {
    eventEndAt: event?.endAt ?? participant.eventEndAt,
    availabilityIndexedAt: indexedAt,
  });
}

export async function indexLegacyParticipantAvailability(
  ctx: MutationCtx,
  participant: Doc<"calendarEventParticipants">,
  indexedAt: number,
) {
  await insertParticipantAvailabilityIntervals(ctx, participant, await ctx.db.get(participant.eventId), indexedAt);
}

export async function syncParticipantAvailabilityIntervals(
  ctx: MutationCtx,
  participantId: Id<"calendarEventParticipants">,
  indexedAt: number,
) {
  const participant = await ctx.db.get(participantId);
  if (participant === null) return;
  await removeParticipantAvailabilityIntervals(ctx, participantId);
  await insertParticipantAvailabilityIntervals(ctx, participant, await ctx.db.get(participant.eventId), indexedAt);
}

export async function syncCalendarEventAvailabilityIntervals(
  ctx: MutationCtx,
  eventId: Id<"calendarEvents">,
  indexedAt: number,
) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(101);
  if (participants.length > 100) throw new Error("Calendar event has too many participants");
  const event = await ctx.db.get(eventId);
  for (const participant of participants) {
    await removeParticipantAvailabilityIntervals(ctx, participant._id);
    await insertParticipantAvailabilityIntervals(ctx, participant, event, indexedAt);
  }
}
