export const SYSTEM_REPORTED_ERROR = "System reported an error.";

const SYSTEM_ERROR_MARKERS = [
  "argumentvalidationerror",
  "uncaught error",
  "[convex",
  "server error",
  "object contains extra field",
  "not in the validator",
];

export function hideSystemErrorText(text: string) {
  const normalized = text.toLowerCase();
  return SYSTEM_ERROR_MARKERS.some((marker) => normalized.includes(marker))
    ? SYSTEM_REPORTED_ERROR
    : text;
}
