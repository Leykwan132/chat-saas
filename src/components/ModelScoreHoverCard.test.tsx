import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Rating } from '@smastrom/react-rating';
import { expect, test, vi } from 'vitest';
import { HoverCard } from '@/components/ui/hover-card';

type HoverCardModule = {
  ModelScoreHoverCard: (props: { modelId: string; children: ReactElement }) => ReactElement;
};

function collectElements(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(collectElements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node, ...collectElements(node.props.children)];
}

function collectText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectText(node.props.children);
}

test('shows the model scorecard in a read-only rating HoverCard', async () => {
  const { ModelScoreHoverCard } = await vi.importActual<HoverCardModule>('./ModelScoreHoverCard');
  const child = createElement('button', null, 'Qwen3.7 Flash');
  const element = ModelScoreHoverCard({ modelId: 'qwen/qwen3.7-flash', children: child });
  const descendants = collectElements(element);
  const rating = descendants.find((candidate) => candidate.type === Rating);
  const text = collectText(element).replace(/\s+/g, ' ');

  expect(element.type).toBe(HoverCard);
  expect(rating?.props).toMatchObject({ value: 4, readOnly: true });
  expect(text).toContain('Kilobot rating');
  expect(text).toContain('4.0 / 5');
  expect(text).toContain('Quality');
  expect(text).toContain('Speed');
  expect(text).toContain('Reasoning');
  expect(text).toContain('Value');
  expect(text).toContain('Chinese · Primary');
  expect(text).toContain('English · Strong');
  expect(text).toContain('Fast Chinese conversations');
});

test('leaves unknown historical models without an empty HoverCard', async () => {
  const { ModelScoreHoverCard } = await vi.importActual<HoverCardModule>('./ModelScoreHoverCard');
  const child = createElement('button', null, 'Historical model');

  expect(ModelScoreHoverCard({ modelId: 'retired/model', children: child })).toBe(child);
});
