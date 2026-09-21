import { isValidElement, type ReactNode } from 'react';
import { expect, test } from 'vitest';
import { HoverCard } from '@/components/ui/hover-card';
import { renderPricingFeatureLabel } from './pricingFeatureHover';
import { PlanTeamMembersHoverHint } from './PlanTeamMembersHoverHint';

function collectReactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectReactText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectReactText(node.props.children);
}

test('explains who counts as a team member on pricing cards', () => {
  const element = PlanTeamMembersHoverHint({ label: '5 team members' });

  expect(isValidElement(element) && element.type).toBe(HoverCard);
  expect(collectReactText(element)).toContain('Team members');
  expect(collectReactText(element)).toContain(
    'Members who can log in to the shared inbox to view, assign, or reply to conversations.',
  );
});

test('renders a team-member hover hint from the shared pricing renderer', () => {
  const element = renderPricingFeatureLabel('10 team members', 'growth', false);

  expect(isValidElement(element) && element.type).toBe(PlanTeamMembersHoverHint);
});
