import { useEffect, useState } from "react";

export function InboxResumeCountdown({ dueAt }: { dueAt: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [dueAt]);
  const seconds = Math.max(0, Math.ceil((dueAt - now) / 1000));
  const label = seconds >= 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
  return (
    <span
      className="mt-0.5 text-[9px] leading-3 text-muted-foreground"
      aria-label={`AI resumes in ${label}`}
    >
      {label}
    </span>
  );
}
