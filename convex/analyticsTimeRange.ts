import { startOfTimeZoneDay } from "./timeZoneDateKeys";
import { DAY_MS, getUsagePeriodStartMs } from "./usageMonthKey";

export type AnalyticsTimeRange = "1d" | "7d" | "30d" | "90d" | "period";

const TIME_RANGE_DAYS: Record<Exclude<AnalyticsTimeRange, "period">, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function resolveLatestBillingPeriod(
  stripePeriodEndMs: number | undefined,
  timeZone: string,
) {
  const periodStartMs = getUsagePeriodStartMs(stripePeriodEndMs);
  return {
    periodStartMs: startOfTimeZoneDay(periodStartMs, timeZone),
    periodEndMs: stripePeriodEndMs ?? periodStartMs + 30 * DAY_MS,
  };
}

export function resolveAnalyticsTimeRange(
  timeRange: AnalyticsTimeRange,
  periodStartMs: number,
  periodEndMs: number,
  nowMs = Date.now(),
) {
  if (timeRange === "period") {
    return { rangeStartMs: periodStartMs, rangeEndMs: periodEndMs };
  }

  return {
    rangeStartMs: nowMs - (TIME_RANGE_DAYS[timeRange] - 1) * DAY_MS,
    rangeEndMs: nowMs,
  };
}
