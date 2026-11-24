import { InboxMessageBody } from "./InboxMessageBody";
import {
  DayDivider,
  OutgoingLabel,
  OutgoingReceiptIcon,
} from "./InboxMessageMetadata";
import {
  ReactionBadge,
  ReactionDialog,
  ReactionPicker,
  REACTION_APPLY_TIMEOUT_MS,
  type SelectedReaction,
  type PendingReaction,
  type AnimatingReaction,
} from "./InboxMessageReactions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  buildInboxThreadItems,
  formatMessageTime,
  type InboxEscalationMarker,
} from "@/lib/formatMessageTime";
import type { InboxUIMessage } from "@/lib/inboxOptimistic";
import { inboxMessageFrom } from "@/lib/inboxOptimistic";
import { cn } from "@/lib/utils";
import { InboxEscalationDivider } from "./InboxEscalationDivider";
import { WhatsAppPricingLabel } from "./WhatsAppPricingLabel";

export type InboxThreadMessagesProps = {
  messages: InboxUIMessage[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  escalationMarkers?: InboxEscalationMarker[];
  onReact?: (message: InboxUIMessage, emoji: string) => void | Promise<void>;
  onRemoveReaction?: (message: InboxUIMessage) => void | Promise<void>;
  highlightedLedgerMessageId?: string | null;
};

export function InboxThreadMessages({
  messages,
  loading = false,
  emptyTitle = "No messages yet",
  emptyDescription = "Messages in this conversation will appear here.",
  escalationMarkers = [],
  onReact,
  onRemoveReaction,
  highlightedLedgerMessageId = null,
}: InboxThreadMessagesProps) {
  const threadItems = useMemo(
    () => buildInboxThreadItems(messages, escalationMarkers),
    [escalationMarkers, messages],
  );
  const [selectedReaction, setSelectedReaction] =
    useState<SelectedReaction | null>(null);
  const [pendingReaction, setPendingReaction] =
    useState<PendingReaction | null>(null);
  const [animatingReaction, setAnimatingReaction] =
    useState<AnimatingReaction | null>(null);

  useEffect(() => {
    if (!pendingReaction) return;

    const message = messages.find((m) => m.key === pendingReaction.messageKey);
    const applied = message?.reactions?.some(
      (reaction) =>
        reaction.emoji === pendingReaction.emoji && reaction.source === "human",
    );

    if (applied) {
      toast.dismiss(pendingReaction.toastId);
      setPendingReaction(null);
      setAnimatingReaction({
        messageKey: pendingReaction.messageKey,
        emoji: pendingReaction.emoji,
      });
    }
  }, [messages, pendingReaction]);

  useEffect(() => {
    if (!pendingReaction) return;

    const timeoutId = window.setTimeout(() => {
      setPendingReaction((current) => {
        if (!current) return null;
        toast.dismiss(current.toastId);
        toast.error("Could not apply reaction");
        return null;
      });
    }, REACTION_APPLY_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pendingReaction]);

  useEffect(() => {
    if (!animatingReaction) return;

    const timeoutId = window.setTimeout(() => {
      setAnimatingReaction(null);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [animatingReaction]);

  const handleReact = useCallback(
    async (message: InboxUIMessage, emoji: string) => {
      if (!onReact) return;

      const toastId = toast.loading("Applying reaction…");
      setPendingReaction({ messageKey: message.key, emoji, toastId });

      try {
        await onReact(message, emoji);
      } catch (e) {
        toast.dismiss(toastId);
        setPendingReaction(null);
        toast.error(
          e instanceof Error ? e.message : "Could not react to message",
        );
      }
    },
    [onReact],
  );

  return (
    <>
      <ConversationContent
        scrollClassName="no-scrollbar overscroll-y-contain"
        className="min-w-0 max-w-full gap-2 px-4 py-6 sm:px-6"
      >
        {loading ? null : messages.length === 0 ? (
          <ConversationEmptyState
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          threadItems.map((item) => {
            if (item.type === "day") {
              return <DayDivider key={item.key} label={item.label} />;
            }

            if (item.type === "escalation") {
              return (
                <InboxEscalationDivider
                  key={item.key}
                  escalation={item.escalation}
                />
              );
            }

            const m = item.message;
            const isCustomer = m.role === "user";
            const isPending = m.status === "pending";

            return (
              <div
                id={
                  m.ledgerMessageId
                    ? `inbox-message-${m.ledgerMessageId}`
                    : undefined
                }
                className={cn(
                  m.ledgerMessageId === highlightedLedgerMessageId &&
                    "rounded-lg bg-amber-100/70 dark:bg-amber-900/20",
                )}
              >
                <Message
                  from={inboxMessageFrom(m.role)}
                  key={m.key}
                  className="w-full min-w-0"
                >
                  <MessageContent
                    className={cn(
                      "min-w-0 max-w-[85%] sm:max-w-[78%]",
                      !isCustomer && "ml-auto",
                    )}
                  >
                    {isCustomer ? (
                      <div className="group flex w-fit min-w-0 max-w-full flex-col items-start gap-1">
                        <div className="relative min-w-0 max-w-full">
                          <div className="absolute -right-8 top-1/2 z-10 -translate-y-1/2">
                            <ReactionPicker message={m} onReact={handleReact} />
                          </div>
                          <InboxMessageBody
                            isCustomer
                            isPending={isPending}
                            message={m}
                          />
                          <ReactionBadge
                            message={m}
                            animatingEmoji={
                              animatingReaction?.messageKey === m.key
                                ? animatingReaction.emoji
                                : undefined
                            }
                            onClick={(reaction) =>
                              setSelectedReaction({ message: m, reaction })
                            }
                          />
                        </div>
                        <span className="pl-0.5 text-xs text-muted-foreground">
                          {formatMessageTime(m._creationTime)}
                          {m.revokedAt
                            ? " · Deleted"
                            : m.editedAt
                              ? " · Edited"
                              : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="group flex w-fit min-w-0 max-w-full flex-col items-end gap-1">
                        <OutgoingLabel message={m} />
                        <div className="relative min-w-0 max-w-full">
                          <div className="absolute -left-8 top-1/2 z-10 -translate-y-1/2">
                            <ReactionPicker message={m} onReact={handleReact} />
                          </div>
                          <InboxMessageBody
                            isCustomer={false}
                            isPending={isPending}
                            message={m}
                          />
                          <ReactionBadge
                            message={m}
                            animatingEmoji={
                              animatingReaction?.messageKey === m.key
                                ? animatingReaction.emoji
                                : undefined
                            }
                            onClick={(reaction) =>
                              setSelectedReaction({ message: m, reaction })
                            }
                          />
                        </div>
                        <span className="flex items-center justify-end gap-0.5 pr-0.5 text-xs text-muted-foreground">
                          <OutgoingReceiptIcon
                            message={m}
                            isPending={isPending}
                          />
                          <span>{formatMessageTime(m._creationTime)}</span>
                          {m.sentByAi ? <span> · Sent by AI</span> : null}
                          <WhatsAppPricingLabel
                            service={m.service}
                            pricing={m.receiptPricing}
                          />
                        </span>
                      </div>
                    )}
                  </MessageContent>
                </Message>
              </div>
            );
          })
        )}
      </ConversationContent>
      <ConversationScrollButton />
      <ReactionDialog
        selected={selectedReaction}
        onOpenChange={(open) => {
          if (!open) setSelectedReaction(null);
        }}
        onRemoveReaction={onRemoveReaction}
      />
    </>
  );
}
