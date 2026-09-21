import { normalizeCustomerFacingResponseFormatting } from "./responseFormatting";

function asSingleReplyMessage(text: string, normalize: boolean): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const content = normalize
    ? normalizeCustomerFacingResponseFormatting(trimmed).trim()
    : trimmed;
  return content ? [content] : [];
}

export function normalizeAiReplyMessages(messages: string[]): string[] {
  return asSingleReplyMessage(messages.join("\n\n"), true);
}

export function splitAiReplyMessages(text: string): string[] {
  return asSingleReplyMessage(text, true);
}

export function splitStreamingAiReplyMessages(text: string): string[] {
  return asSingleReplyMessage(text, false);
}
