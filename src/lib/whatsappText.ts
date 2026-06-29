export type WhatsAppTextSegment = {
  text: string;
  bold: boolean;
};

function canOpenBold(text: string, index: number) {
  const previous = text[index - 1];
  const next = text[index + 1];
  return text[index] === "*" && previous !== "*" && next !== undefined && next !== "*" && !/\s/.test(next);
}

function findClosingBold(text: string, startIndex: number) {
  for (let index = startIndex + 1; index < text.length; index += 1) {
    if (text[index] === '\n') return -1;
    if (text[index] !== '*') continue;
    const previous = text[index - 1];
    const next = text[index + 1];
    if (previous !== undefined && !/\s/.test(previous) && next !== "*") {
      return index;
    }
  }
  return -1;
}

export function splitWhatsAppText(text: string): WhatsAppTextSegment[] {
  const segments: WhatsAppTextSegment[] = [];
  let cursor = 0;
  let index = 0;

  while (index < text.length) {
    if (!canOpenBold(text, index)) {
      index += 1;
      continue;
    }

    const closeIndex = findClosingBold(text, index);
    if (closeIndex === -1) {
      index += 1;
      continue;
    }

    if (cursor < index) {
      segments.push({ text: text.slice(cursor, index), bold: false });
    }
    segments.push({ text: text.slice(index + 1, closeIndex), bold: true });
    cursor = closeIndex + 1;
    index = cursor;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), bold: false });
  }

  return segments;
}
