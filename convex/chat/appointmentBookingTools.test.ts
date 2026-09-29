import { expect, test } from "vitest";
import { parseBatchAppointmentTimes } from "./appointmentBookingTools";

test("parses two to ten batch appointment ISO values in the supplied order", () => {
  const inputs = [
    "2028-01-05T14:00:00+08:00",
    "2028-01-01T14:00:00+08:00",
    "2028-01-09T14:00:00+08:00",
  ];
  expect(parseBatchAppointmentTimes(inputs, "Asia/Kuala_Lumpur")).toEqual({
    success: true,
    startAts: inputs.map((value) => Date.parse(value)),
  });
});

test.each([
  ["2028-01-01T14:00:00+08:00"],
  Array.from({ length: 11 }, (_, index) => `2028-01-${String(index + 1).padStart(2, "0")}T14:00:00+08:00`),
  ["2028-01-01T14:00:00+08:00", "not-a-date"],
])("returns a tool-safe failure for invalid batch appointment input", (inputs) => {
  expect(parseBatchAppointmentTimes(inputs, "Asia/Kuala_Lumpur")).toMatchObject({
    success: false,
  });
});
