export type AutoResolveTimer = { startedAt: number; dueAt: number };

export function autoResolveCountdown(timer: AutoResolveTimer, now: number) {
  const duration = Math.max(0, timer.dueAt - timer.startedAt);
  const remaining = Math.max(0, Math.min(duration, timer.dueAt - now));
  const seconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  const label =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(remainder)}`
      : `${pad(minutes)}:${pad(remainder)}`;
  const progress =
    duration <= 0
      ? 1
      : Math.max(0, Math.min(1, (now - timer.startedAt) / duration));
  return { label, progress };
}
