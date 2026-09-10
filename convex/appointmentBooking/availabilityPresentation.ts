import { formatBookingDateTime } from "./fields";
import type { BookingSlot } from "./types";

type AvailabilityDisplaySlot = {
  date: string;
  timeRange: string;
  assignedDisplayName?: string;
};

export function formatAvailabilitySlotsForTool(slots: BookingSlot[], timeZone: string) {
  return slots.map((slot) => {
    const display = formatBookingDateTime(slot.startAt, slot.endAt, timeZone);
    return {
      ...slot,
      startTimeIso: new Date(slot.startAt).toISOString(),
      endTimeIso: new Date(slot.endAt).toISOString(),
      date: display.date,
      timeRange: display.timeRange,
    };
  });
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
