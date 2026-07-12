const ENVIRONMENT_VARIABLE = "ADVANCED_ANALYTICS_CRON_UTC";

export function parseAdvancedAnalyticsCronUtc(value: string | undefined) {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${ENVIRONMENT_VARIABLE} is required`);
  }
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  const hourUTC = Number(match?.[1]);
  const minuteUTC = Number(match?.[2]);
  if (
    match === null ||
    !Number.isInteger(hourUTC) ||
    !Number.isInteger(minuteUTC) ||
    hourUTC < 0 ||
    hourUTC > 23 ||
    minuteUTC < 0 ||
    minuteUTC > 59
  ) {
    throw new Error(`${ENVIRONMENT_VARIABLE} must use HH:MM UTC`);
  }
  return { hourUTC, minuteUTC };
}
