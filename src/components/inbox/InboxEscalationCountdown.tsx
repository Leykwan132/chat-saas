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
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
        style={{ width: `${(1 - countdown.progress) * 100}%` }}
      />
      <span className="relative tabular-nums">
        Auto Resolve in {countdown.label}
      </span>
    </>
  );
}
