const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailFromUnknown(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const email = value.trim();
  return EMAIL.test(email) ? email : undefined;
}

export function googleCalendarAccountEmail(
  account: unknown,
  calendarId?: string,
): string | undefined {
  const fromCalendar = emailFromUnknown(calendarId);
  if (fromCalendar !== undefined) return fromCalendar;
  if (typeof account !== "object" || account === null) return undefined;
  const record = account as Record<string, unknown>;
  for (const key of ["email", "account_email", "user_email"]) {
    const email = emailFromUnknown(record[key]);
    if (email !== undefined) return email;
  }
  if (typeof record.identity === "object" && record.identity !== null) {
    return emailFromUnknown((record.identity as { email?: unknown }).email);
  }
  return undefined;
}
