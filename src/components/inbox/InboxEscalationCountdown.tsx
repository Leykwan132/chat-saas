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
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full text-white"
      >
        <rect
          x="1"
          y="1"
          width="98"
          height="42"
          rx="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={countdown.progress * 100}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center tabular-nums"
        aria-label={`Auto Resolve in ${countdown.label}`}
      >
        {countdown.label}
      </span>
    </>
  );
}
