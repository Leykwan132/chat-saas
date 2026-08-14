import { isValidElement, type ReactNode } from 'react';
import { expect, test } from 'vitest';
import { HoverCard } from '@/components/ui/hover-card';
import { PlanAutoLeadTaggingHoverHint } from './PlanAutoLeadTaggingHoverHint';

type PlanAwareHoverProps = Parameters<typeof PlanAutoLeadTaggingHoverHint>[0] & {
  planId?: 'growth';
};

function collectReactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectReactText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectReactText(node.props.children);
}

test('explains the Starter and Growth cadence in the comparison hover', () => {
  const element = PlanAutoLeadTaggingHoverHint({
    label: 'AI Lead Temperature',
  } satisfies PlanAwareHoverProps);
  const text = collectReactText(element);

  expect(isValidElement(element) && element.type).toBe(HoverCard);
  expect(text).toContain('AI Lead Temperature');
  expect(text).toContain('Starter classifies leads once during initial sync');
  expect(text).toContain(
    'Growth and higher plans refresh eligible active conversations daily when new messages arrive',
  );
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
