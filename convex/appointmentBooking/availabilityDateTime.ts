import { normalizeTimeZone } from "../teamHelpers";

const EXPLICIT_TIME_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;
const LOCAL_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/;

function timeZoneOffsetMs(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, Number(part.value)]),
  );
  const representedAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return representedAsUtc - Math.floor(ms / 1000) * 1000;
}

function isValidLocalDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return false;
  }
  if (millisecond < 0 || millisecond > 999) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export function parseAvailabilityIso(value: string, timeZone: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (EXPLICIT_TIME_ZONE.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const match = LOCAL_ISO.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const millisecond = Number((match[7] ?? "").padEnd(3, "0") || 0);
  if (!isValidLocalDateTime(year, month, day, hour, minute, second, millisecond)) {
    return null;
  }

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let parsed = naiveUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    parsed = naiveUtc - timeZoneOffsetMs(parsed, timeZone);
  }
  return Number.isFinite(parsed) ? parsed : null;
}
