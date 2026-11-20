import { useEffect, useState } from "react";

export function InboxResumeCountdown({
  dueAt,
  startedAt,
}: {
  dueAt: number;
  startedAt?: number | null;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, [dueAt]);
  const seconds = Math.max(0, Math.ceil((dueAt - now) / 1000));
  const label = seconds >= 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
  const progress =
    startedAt == null
      ? null
      : dueAt <= startedAt
        ? 1
        : Math.max(0, Math.min(1, (now - startedAt) / (dueAt - startedAt)));
  return (
    <span
      className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-foreground"
      aria-label={`AI resumes in ${label}`}
    >
      <svg
        viewBox="0 0 36 36"
        className="pointer-events-none absolute -inset-0.5 size-9 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-border"
        />
        {progress != null ? (
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={-progress * 100}
            strokeLinecap="round"
            className="text-violet-600 transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none dark:text-violet-400"
          />
        ) : null}
      </svg>
      <span className="relative">{label}</span>
    </span>
  );
}
