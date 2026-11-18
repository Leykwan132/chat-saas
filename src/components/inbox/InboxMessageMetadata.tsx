import { PiRobot } from "react-icons/pi";
import { AlertCircle, Check, CheckCheck, Loader2, Send } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InboxUIMessage } from "@/lib/inboxOptimistic";
import { hideSystemErrorText } from "@/lib/systemErrorText";

export function OutgoingReceiptIcon({
  message,
  isPending,
}: {
  message: InboxUIMessage;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <Loader2
        className="size-2.5 shrink-0 animate-spin opacity-80"
        aria-label="Sending"
      />
    );
  }

  switch (message.channelStatus) {
    case "read":
      return (
        <CheckCheck
          className="size-2.5 shrink-0 text-blue-500"
          aria-label="Read"
        />
      );
    case "delivered":
      return (
        <CheckCheck
          className="size-2.5 shrink-0 opacity-80"
          aria-label="Delivered"
        />
      );
    case "failed":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertCircle
              className="size-2.5 shrink-0 text-destructive"
              aria-label="Failed to send"
            />
          </TooltipTrigger>
          <TooltipContent>
            {message.failureReason
              ? hideSystemErrorText(message.failureReason)
              : "Failed to send"}
          </TooltipContent>
        </Tooltip>
      );
    case "queued":
    case "sent":
    default:
      return (
        <Check className="size-2.5 shrink-0 opacity-80" aria-label="Sent" />
      );
  }
}

export function DayDivider({ label }: { label: string }) {
  return (
    <div
      className="flex w-full justify-center py-3"
      role="separator"
      aria-label={label}
    >
      <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function OutgoingLabel({ message }: { message: InboxUIMessage }) {
  const isCommentAutomation =
    message.workflowAutomationSource === "commentAutomation";
  return (
    <span className="flex items-center justify-end gap-1 pr-0.5 text-xs text-muted-foreground">
      {message.sentByAi ? (
        <PiRobot
          className="size-3.5 shrink-0"
          role="img"
          aria-label="AI agent"
        />
      ) : null}
      <span>{message.agentName ?? "Unknown agent"}</span>
      {isCommentAutomation ? (
        <span className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/5 px-1 py-px text-xs font-medium text-muted-foreground">
          <Send className="size-3" />
          Comment-to-inbox message
        </span>
      ) : null}
    </span>
  );
}
