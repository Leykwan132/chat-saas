import { AlertCircle } from "lucide-react";
import { PiRobot } from "react-icons/pi";
import type { InboxHandling } from "../../../shared/inboxHandling";

export function InboxHandlingBadge({ handling }: { handling: InboxHandling }) {
  if (handling === "human") return null;

  if (handling === "ai") {
    return (
      <span
        title="AI handling"
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-700 px-2 py-0.5 text-[10px] font-bold leading-4 text-white"
      >
        <PiRobot className="size-3" aria-hidden="true" />
        <span aria-hidden="true">AI</span>
        <span className="sr-only">AI handling</span>
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <AlertCircle className="size-3" aria-hidden="true" />
      Needs attention
    </span>
  );
}
