import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { parseBatchBookingUpdates } from "./batchBookingUpdateInput";

const bookingOne = "booking-one" as Id<"calendarEvents">;
const bookingTwo = "booking-two" as Id<"calendarEvents">;

test("parses one or more booking updates in the supplied order", () => {
  const inputs = [
    { bookingId: bookingTwo, startTimeIso: "2028-01-05T14:00:00+08:00" },
    { bookingId: bookingOne, startTimeIso: "2028-01-01T16:00:00+08:00" },
  ];

  expect(parseBatchBookingUpdates(inputs, "Asia/Kuala_Lumpur")).toEqual({
    success: true,
    updates: inputs.map((input) => ({
      bookingId: input.bookingId,
      startAt: Date.parse(input.startTimeIso),
    })),
  });
});

test.each([
  [[{ bookingId: bookingOne, startTimeIso: "not-a-date" }]],
  [[
    { bookingId: bookingOne, startTimeIso: "2028-01-01T14:00:00+08:00" },
    { bookingId: bookingOne, startTimeIso: "2028-01-02T14:00:00+08:00" },
  ]],
  [Array.from({ length: 11 }, (_, index) => ({
    bookingId: `booking-${index}` as Id<"calendarEvents">,
    startTimeIso: `2028-01-${String(index + 1).padStart(2, "0")}T14:00:00+08:00`,
  }))],
])("rejects invalid batch booking update input", (inputs) => {
  expect(parseBatchBookingUpdates(inputs, "Asia/Kuala_Lumpur")).toMatchObject({
    success: false,
  });
});
