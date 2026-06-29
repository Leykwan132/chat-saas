import { normalizeTimeZone } from "./teamHelpers";

function datePartsInTimeZone(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function toTimeZoneDateKey(ms: number, timeZone: string): string {
  const parts = datePartsInTimeZone(ms, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function getDateKeysInTimeZoneRange(
  startMs: number,
  endMs: number,
  timeZone: string,
  nowMs = Date.now(),
): string[] {
  const rangeEndMs = Math.min(endMs, nowMs);
  const startKey = toTimeZoneDateKey(startMs, timeZone);
  const endKey = toTimeZoneDateKey(rangeEndMs, timeZone);
  const keys: string[] = [];

  for (let key = startKey; key <= endKey; key = addDaysToDateKey(key, 1)) {
    keys.push(key);
  }

  return keys;
}
