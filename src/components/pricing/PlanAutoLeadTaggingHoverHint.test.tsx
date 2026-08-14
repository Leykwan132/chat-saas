import { isValidElement, type ReactNode } from 'react';
import { expect, test } from 'vitest';
import { HoverCard } from '@/components/ui/hover-card';
import { PlanAutoLeadTaggingHoverHint } from './PlanAutoLeadTaggingHoverHint';

type PlanAwareHoverProps = Parameters<typeof PlanAutoLeadTaggingHoverHint>[0] & {
  planId: 'starter' | 'growth';
};

function collectReactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectReactText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectReactText(node.props.children);
}

test('explains the Starter one-time AI Lead Temperature classification', () => {
  const element = PlanAutoLeadTaggingHoverHint({
    label: 'AI Lead Temperature',
    planId: 'starter',
  } satisfies PlanAwareHoverProps);
  const text = collectReactText(element);

  expect(isValidElement(element) && element.type).toBe(HoverCard);
  expect(text).toContain('AI Lead Temperature');
  expect(text).toContain(
    'once when the conversation is initially synced',
  );
  expect(text).not.toContain('refreshes eligible active conversations daily');
  expect(text).toContain('Hot');
  expect(text).toContain('Warm');
  expect(text).toContain('Cold');
});

test('explains the Growth daily AI Lead Temperature refresh', () => {
  const element = PlanAutoLeadTaggingHoverHint({
    label: 'AI Lead Temperature',
    planId: 'growth',
  } satisfies PlanAwareHoverProps);

  expect(collectReactText(element)).toContain(
    'refreshes eligible active conversations daily when new messages arrive',
  );
});
