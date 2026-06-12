import { AlertCircle, Check, CheckCheck, Loader2, SmilePlus } from 'lucide-react';
import { isFileUIPart } from 'ai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Attachment,
  AttachmentPreview,
  Attachments,
  getAttachmentLabel,
  getMediaCategory,
  type AttachmentData,
} from '@/components/ai-elements/attachments';
import {
  AudioPlayer,
  AudioPlayerControlBar,
  AudioPlayerDurationDisplay,
  AudioPlayerElement,
  AudioPlayerMuteButton,
  AudioPlayerPlayButton,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerVolumeRange,
} from '@/components/ai-elements/audio-player';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  buildInboxThreadItems,
  formatMessageTime,
} from '@/lib/formatMessageTime';
import type { InboxUIMessage } from '@/lib/inboxOptimistic';
import { inboxMessageFrom } from '@/lib/inboxOptimistic';
import {
  getInboxAudioAttachments,
  getInboxImageAttachments,
  isInboxAudioPlaceholder,
  isInboxImagePlaceholder,
} from '../../../shared/inboxAttachments';
import {
  INBOX_REACTION_EMOJIS,
  type InboxMessageReaction,
} from '../../../shared/messageReactions';
import { cn } from '@/lib/utils';

function getInboxMessageFileParts(
  message: InboxUIMessage,
): AttachmentData[] {
  const parts = message.parts ?? [];
  return parts
    .filter(isFileUIPart)
    .filter((part) => Boolean(part.url))
    .map((part, index) => ({
      ...part,
      id: `${message.key}-file-${index}`,
    }));
}

function OutgoingReceiptIcon({
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
    case 'read':
      return (
        <CheckCheck
          className="size-2.5 shrink-0 text-blue-500"
          aria-label="Read"
        />
      );
    case 'delivered':
      return (
        <CheckCheck
          className="size-2.5 shrink-0 opacity-80"
          aria-label="Delivered"
        />
      );
    case 'failed':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertCircle
              className="size-2.5 shrink-0 text-destructive"
              aria-label="Failed to send"
            />
          </TooltipTrigger>
          <TooltipContent>
            {message.failureReason ?? 'Failed to send'}
          </TooltipContent>
        </Tooltip>
      );
    case 'queued':
    case 'sent':
    default:
      return (
        <Check
          className="size-2.5 shrink-0 opacity-80"
          aria-label="Sent"
        />
      );
  }
}

