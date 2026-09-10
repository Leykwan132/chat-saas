import { formatBookingDateTime } from "./fields";
import type { BookingSlot } from "./types";

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
