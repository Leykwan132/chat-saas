import type { ReactNode } from 'react';
import { getWhatsAppTemplateParameter } from '../../../shared/whatsappTemplateParameters';
import { TemplateVariableTooltip } from './TemplateVariableTooltip';

const tokenRegex = /(^|[^A-Za-z0-9_])@([a-z][a-z0-9_]*)\b|\{\{([a-z][a-z0-9_]*)\}\}|\*([^*\n]+)\*/g;

function parameterChip(key: string, index: number) {
  const parameter = getWhatsAppTemplateParameter(key);
  if (parameter === null) return null;

  return (
    <TemplateVariableTooltip
      key={`param-${key}-${index}`}
      label={parameter.label}
      example={parameter.example}
    >
      {parameter.example}
    </TemplateVariableTooltip>
  );
}

export function renderWhatsAppPreviewText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of text.matchAll(tokenRegex)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex));
    }

    const prefix = match[1];
    const atKey = match[2];
    const placeholderKey = match[3];
    const boldText = match[4];

    if (atKey) {
      if (prefix) nodes.push(prefix);
      nodes.push(parameterChip(atKey, index) ?? `@${atKey}`);
    } else if (placeholderKey) {
      nodes.push(parameterChip(placeholderKey, index) ?? match[0]);
    } else if (boldText) {
      nodes.push(
        <strong key={`bold-${index}`} className="font-bold">
          {renderWhatsAppPreviewText(boldText)}
        </strong>,
      );
    } else {
      nodes.push(match[0]);
    }

    cursor = matchIndex + match[0].length;
    index += 1;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
