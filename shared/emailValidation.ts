const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) {
    return false;
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return false;
  }

  const atIndex = trimmed.lastIndexOf("@");
  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (!localPart || !domainPart || localPart.length > 64) {
    return false;
  }

  return true;
}

export function assertValidEmailFormat(email: string, label = "Email"): string {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  if (!isValidEmailFormat(trimmed)) {
    throw new Error("Please enter a valid email address.");
  }
  return trimmed;
}
