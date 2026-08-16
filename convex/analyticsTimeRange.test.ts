import { expect, test } from "vitest";
import { resolveAnalyticsTimeRange } from "./analyticsTimeRange";
import { DAY_MS } from "./usageMonthKey";

test("rolling ranges ignore billing period boundaries", () => {
  const nowMs = Date.UTC(2026, 6, 28, 12);
  const periodStartMs = nowMs;
  const periodEndMs = nowMs + 30 * DAY_MS;

  expect(
    resolveAnalyticsTimeRange("1d", periodStartMs, periodEndMs, nowMs),
  ).toEqual({
    rangeStartMs: nowMs,
    rangeEndMs: nowMs,
  });
  expect(
    resolveAnalyticsTimeRange("90d", periodStartMs, periodEndMs, nowMs),
  ).toEqual({
    rangeStartMs: nowMs - 89 * DAY_MS,
    rangeEndMs: nowMs,
  });
  expect(
    resolveAnalyticsTimeRange("period", periodStartMs, periodEndMs, nowMs),
  ).toEqual({
    rangeStartMs: periodStartMs,
    rangeEndMs: periodEndMs,
  });
});
