import { AlertCircle } from "lucide-react";
import type { InboxHandling } from "../../../shared/inboxHandling";

export function InboxHandlingBadge({ handling }: { handling: InboxHandling }) {
  if (handling !== "attention") return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <AlertCircle className="size-3" aria-hidden="true" />
      Needs attention
    </span>
  );
}
