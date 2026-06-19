const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function usageMonthKeyFromTimestamp(createdAt: number): string {
  const date = new Date(createdAt);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function usageMonthLabel(sortKey: string): string {
  const [year, month] = sortKey.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

export function getCalendarMonthsFromEarliestToLatest(
  earliestMs: number,
  latestMs: number,
) {
  const start = new Date(earliestMs);
  const end = new Date(latestMs);
  const months: Array<{ sortKey: string; label: string }> = [];

  let current = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  const endMonth = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1),
  );

  while (current <= endMonth) {
    const sortKey = usageMonthKeyFromTimestamp(current.getTime());
    months.push({ sortKey, label: usageMonthLabel(sortKey) });
    current = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1),
    );
  }

  return months;
}

export function getLast6CalendarMonths(referenceMs: number) {
  const reference = new Date(referenceMs);
  const months: Array<{ sortKey: string; label: string }> = [];

  for (let offset = 5; offset >= 0; offset--) {
    const monthStart = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - offset, 1),
    );
    const sortKey = usageMonthKeyFromTimestamp(monthStart.getTime());
    months.push({ sortKey, label: usageMonthLabel(sortKey) });
  }

  return months;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function toUtcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function getDateKeysInRange(startMs: number, endMs: number): string[] {
  const keys: string[] = [];
  const rangeEndMs = Math.min(endMs, Date.now());
  for (let t = startMs; t <= rangeEndMs; t += DAY_MS) {
    keys.push(toUtcDateKey(t));
  }
  return keys;
}

export function getUsagePeriodStartMs(stripePeriodEndMs?: number): number {
  const MONTHLY_PERIOD_MS = 30 * DAY_MS;
  if (stripePeriodEndMs && stripePeriodEndMs > Date.now()) {
    return stripePeriodEndMs - MONTHLY_PERIOD_MS;
  }
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

export function creditDailyUsageNamespace(
  userId: string,
  dateKey: string,
  agentId: string,
): string {
  return `${userId}:${dateKey}:${agentId}`;
}
