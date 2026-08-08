import { normalizeCustomerFacingResponseFormatting } from "./responseFormatting";

export const AI_REPLY_MESSAGE_BREAK = "<<<MESSAGE_BREAK>>>";
export const MAX_AI_REPLY_MESSAGES = 4;
/** Soft target only: never mid-sentence cut; long list blocks can exceed this. */
export const SOFT_AI_REPLY_MESSAGE_CHARS = 420;

const messageBreakPattern = /<<<\s*MESSAGE_BREAK\s*>>>/g;
const citationsSectionPattern =
  /(?:^|\n)\s*(?:#{1,3}\s+)?(?:\*\*)?(?:Sources?|References?|Citations?)[:*]?\s*(?:\*\*)?\s*(?:\n|$)/i;

export const aiReplyMessageBreakBlock = `\n\n## Sending Several Chat Messages
Write like a person texting, not one long essay.
- Split a longer answer into 2 to ${MAX_AI_REPLY_MESSAGES} natural chat messages with ${AI_REPLY_MESSAGE_BREAK} on its own line between them.
- Good cutoffs: intro / main details or list / closing question. Keep a genuinely short answer as one message.
- Keep a bullet list with its short lead-in in the same message. Do not cut mid-sentence or mid-list item.
- Prefer shorter chat bubbles over one dense block, but never pad with filler.
- Keep any Citations/Sources/References section together after the final chat message. Do not put ${AI_REPLY_MESSAGE_BREAK} inside that section.
- Never mention or explain the separator, and never use it anywhere else.`;

function mergeOverflowMessages(messages: string[]) {
  if (messages.length <= MAX_AI_REPLY_MESSAGES) return messages;
  // ponytail: hard cap is 4 bubbles; leftover text is appended to the last message. Upgrade: raise MAX_AI_REPLY_MESSAGES.
  return [
    ...messages.slice(0, MAX_AI_REPLY_MESSAGES - 1),
    messages.slice(MAX_AI_REPLY_MESSAGES - 1).join("\n\n"),
  ];
}

function splitOnMessageBreak(text: string) {
  return text
    .split(messageBreakPattern)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripTrailingPartialMessageBreak(text: string) {
  for (
    let length = AI_REPLY_MESSAGE_BREAK.length - 1;
    length > 0;
    length -= 1
  ) {
    if (text.endsWith(AI_REPLY_MESSAGE_BREAK.slice(0, length))) {
      return text.slice(0, text.length - length);
    }
  }
  return text;
}

function peelCitationsSection(text: string) {
  const match = text.match(citationsSectionPattern);
  if (!match || match.index === undefined) {
    return { body: text, citationsSection: null as string | null };
  }
  return {
    body: text.slice(0, match.index).trim(),
    citationsSection: text.slice(match.index).trim(),
  };
}

function isListLine(line: string) {
  return /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
}

function isMostlyListBlock(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  const listLines = lines.filter(isListLine).length;
  return listLines >= Math.ceil(lines.length / 2);
}

function splitParagraphBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSentenceGroups(text: string) {
  const sentences =
    text.match(/[^.!?…]+(?:[.!?…]+(?:["”'])?|\n+|$)/g)?.map((part) =>
      part.trim(),
    ) ?? [];
  const units = sentences.filter(Boolean);
  if (units.length <= 1) return [text.trim()].filter(Boolean);

  const groups: string[] = [];
  for (let index = 0; index < units.length; index += 2) {
    groups.push(units.slice(index, index + 2).join(" ").replace(/\s+\n/g, "\n").trim());
  }
  return groups.filter(Boolean);
}

function splitLongBlockNaturally(text: string) {
  if (text.length <= SOFT_AI_REPLY_MESSAGE_CHARS) return [text];
  if (isMostlyListBlock(text)) return [text];
  return splitSentenceGroups(text);
}

function coalesceListLeadIns(blocks: string[]) {
  const coalesced: string[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const current = blocks[index]!;
    const next = blocks[index + 1];
    if (
      next &&
      !isMostlyListBlock(current) &&
      isMostlyListBlock(next) &&
      current.length <= 120 &&
      !current.includes("\n")
    ) {
      coalesced.push(`${current}\n\n${next}`);
      index += 1;
      continue;
    }
    coalesced.push(current);
  }
  return coalesced;
}

function splitIntoNaturalMessages(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const explicitParts = splitOnMessageBreak(trimmed);
  if (explicitParts.length > 1) {
    return explicitParts.flatMap((part) => {
      const blocks = coalesceListLeadIns(splitParagraphBlocks(part));
      if (blocks.length <= 1) return splitLongBlockNaturally(part);
      return blocks.flatMap(splitLongBlockNaturally);
    });
  }

  const paragraphBlocks = coalesceListLeadIns(splitParagraphBlocks(trimmed));
  if (paragraphBlocks.length > 1) {
    return paragraphBlocks.flatMap(splitLongBlockNaturally);
  }

  return splitLongBlockNaturally(trimmed);
}

function attachCitationsSection(
  messages: string[],
  citationsSection: string | null,
) {
  if (!citationsSection) return messages;
  if (messages.length === 0) return [citationsSection];
  const head = messages.slice(0, -1);
  const last = messages[messages.length - 1] ?? "";
  return [...head, `${last}\n\n${citationsSection}`.trim()];
}

function prepareReplyMessages(text: string, normalizeBody: boolean) {
  const { body, citationsSection } = peelCitationsSection(text);
  const messages = mergeOverflowMessages(
    splitIntoNaturalMessages(body)
      .map((message) =>
        normalizeBody
          ? normalizeCustomerFacingResponseFormatting(message).trim()
          : message.trim(),
      )
      .filter(Boolean),
  );
  return attachCitationsSection(messages, citationsSection);
}

export function normalizeAiReplyMessages(messages: string[]): string[] {
  return prepareReplyMessages(
    messages.join(`\n${AI_REPLY_MESSAGE_BREAK}\n`),
    true,
  );
}

export function splitAiReplyMessages(text: string): string[] {
  return prepareReplyMessages(text, true);
}

export function splitStreamingAiReplyMessages(text: string): string[] {
  return prepareReplyMessages(stripTrailingPartialMessageBreak(text), false);
}
