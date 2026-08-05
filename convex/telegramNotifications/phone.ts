export function normalizeTelegramPhone(value: string): string {
  const trimmed = value.trim();
  const hasInternationalPrefix =
    trimmed.startsWith("+") || trimmed.startsWith("00") || /^[1-9]/.test(trimmed);

  if (
    /[A-Za-z]/.test(trimmed) ||
    (trimmed.includes("+") && !trimmed.startsWith("+")) ||
    !hasInternationalPrefix
  ) {
    throw new Error("Enter an international phone number with its country code");
  }

  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("Enter an international phone number with its country code");
  }

  return digits;
}
