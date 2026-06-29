import { expect, test } from "vitest";
import {
  getDateKeysInTimeZoneRange,
  toTimeZoneDateKey,
} from "./timeZoneDateKeys";

test("builds date keys in the requested timezone", () => {
  const timestamp = Date.parse("2026-06-29T03:30:00.000Z");

  expect(toTimeZoneDateKey(timestamp, "America/New_York")).toBe("2026-06-28");
  expect(toTimeZoneDateKey(timestamp, "Asia/Kuala_Lumpur")).toBe("2026-06-29");
});

test("builds inclusive local calendar ranges", () => {
  const start = Date.parse("2026-06-28T23:30:00.000Z");
  const end = Date.parse("2026-06-29T16:30:00.000Z");

  expect(
    getDateKeysInTimeZoneRange(
      start,
      end,
      "Asia/Kuala_Lumpur",
      end,
    ),
  ).toEqual(["2026-06-29", "2026-06-30"]);
  expect(
    getDateKeysInTimeZoneRange(
      start,
      end,
      "America/New_York",
      end,
    ),
  ).toEqual(["2026-06-28", "2026-06-29"]);
});
