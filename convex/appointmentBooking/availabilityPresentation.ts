import { formatBookingDateTime } from "./fields";
import type { BookingSlot } from "./types";

type AvailabilityDisplaySlot = {
  date: string;
  timeRange: string;
  assignedDisplayName?: string;
};

const MAX_INDIVIDUAL_SLOTS = 5;

function formatAvailabilitySlot(slot: BookingSlot, timeZone: string) {
  const display = formatBookingDateTime(slot.startAt, slot.endAt, timeZone);
  return {
    ...slot,
    startTimeIso: new Date(slot.startAt).toISOString(),
    endTimeIso: new Date(slot.endAt).toISOString(),
    date: display.date,
    timeRange: display.timeRange,
  };
}

function summarizeAvailabilitySlots(slots: BookingSlot[], timeZone: string) {
  const summaries: BookingSlot[][] = [];
  for (const slot of slots) {
    const previousGroup = summaries.at(-1);
    const previousSlot = previousGroup?.at(-1);
    const sameAssignee = previousSlot?.assignedUserId === slot.assignedUserId;
    const sameDate = previousSlot !== undefined &&
      formatBookingDateTime(previousSlot.startAt, previousSlot.endAt, timeZone).date ===
      formatBookingDateTime(slot.startAt, slot.endAt, timeZone).date;
    if (previousGroup !== undefined && previousSlot !== undefined &&
        previousSlot.endAt === slot.startAt && sameAssignee && sameDate) {
      previousGroup.push(slot);
    } else {
      summaries.push([slot]);
    }
  }

  return summaries.map((group) => {
    const first = group[0];
    const last = group.at(-1) ?? first;
    const display = formatBookingDateTime(first.startAt, last.endAt, timeZone);
    return {
      ...first,
      endAt: last.endAt,
      endTimeIso: new Date(last.endAt).toISOString(),
      date: display.date,
      timeRange: display.timeRange,
      slotCount: group.length,
    };
  });
}

export function formatAvailabilitySlotsForTool(slots: BookingSlot[], timeZone: string) {
  if (slots.length <= MAX_INDIVIDUAL_SLOTS) {
    return slots.map((slot) => formatAvailabilitySlot(slot, timeZone));
  }
  return summarizeAvailabilitySlots(slots, timeZone);
}

function isAvailabilityDisplaySlot(value: unknown): value is AvailabilityDisplaySlot {
  if (typeof value !== "object" || value === null) return false;
  const slot = value as Record<string, unknown>;
  return typeof slot.date === "string" && typeof slot.timeRange === "string";
}

export function ensureAvailabilityTimesInReplies(
  replies: string[],
  toolResults: readonly unknown[],
) {
  const slots: AvailabilityDisplaySlot[] = [];
  for (const toolResult of toolResults) {
    if (typeof toolResult !== "object" || toolResult === null) continue;
    const result = toolResult as Record<string, unknown>;
    if (result.toolName !== "checkAvailability") continue;
    const output = result.output;
    if (typeof output !== "object" || output === null) continue;
    const outputRecord = output as Record<string, unknown>;
    if (outputRecord.success !== true || !Array.isArray(outputRecord.slots)) continue;
    for (const slot of outputRecord.slots) {
      if (isAvailabilityDisplaySlot(slot)) slots.push(slot);
    }
  }
  const uniqueSlots = [...new Map(
    slots.map((slot) => [`${slot.date}|${slot.timeRange}`, slot]),
  ).values()];
  if (uniqueSlots.length === 0) return replies;
  const replyText = replies.join("\n");
  if (uniqueSlots.every((slot) =>
    replyText.includes(slot.date) && replyText.includes(slot.timeRange)
  )) {
    return replies;
  }
  const summary = [
    "Available appointment times:",
    ...uniqueSlots.map((slot, index) =>
      `${index + 1}. ${slot.date}, ${slot.timeRange}${slot.assignedDisplayName ? ` (${slot.assignedDisplayName})` : ""}`,
    ),
  ].join("\n");
  if (replies.length === 0) return [summary];
  return [`${summary}\n\n${replies[0]}`, ...replies.slice(1)];
}
