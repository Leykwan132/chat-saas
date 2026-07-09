import { expect, test } from 'vitest';
import conversationSource from './WebWidgetPreviewConversation.tsx?raw';
import payloadSource from './WebWidgetPreviewMessagePayload.tsx?raw';

test('preview conversation renders widget media by content type', () => {
  expect(payloadSource).toContain('function WidgetMediaPayload');
  expect(payloadSource).toContain('function getVisibleMediaCaption');
  expect(payloadSource).toContain('const captionText = getVisibleMediaCaption(message)');
  expect(payloadSource).toContain('message.content.trim() === mediaUrl');
  expect(payloadSource).toContain('isUrlOnly(message.content)');
  expect(payloadSource).toContain('function isUrlOnly');
  expect(payloadSource).toContain('isImageWidgetMedia');
  expect(payloadSource).toContain('<img');
  expect(payloadSource).toContain('<video');
  expect(payloadSource).toContain('<audio');
  expect(payloadSource).toContain('<iframe');
  expect(payloadSource).toContain('title="File preview"');
  expect(payloadSource).toContain('className="flex max-w-[280px] items-center gap-2"');
  expect(payloadSource).toContain('className="aspect-[9/16] w-40 max-w-full border');
  expect(payloadSource).not.toContain('className="aspect-video w-60 max-w-full rounded-xl');
  expect(payloadSource).toContain('aria-label="Open file"');
  expect(payloadSource).toContain('ExternalLink');
  expect(payloadSource).not.toContain('Document preview');
  expect(payloadSource).not.toContain('function getFileNameFromUrl');
  expect(payloadSource).not.toContain('>Open file</a>');
});

test('preview conversation reveals assistant text progressively', () => {
  expect(payloadSource).toContain('function StreamingAssistantText');
  expect(payloadSource).toContain('setVisibleText');
  expect(payloadSource).toContain('streamingCursor');
});

test('preview conversation treats WhatsApp-style single-asterisk emphasis as bold', () => {
  expect(payloadSource).toContain('em: ({ children, ...props }) => <strong');
  expect(payloadSource).toContain('<Markdown components={markdownComponents}>{processed}</Markdown>');
});

test('preview conversation omits assistant avatars from completed messages and thinking rows', () => {
  expect(conversationSource).toContain('function AssistantPreviewMessage');
  expect(conversationSource).toContain('<MessagePayload message={message} markdown />');
  expect(conversationSource).not.toContain(
    '<PreviewAssistantAvatar\n        iconUrl={iconUrl}\n        name={agentName}\n      />',
  );
  expect(conversationSource).toContain('function AssistantThinkingMessage');
  expect(conversationSource).not.toContain('<PreviewAssistantAvatar');
  expect(conversationSource).not.toContain('isAnimating');
});

test('preview conversation thinking text uses a white gray shimmer gradient', () => {
  expect(conversationSource).toContain('function ThinkingShimmerText');
  expect(conversationSource).toContain('linear-gradient(135deg, #ffffff, #5E5E5E, #ffffff)');
  expect(conversationSource).toContain('backgroundSize: \'200% 100%\'');
  expect(conversationSource).toContain('duration: 5');
  expect(conversationSource).toContain('<ThinkingShimmerText>Thinking...</ThinkingShimmerText>');
});

test('preview conversation uses wider spacing and solid dark user bubbles', () => {
  expect(conversationSource).toContain('<ConversationContent className="gap-4');
  expect(conversationSource).toContain('rounded-2xl bg-[#3f403c] px-3 py-2 text-sm leading-snug text-white');
  expect(conversationSource).not.toContain('rounded-lg bg-[#3f403c]');
  expect(conversationSource).not.toContain('border border-white/15 bg-white/15');
  expect(conversationSource).not.toContain('text-white shadow-sm');
});

test('preview conversation exposes a centered scroll-to-latest button', () => {
  expect(conversationSource).toContain('<ConversationScrollButton');
  expect(conversationSource).toContain('aria-label="Scroll to latest message"');
  expect(conversationSource).toContain('bottom-5 size-8 border-0 bg-white text-neutral-900 shadow-md');
});
