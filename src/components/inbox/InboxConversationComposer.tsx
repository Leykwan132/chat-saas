import type { ReactNode } from "react";
import { PiRobot } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ConversationWindowBanner } from "./ConversationWindowBanner";
import { InboxAiHandlingBar } from "./InboxAiHandlingBar";
import { InboxReplyInput, type InboxReplyInputProps } from "./InboxReplyInput";

type InboxConversationComposerProps = InboxReplyInputProps & {
  agentId: Id<"agents"> | undefined;
  aiHandling: boolean;
  focusMode?: boolean;
  whatsappAction?: ReactNode;
  canTakeControl: boolean;
  takingControl: boolean;
  onTakeControl: () => void;
  onHandToAi?: () => void;
  canReplyFromInbox: boolean;
  service: string;
  freeMessagingExpiresAt?: number;
  lastCustomerMessageAt?: number;
};

export function InboxConversationComposer({
  agentId,
  aiHandling,
  focusMode = false,
  whatsappAction,
  canTakeControl,
  takingControl,
  onTakeControl,
  onHandToAi,
  canReplyFromInbox,
  service,
  freeMessagingExpiresAt,
  lastCustomerMessageAt,
  ...replyProps
}: InboxConversationComposerProps) {
  const agent = useQuery(
    api.agents.get,
    aiHandling && agentId ? { agentId } : "skip",
  );
  if (agent === null) throw new Error("Assigned agent is unavailable.");
  const mobileWhatsAppAction = service === "whatsapp" ? whatsappAction : null;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        focusMode &&
          "[&_button]:min-h-11 [&_button]:min-w-11 md:[&_button]:min-h-0 md:[&_button]:min-w-0",
        aiHandling
          ? "gap-3"
          : canReplyFromInbox &&
              "overflow-hidden rounded-2xl border border-border bg-input/50 focus-within:border-ring [&_[data-slot=input-group]]:border-none [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0",
      )}
    >
      <ConversationWindowBanner
        freeMessagingExpiresAt={freeMessagingExpiresAt}
        lastCustomerMessageAt={lastCustomerMessageAt}
        service={service}
        agentId={agentId}
      />
      {aiHandling ? (
        <div className="flex min-w-0 items-center gap-2">
          <InboxAiHandlingBar
            actionLabel={focusMode ? "Take over" : undefined}
            agentName={agent?.name}
            canTakeControl={canTakeControl}
            takingControl={takingControl}
            onTakeControl={onTakeControl}
          />
          {mobileWhatsAppAction}
        </div>
      ) : (
        <InboxReplyInput
          {...replyProps}
          footerAction={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!canTakeControl || takingControl || replyProps.busy}
                onClick={onHandToAi}
                className="min-h-9 gap-1.5 rounded-full bg-violet-700 px-3 text-xs font-semibold text-white hover:bg-violet-800 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500"
              >
                <PiRobot className="size-3.5" aria-hidden="true" />
                {takingControl ? "Handing over…" : "Hand over to AI"}
              </Button>
              {mobileWhatsAppAction}
            </div>
          }
        />
      )}
    </div>
  );
}
