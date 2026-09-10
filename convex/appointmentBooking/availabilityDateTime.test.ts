import { expect, test } from "vitest";
import { parseAvailabilityIso } from "./availabilityDateTime";

test("interprets timezone-less ISO timestamps in the service timezone", () => {
  expect(parseAvailabilityIso(
    "2026-09-11T15:00:00",
    "Asia/Kuala_Lumpur",
  )).toBe(Date.parse("2026-09-11T07:00:00.000Z"));
});

test("preserves explicit ISO timezone offsets", () => {
  expect(parseAvailabilityIso(
    "2026-09-11T15:00:00+08:00",
    "Asia/Kuala_Lumpur",
  )).toBe(Date.parse("2026-09-11T07:00:00.000Z"));
});

test("returns null for malformed availability timestamps", () => {
  expect(parseAvailabilityIso("not-a-date", "Asia/Kuala_Lumpur")).toBeNull();
});
