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
    <span
      className="relative tabular-nums"
      aria-label={`Auto Resolve in ${countdown.label}`}
    >
      Resolve ({countdown.label})
    </span>
  );
}
