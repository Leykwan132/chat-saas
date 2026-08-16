import { Position, type EdgeProps } from '@xyflow/react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { TooltipProvider } from '../ui/tooltip';
import { WorkflowEdge } from './WorkflowEdge';
import type { WorkflowFlowEdge } from './workflowTypes';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();

  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

vi.mock('../ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

test('WorkflowEdge renders a condition detail tooltip', () => {
  const markup = renderToStaticMarkup(
    <TooltipProvider>
      <WorkflowEdge
        {...({
          id: 'edge',
          source: 'source',
          target: 'target',
          sourceX: 0,
          sourceY: 0,
          sourcePosition: Position.Right,
          targetX: 100,
          targetY: 0,
          targetPosition: Position.Left,
          label: 'Customer asks about billing',
          data: { conditionDetail: 'Long internal condition detail' },
        } satisfies EdgeProps<WorkflowFlowEdge>)}
      />
    </TooltipProvider>,
  );

  expect(markup).toContain('Long internal condition detail');
  expect(markup).toContain('Customer asks about billing');
  expect(markup).toContain('lucide-signpost-big');
});
