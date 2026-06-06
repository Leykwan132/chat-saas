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
