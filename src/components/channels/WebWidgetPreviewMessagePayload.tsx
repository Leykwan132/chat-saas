import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { ExternalLink } from 'lucide-react';
import type { WebWidgetPreviewMessage } from './WebWidgetPreviewConversation';

type MessagePayloadProps = {
  message: WebWidgetPreviewMessage;
  markdown: boolean;
};

const markdownComponents: Components = {
  em: ({ children, ...props }) => <strong {...props}>{children}</strong>,
};

export function MessagePayload({ message, markdown }: MessagePayloadProps) {
  if (message.mediaUrl) {
    return <WidgetMediaPayload message={message} />;
  }

  if (!markdown) {
    return <span className="whitespace-pre-wrap">{message.content}</span>;
  }

  return (
    <StreamingAssistantText
      key={`${message.id}:${message.content}`}
      text={message.content}
    />
  );
}

function PreviewMarkdown({ text }: { text: string }) {
  const processed = text.replace(/\n+/g, '\n\n');

  return (
    <div className="[&_p]:leading-snug [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p:not(:last-child)]:mb-2">
      <Markdown components={markdownComponents}>{processed}</Markdown>
    </div>
  );
}

function StreamingAssistantText({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    if (!text) return;
    const step = Math.max(1, Math.ceil(text.length / 24));
    const timer = window.setInterval(() => {
      setVisibleText((current) => {
        const next = text.slice(0, Math.min(text.length, current.length + step));
        if (next.length >= text.length) window.clearInterval(timer);
        return next;
      });
    }, 35);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <div className="inline">
      <PreviewMarkdown text={visibleText} />
      {visibleText.length < text.length ? (
        <span className="streamingCursor ml-0.5 inline-block w-1 animate-pulse">
          &nbsp;
        </span>
      ) : null}
    </div>
  );
}

function WidgetMediaPayload({ message }: { message: WebWidgetPreviewMessage }) {
  const mediaUrl = message.mediaUrl;
  if (!mediaUrl) return null;
  const captionText = getVisibleMediaCaption(message);

  const caption = captionText ? (
    <div className="text-xs leading-snug text-white/85">
      {message.role === 'assistant' ? (
        <PreviewMarkdown text={captionText} />
      ) : (
        <span className="whitespace-pre-wrap">{captionText}</span>
      )}
    </div>
  ) : null;

  if (isImageWidgetMedia(message)) {
    return (
      <div className="flex max-w-[300px] flex-col gap-2">
        <img
          src={mediaUrl}
          alt=""
          loading="lazy"
          className="max-h-64 rounded-xl border border-white/15 object-contain"
        />
        {caption}
      </div>
    );
  }

  if (isVideoWidgetMedia(message)) {
    return (
      <div className="flex max-w-[300px] flex-col gap-2">
        <video
          src={mediaUrl}
          controls
          className="max-h-64 rounded-xl border border-white/15"
        />
        {caption}
      </div>
    );
  }

  if (isAudioWidgetMedia(message)) {
    return (
      <div className="flex max-w-[300px] flex-col gap-2">
        <audio src={mediaUrl} controls className="w-full max-w-[280px]" />
        {caption}
      </div>
    );
  }

  return (
    <div className="flex max-w-[280px] flex-col gap-2">
      <div className="flex max-w-[280px] items-center gap-2">
        <iframe
          src={mediaUrl}
          title="File preview"
          loading="lazy"
          className="aspect-[9/16] w-40 max-w-full border border-white/15 bg-white/10"
        />
        <a
          href={mediaUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open file"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 hover:bg-white/95"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
      {caption}
    </div>
  );
}

function getVisibleMediaCaption(message: WebWidgetPreviewMessage) {
  const mediaUrl = message.mediaUrl?.trim() ?? '';
  if (
    !message.content.trim() ||
    message.content.trim() === mediaUrl ||
    isUrlOnly(message.content)
  ) {
    return '';
  }
  return message.content.trim();
}

function isImageWidgetMedia(message: WebWidgetPreviewMessage) {
  return isWidgetMedia(message, 'image', /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i);
}

function isVideoWidgetMedia(message: WebWidgetPreviewMessage) {
  return isWidgetMedia(message, 'video', /\.(mp4|webm|mov|m4v)(\?|#|$)/i);
}

function isAudioWidgetMedia(message: WebWidgetPreviewMessage) {
  return isWidgetMedia(message, 'audio', /\.(mp3|wav|ogg|m4a)(\?|#|$)/i);
}

function isUrlOnly(value: string) {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function isWidgetMedia(
  message: WebWidgetPreviewMessage,
  prefix: string,
  extensionPattern: RegExp,
) {
  const contentType = message.contentType.toLowerCase();
  return (
    contentType === prefix ||
    contentType.startsWith(`${prefix}/`) ||
    extensionPattern.test(message.mediaUrl ?? '')
  );
}