export type InboxThreadMessagesProps = {
  messages: InboxUIMessage[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onReact?: (message: InboxUIMessage, emoji: string) => void | Promise<void>;
  onRemoveReaction?: (message: InboxUIMessage) => void | Promise<void>;
};

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex w-full justify-center py-3" role="separator" aria-label={label}>
      <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function OutgoingLabel({ message }: { message: InboxUIMessage }) {
  return (
    <span className="flex items-center justify-end gap-1 pr-0.5 text-xs text-muted-foreground">
      <span>{message.agentName ?? 'Unknown agent'}</span>
      {message.sentByAi ? (
        <span className="rounded bg-muted px-1 py-px text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          AI
        </span>
      ) : null}
    </span>
  );
}

function InboxImageLightbox({
  file,
  open,
  onOpenChange,
}: {
  file: AttachmentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!file || file.type !== 'file' || !file.url) return null;

  const label = getAttachmentLabel(file);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          // Override default dialog centering (top-1/2, translate, sm:max-w-md, grid, zoom)
          'fixed inset-0 z-50 m-0 h-svh w-svw max-w-none translate-none transform-none',
          'top-0 left-0 rounded-none border-0 bg-black/50 p-0 shadow-none ring-0 supports-backdrop-filter:backdrop-blur-sm',
          'sm:top-0 sm:left-0 sm:max-w-none',
          'data-open:fade-in-0 data-closed:fade-out-0',
          '[&_[data-slot=dialog-close]]:z-10 [&_[data-slot=dialog-close]]:bg-white/10',
          '[&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/20',
        )}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <div
          className="absolute inset-0 flex cursor-default items-center justify-center p-4"
          onClick={() => onOpenChange(false)}
        >
          <img
            src={file.url}
            alt={label}
            className="max-h-full max-w-full cursor-default object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InboxMessageAttachments({
  files,
  isCustomer,
}: {
  files: AttachmentData[];
  isCustomer: boolean;
}) {
  const [lightboxFile, setLightboxFile] = useState<AttachmentData | null>(null);

  if (files.length === 0) return null;

  return (
    <>
      <Attachments
        className={cn(
          'w-fit',
          isCustomer ? 'ml-0 justify-start' : 'ml-auto justify-end',
        )}
        variant="grid"
      >
        {files.map((file) => {
          const isImage =
            file.type === 'file' &&
            getMediaCategory(file) === 'image' &&
            Boolean(file.url);

          const sizeClass =
            files.length === 1
              ? 'size-48'
              : files.length === 2
                ? 'size-32'
                : 'size-24';

          return (
            <Attachment
              key={file.id}
              className={cn(
                sizeClass,
                'max-w-[min(240px,100%)]',
                isImage && 'cursor-zoom-in',
              )}
              data={file}
              role={isImage ? 'button' : undefined}
              tabIndex={isImage ? 0 : undefined}
              aria-label={isImage ? `View ${getAttachmentLabel(file)}` : undefined}
              onClick={
                isImage
                  ? () => setLightboxFile(file)
                  : undefined
              }
              onKeyDown={
                isImage
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLightboxFile(file);
                      }
                    }
                  : undefined
              }
            >
              <AttachmentPreview />
            </Attachment>
          );
        })}
      </Attachments>
      <InboxImageLightbox
        file={lightboxFile}
        open={lightboxFile !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxFile(null);
        }}
      />
    </>
  );
}

function InboxMessageBody({
  message,
  isCustomer,
  isPending,
}: {
  message: InboxUIMessage;
  isCustomer: boolean;
  isPending: boolean;
}) {
  const files = useMemo(() => getInboxMessageFileParts(message), [message]);
  const audioAttachments = useMemo(
    () => getInboxAudioAttachments(message),
    [message],
  );
  const imageAttachments = useMemo(
    () => getInboxImageAttachments(message),
    [message],
  );
  const audioFiles = useMemo(
    () =>
      audioAttachments.map((file, index) => ({
        type: 'file' as const,
        url: file.url,
        mediaType: file.mediaType,
        id: `${message.key}-audio-${index}`,
      })),
    [audioAttachments, message.key],
  );
  const imageFiles = useMemo(
    () =>
      imageAttachments.map((file, index) => ({
        type: 'file' as const,
        url: file.url,
        mediaType: file.mediaType,
        id: `${message.key}-image-${index}`,
      })),
    [imageAttachments, message.key],
  );
  const otherFiles = useMemo(
    () =>
      files.filter((f) => {
        if (f.type !== 'file') return true;
        const category = getMediaCategory(f);
        return category !== 'audio' && category !== 'image';
      }),
    [files],
  );
  const text = message.text?.trim() ?? '';
  const isAudioPlaceholder = isInboxAudioPlaceholder(text);
  const isImagePlaceholder = isInboxImagePlaceholder(text);
  const showText =
    text.length > 0 &&
    !(isAudioPlaceholder && audioFiles.length > 0) &&
    !(isImagePlaceholder && imageFiles.length > 0);

  return (
    <>
      {audioFiles.map((file) => (
        <AudioPlayer
          key={file.id}
          className={cn(
            'w-[320px] max-w-full my-1',
            isCustomer ? 'self-start' : 'self-end',
          )}
        >
          <AudioPlayerElement src={file.type === 'file' ? file.url! : ''} />
          <AudioPlayerControlBar>
            <AudioPlayerPlayButton />
            <AudioPlayerSeekBackwardButton seekOffset={10} />
            <AudioPlayerSeekForwardButton seekOffset={10} />
            <AudioPlayerTimeDisplay />
            <AudioPlayerTimeRange />
            <AudioPlayerDurationDisplay />
            <AudioPlayerMuteButton />
            <AudioPlayerVolumeRange />
          </AudioPlayerControlBar>
        </AudioPlayer>
      ))}
      {imageFiles.length > 0 ? (
        <InboxMessageAttachments files={imageFiles} isCustomer={isCustomer} />
      ) : null}
      {otherFiles.length > 0 ? (
        <InboxMessageAttachments files={otherFiles} isCustomer={isCustomer} />
      ) : null}
      {showText ? (
        <div
          className={cn(
            'w-fit max-w-full px-3 py-1.5 text-sm leading-snug whitespace-pre-wrap break-words',
            isCustomer
              ? 'rounded-[2px_16px_16px_16px] border border-border bg-card text-foreground'
              : cn(
                  'rounded-[16px_16px_2px_16px] bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200',
                  isPending && 'opacity-80',
                ),
          )}
        >
          {text}
        </div>
      ) : null}
    </>
  );
}

