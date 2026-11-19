import { cn } from "@/lib/utils";
import { UserRound, Workflow } from "lucide-react";
import { PiRobot } from "react-icons/pi";

export type InboxReplyAuthor = {
  kind: "ai" | "human" | "automation";
  name: string;
};

export function InboxReplyAuthorChip({
  author,
}: {
  author?: InboxReplyAuthor | null;
}) {
  if (!author) return null;
  const Icon =
    author.kind === "ai"
      ? PiRobot
      : author.kind === "human"
        ? UserRound
        : Workflow;
  return (
    <span
      title={`Last reply by ${author.name}`}
      aria-label={`Last reply by ${author.name}`}
      className={cn(
        "inline-flex max-w-24 shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-4",
        author.kind === "ai"
          ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
          : "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{author.name}</span>
    </span>
  );
}
