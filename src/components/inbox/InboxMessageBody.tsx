import { isFileUIPart } from "ai";
import type { AttachmentData } from "@/components/ai-elements/attachments";
import { InboxMessageAttachments } from "./InboxMessageAttachments";
import { PiProhibit as ProhibitIcon } from "react-icons/pi";
import { Fragment, useMemo } from "react";
import { getMediaCategory } from "@/components/ai-elements/attachments";
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
} from "@/components/ai-elements/audio-player";
import type { InboxUIMessage } from "@/lib/inboxOptimistic";
import {
  getInboxAudioAttachments,
  getInboxImageAttachments,
  isInboxAudioPlaceholder,
  isInboxImagePlaceholder,
} from "../../../shared/inboxAttachments";
import { hideSystemErrorText } from "@/lib/systemErrorText";
import { cn } from "@/lib/utils";
import { splitWhatsAppText } from "@/lib/whatsappText";
import { InboxAudioTranscript } from "./InboxAudioTranscript";
import { InboxBroadcastMessage } from "./InboxBroadcastMessage";
import { InboxWorkflowAutomationMessage } from "./InboxWorkflowAutomationMessage";

function getInboxMessageFileParts(message: InboxUIMessage): AttachmentData[] {
  const parts = message.parts ?? [];
  return parts
    .filter(isFileUIPart)
    .filter((part) => Boolean(part.url))
    .map((part, index) => ({
      ...part,
      id: `${message.key}-file-${index}`,
    }));
}

function WhatsAppFormattedText({ text }: { text: string }) {
  return (
    <>
      {splitWhatsAppText(text).map((segment, index) =>
        segment.bold ? (
          <strong key={index} className="font-semibold">
            {segment.text}
          </strong>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

export function InboxMessageBody({
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
        type: "file" as const,
        url: file.url,
        mediaType: file.mediaType,
        id: `${message.key}-audio-${index}`,
      })),
    [audioAttachments, message.key],
  );
  const imageFiles = useMemo(
    () =>
      imageAttachments.map((file, index) => ({
        type: "file" as const,
        url: file.url,
        mediaType: file.mediaType,
        id: `${message.key}-image-${index}`,
      })),
    [imageAttachments, message.key],
  );
  const otherFiles = useMemo(
    () =>
      files.filter((f) => {
        if (f.type !== "file") return true;
        const category = getMediaCategory(f);
        return category !== "audio" && category !== "image";
      }),
    [files],
  );
  const rawText = message.text?.trim() ?? "";
  const text = isCustomer ? rawText : hideSystemErrorText(rawText);
  const audioTranscripts = (message.inboxMediaUnderstanding?.assets ?? [])
    .filter((asset) => asset.kind === "audio" && asset.audioTranscript)
    .map((asset) => asset.audioTranscript!);
  const isAudioPlaceholder = isInboxAudioPlaceholder(text);
  const isImagePlaceholder = isInboxImagePlaceholder(text);
  const isRevoked = message.revokedAt !== undefined;
  const isCommentAutomation =
    message.workflowAutomationSource === "commentAutomation";
  const showText =
    text.length > 0 &&
    !(isAudioPlaceholder && audioFiles.length > 0) &&
    !(isImagePlaceholder && imageFiles.length > 0);

  if (message.isBroadcast) {
    return (
      <InboxBroadcastMessage presentation={message.broadcastPresentation}>
        {showText ? <WhatsAppFormattedText text={text} /> : null}
      </InboxBroadcastMessage>
    );
  }

  const messageContent = isRevoked ? (
    <div className="flex w-fit max-w-full items-center gap-2 rounded-[2px_16px_16px_16px] border border-border bg-muted px-3 py-1.5 text-sm italic text-muted-foreground">
      <ProhibitIcon aria-hidden="true" size={16} className="shrink-0" />
      <span>This message was deleted</span>
    </div>
  ) : (
    <>
      {audioFiles.map((file, index) => (
        <div key={file.id} className="w-[320px] max-w-full">
          <AudioPlayer
            className={cn(
              "block h-6 w-full",
              isCustomer ? "self-start" : "self-end",
            )}
          >
            <AudioPlayerElement src={file.type === "file" ? file.url! : ""} />
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
          {audioTranscripts[index] ? (
            <InboxAudioTranscript transcript={audioTranscripts[index]} />
          ) : null}
        </div>
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
            "w-fit max-w-full px-3 py-1.5 text-sm leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]",
            message.workflowAutomationSource && !isCommentAutomation
              ? "text-foreground"
              : isCustomer
                ? "rounded-[2px_16px_16px_16px] border border-border bg-card text-foreground"
                : cn(
                    "rounded-[16px_16px_2px_16px]",
                    message.sentByAi
                      ? "bg-violet-600 dark:bg-violet-700 text-white dark:text-white"
                      : "bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200",
                    isPending && "opacity-80",
                  ),
          )}
        >
          <WhatsAppFormattedText text={text} />
        </div>
      ) : null}
    </>
  );
  if (message.workflowAutomationSource && !isCommentAutomation) {
    return (
      <InboxWorkflowAutomationMessage source={message.workflowAutomationSource}>
        {messageContent}
      </InboxWorkflowAutomationMessage>
    );
  }
  return messageContent;
}
