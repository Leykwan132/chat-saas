import { isValidElement, type ReactNode } from 'react';
import { expect, test } from 'vitest';
import { HoverCard } from '@/components/ui/hover-card';
import { StarterPromotionHoverHint } from './StarterPromotionHoverHint';

function collectReactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectReactText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectReactText(node.props.children);
}

test('explains the Starter promotion when the info icon is hovered', () => {
  const element = StarterPromotionHoverHint();

  expect(isValidElement(element) && element.type).toBe(HoverCard);
  expect(collectReactText(element)).toContain('first 3 months');
  expect(collectReactText(element)).toContain('RM1/month');
  expect(collectReactText(element)).toContain('STARTER1');
});
