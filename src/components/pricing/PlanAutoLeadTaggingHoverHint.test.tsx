import { isValidElement, type ReactNode } from 'react';
import { expect, test } from 'vitest';
import { HoverCard } from '@/components/ui/hover-card';
import { PlanAutoLeadTaggingHoverHint } from './PlanAutoLeadTaggingHoverHint';

function collectReactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectReactText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectReactText(node.props.children);
}

test('explains AI Lead Temperature in its dedicated hover', () => {
  const element = PlanAutoLeadTaggingHoverHint({
    label: 'AI Lead Temperature',
  });
  const text = collectReactText(element);

  expect(isValidElement(element) && element.type).toBe(HoverCard);
  expect(text).toContain('AI Lead Temperature');
  expect(text).toContain(
    'AI analyzes customer conversations and classifies each lead as Hot, Warm, or Cold, helping your team prioritize follow-ups.',
  );
  expect(text).toContain('Hot');
  expect(text).toContain('Warm');
  expect(text).toContain('Cold');
});
