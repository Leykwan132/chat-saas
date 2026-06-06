import { Check, Loader2 } from 'lucide-react';
import { isFileUIPart } from 'ai';
import { useMemo, useState } from 'react';
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
  DialogTitle,
} from '@/components/ui/dialog';
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

export type InboxThreadMessagesProps = {
  messages: InboxUIMessage[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
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
  const audioFiles = useMemo(
    () => files.filter((f) => f.type === 'file' && getMediaCategory(f) === 'audio'),
    [files],
  );
  const otherFiles = useMemo(
    () => files.filter((f) => !(f.type === 'file' && getMediaCategory(f) === 'audio')),
    [files],
  );
  const text = message.text?.trim() ?? '';
  const showText = text.length > 0;

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

export function InboxThreadMessages({
  messages,
  loading = false,
  emptyTitle = 'No messages yet',
  emptyDescription = 'Messages in this conversation will appear here.',
}: InboxThreadMessagesProps) {
  const threadItems = useMemo(() => buildInboxThreadItems(messages), [messages]);
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
                    <div className="flex w-fit max-w-full flex-col items-start gap-1">
                      <InboxMessageBody
                        isCustomer
                        isPending={isPending}
                        message={m}
                      />
                      <span className="pl-0.5 text-xs text-muted-foreground">
                        {formatMessageTime(m._creationTime)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex w-fit max-w-full flex-col items-end gap-1">
                      <OutgoingLabel message={m} />
                      <InboxMessageBody
                        isCustomer={false}
                        isPending={isPending}
                        message={m}
                      />
                      <span className="flex items-center justify-end gap-0.5 pr-0.5 text-xs text-muted-foreground">
                        {isPending ? (
                          <Loader2
                            className="size-2.5 shrink-0 animate-spin opacity-80"
                            aria-label="Sending"
                          />
                        ) : (
                          <Check
                            className="size-2.5 shrink-0 opacity-80"
                            aria-hidden
                          />
                        )}
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
    </>
  );
}
