export type RateWindow = { startedAt: number; count: number };
export function consumeWindow(
  previous: RateWindow | undefined,
  now: number,
  maximum: number,
) {
  const window =
    !previous || now >= previous.startedAt + 60000
      ? { startedAt: now, count: 0 }
      : previous;
  const allowed = window.count < maximum;
  return {
    allowed,
    retryAfterSeconds: allowed
      ? 0
      : Math.ceil((window.startedAt + 60000 - now) / 1000),
    window: { ...window, count: window.count + (allowed ? 1 : 0) },
  };
}
