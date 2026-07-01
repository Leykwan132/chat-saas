import type { ReactNode } from 'react';
import { getWhatsAppTemplateParameter } from '../../../shared/whatsappTemplateParameters';
import { TemplateVariableTooltip } from './TemplateVariableTooltip';

export type DropdownPosition = {
  left: number;
  top: number;
};

function lineHeightPx(style: CSSStyleDeclaration) {
  const explicit = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(explicit)) return explicit;
  return Number.parseFloat(style.fontSize) * 1.2;
}

export function measureCaretDropdownPosition(
  textarea: HTMLTextAreaElement,
  root: HTMLDivElement,
  cursor: number,
): DropdownPosition {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const marker = document.createElement('span');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = style.wordWrap;
  mirror.style.overflowWrap = style.overflowWrap;
  mirror.style.wordBreak = style.wordBreak;
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontStyle = style.fontStyle;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.textTransform = style.textTransform;
  mirror.style.wordSpacing = style.wordSpacing;
  mirror.style.tabSize = style.tabSize;
  mirror.textContent = textarea.value.slice(0, cursor).replace(/\n$/, '\n\u200b');
  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const rawLeft = textareaRect.left - rootRect.left + marker.offsetLeft - textarea.scrollLeft;
  const rawTop =
    textareaRect.top -
    rootRect.top +
    marker.offsetTop -
    textarea.scrollTop +
    lineHeightPx(style) +
    4;
  const left = Math.min(
    Math.max(rawLeft, 8),
    Math.max(root.clientWidth - 264, 8),
  );
  const top = Math.max(rawTop, 8);

  mirror.remove();
  return { left, top };
}

export function renderEditorText(text: string) {
  const parts: ReactNode[] = [];
  const regex = /(^|[^A-Za-z0-9_])@([a-z][a-z0-9_]*)\b/g;
  let cursor = 0;
  let index = 0;

  for (const match of text.matchAll(regex)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) parts.push(text.slice(cursor, matchIndex));
    const prefix = match[1];
    const key = match[2];
    if (prefix) parts.push(prefix);
    const parameter = getWhatsAppTemplateParameter(key);
    if (parameter !== null) {
      parts.push(
        <TemplateVariableTooltip
          key={`${key}-${index}`}
          label={parameter.label}
          example={parameter.example}
        >
          @{key}
        </TemplateVariableTooltip>,
      );
    } else {
      parts.push(`@${key}`);
    }
    cursor = matchIndex + match[0].length;
    index += 1;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