type SelectedReaction = {
  message: InboxUIMessage;
  reaction: InboxMessageReaction;
};

type PendingReaction = {
  messageKey: string;
  emoji: string;
  toastId: string | number;
};

type AnimatingReaction = {
  messageKey: string;
  emoji: string;
};

const REACTION_APPLY_TIMEOUT_MS = 15_000;

function ReactionBadge({
  message,
  onClick,
  animatingEmoji,
}: {
  message: InboxUIMessage;
  onClick: (reaction: InboxMessageReaction) => void;
  animatingEmoji?: string;
}) {
  const reactions = message.reactions ?? [];
  if (reactions.length === 0) return null;
  return (
    <div className="absolute -right-2 -bottom-3 flex gap-1">
      {reactions.slice(0, 3).map((reaction) => (
        <button
          key={`${reaction.actorKey}-${reaction.emoji}`}
          type="button"
          onClick={() => onClick(reaction)}
          className={cn(
            'inline-grid shrink-0 place-items-center rounded-full border border-white bg-neutral-100 p-1.5 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700',
            animatingEmoji === reaction.emoji &&
              'animate-in zoom-in-0 fade-in duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          )}
          aria-label={`View ${reaction.emoji} reaction`}
        >
          <span className="block text-[0.6rem] leading-none">{reaction.emoji}</span>
        </button>
      ))}
    </div>
  );
}

function ReactionPicker({
  message,
  onReact,
}: {
  message: InboxUIMessage;
  onReact?: (message: InboxUIMessage, emoji: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const disabled = !message.externalId || onReact === undefined || message.status === 'pending';

  const handleSelect = (emoji: string) => {
    setOpen(false);
    void onReact?.(message, emoji);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              className="h-6 px-2 rounded-full border border-white bg-neutral-100 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-200 hover:text-foreground data-open:opacity-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-foreground"
              aria-label="React"
            >
              <SmilePlus className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>React</TooltipContent>
      </Tooltip>
      <PopoverContent align="center" side="top" className="w-auto rounded-full p-1">
        <div className="flex gap-1">
          {INBOX_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex size-9 items-center justify-center rounded-full text-lg hover:bg-muted"
              onClick={() => handleSelect(emoji)}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReactionDialog({
  selected,
  onOpenChange,
  onRemoveReaction,
}: {
  selected: SelectedReaction | null;
  onOpenChange: (open: boolean) => void;
  onRemoveReaction?: (message: InboxUIMessage) => void | Promise<void>;
}) {
  const reaction = selected?.reaction;
  const canRemove =
    reaction !== undefined &&
    (reaction.source === 'human' || reaction.source === 'ai') &&
    onRemoveReaction !== undefined;

  return (
    <Dialog open={selected !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Reactions</DialogTitle>
        <DialogDescription>
          {canRemove ? 'Click to remove the emoji.' : 'Reaction details.'}
        </DialogDescription>
        {selected && reaction ? (
          <button
            type="button"
            disabled={!canRemove}
            onClick={() => {
              if (!canRemove) return;
              void onRemoveReaction?.(selected.message);
              onOpenChange(false);
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-lg border p-3 text-left',
              canRemove ? 'hover:bg-muted' : 'cursor-default',
            )}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">{reaction.emoji}</span>
              <span className="text-sm">
                {reaction.actorName ??
                  (reaction.source === 'customer'
                    ? 'Customer'
                    : reaction.source === 'ai'
                      ? 'AI'
                      : 'Team member')}
              </span>
            </span>
            <span className="text-xs capitalize text-muted-foreground">
              {reaction.source}
            </span>
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function InboxThreadMessages({
  messages,
  loading = false,
  emptyTitle = 'No messages yet',
  emptyDescription = 'Messages in this conversation will appear here.',
  onReact,
  onRemoveReaction,
}: InboxThreadMessagesProps) {
  const threadItems = useMemo(() => buildInboxThreadItems(messages), [messages]);
  const [selectedReaction, setSelectedReaction] = useState<SelectedReaction | null>(null);
  const [pendingReaction, setPendingReaction] = useState<PendingReaction | null>(null);
  const [animatingReaction, setAnimatingReaction] = useState<AnimatingReaction | null>(null);

  useEffect(() => {
    if (!pendingReaction) return;

    const message = messages.find((m) => m.key === pendingReaction.messageKey);
    const applied = message?.reactions?.some(
      (reaction) =>
        reaction.emoji === pendingReaction.emoji && reaction.source === 'human',
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
        toast.error('Could not apply reaction');
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

      const toastId = toast.loading('Applying reaction…');
      setPendingReaction({ messageKey: message.key, emoji, toastId });

      try {
        await onReact(message, emoji);
      } catch (e) {
        toast.dismiss(toastId);
        setPendingReaction(null);
        toast.error(e instanceof Error ? e.message : 'Could not react to message');
      }
    },
    [onReact],
  );

  return (
    <>
      <ConversationContent
        scrollClassName="no-scrollbar overscroll-y-contain"
        className="gap-2 px-6 py-6"
      >
        {loading ? null : messages.length === 0 ? (
          <ConversationEmptyState
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          threadItems.map((item) => {
            if (item.type === 'day') {
              return <DayDivider key={item.key} label={item.label} />;
            }

            const m = item.message;
            const isCustomer = m.role === 'user';
            const isPending = m.status === 'pending';

            return (
              <Message from={inboxMessageFrom(m.role)} key={m.key} className="w-full">
                <MessageContent
                  className={cn('max-w-[78%]', !isCustomer && 'ml-auto')}
                >
                  {isCustomer ? (
                    <div className="group flex w-fit max-w-full flex-col items-start gap-1">
                      <div className="relative">
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
                          onClick={(reaction) => setSelectedReaction({ message: m, reaction })}
                        />
                      </div>
                      <span className="pl-0.5 text-xs text-muted-foreground">
                        {formatMessageTime(m._creationTime)}
                      </span>
                    </div>
                  ) : (
                    <div className="group flex w-fit max-w-full flex-col items-end gap-1">
                      <OutgoingLabel message={m} />
                      <div className="relative">
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
                          onClick={(reaction) => setSelectedReaction({ message: m, reaction })}
                        />
                      </div>
                      <span className="flex items-center justify-end gap-0.5 pr-0.5 text-xs text-muted-foreground">
                        <OutgoingReceiptIcon message={m} isPending={isPending} />
                        <span>{formatMessageTime(m._creationTime)}</span>
                      </span>
                    </div>
                  )}
                </MessageContent>
              </Message>
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
