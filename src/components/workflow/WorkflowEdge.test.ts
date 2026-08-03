import { createElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';

vi.mock('@xyflow/react', () => ({
  BaseEdge: () => null,
  EdgeLabelRenderer: ({ children }: { children: ReactNode }) => children,
  Position: { Left: 'left', Right: 'right' },
  getBezierPath: () => ['M 0 0', 0, 0],
}));

import { WorkflowEdge } from './WorkflowEdge';

test('workflow condition labels use the Split icon', () => {
  const markup = renderToStaticMarkup(
    createElement(WorkflowEdge, {
      label: 'Customer is ready to book',
      sourceX: 0,
      sourceY: 0,
      targetX: 120,
      targetY: 0,
    } as ComponentProps<typeof WorkflowEdge>),
  );

  expect(markup).toContain('lucide-split');
  expect(markup).not.toContain('lucide-clipboard-list');
});
