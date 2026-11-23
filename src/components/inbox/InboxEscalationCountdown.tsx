import { useEffect, useState } from "react";
import {
  autoResolveCountdown,
  type AutoResolveTimer,
} from "./autoResolveCountdown";

type Props = { timer: AutoResolveTimer };

export function InboxEscalationCountdown({ timer }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, []);
  const countdown = autoResolveCountdown(timer, now);
  const background =
    countdown.progress >= 0.8
      ? "bg-emerald-900"
      : countdown.progress >= 0.5
        ? "bg-emerald-800"
        : "bg-emerald-700";
  return (
    <span
      className={`pointer-events-none absolute inset-0 flex items-center justify-center tabular-nums ${background}`}
      aria-label={`Auto Resolve in ${countdown.label}`}
    >
      {countdown.label}
    </span>
  );
}
