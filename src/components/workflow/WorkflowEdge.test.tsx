import { Position, type EdgeProps } from '@xyflow/react';
import { cloneElement, type ReactElement, type ReactNode } from 'react';
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
  TooltipTrigger: ({ children }: { children: ReactElement }) => cloneElement(children, {
    'aria-describedby': 'condition-detail-tooltip',
    'data-tooltip-trigger': 'true',
  }),
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div id="condition-detail-tooltip" role="tooltip">{children}</div>
  ),
}));

function findButton(element: ReactNode): ReactElement {
  if (Array.isArray(element)) {
    for (const child of element) {
      try {
        return findButton(child);
      } catch {
        continue;
      }
    }
  }

  if (!element || typeof element !== 'object' || !('props' in element)) {
    throw new Error('Condition trigger not found');
  }

  const reactElement = element as ReactElement<{ children?: ReactNode }>;
  if (reactElement.type === 'button') {
    return reactElement;
  }

  if (typeof reactElement.type === 'function') {
    return findButton(reactElement.type(reactElement.props),);
  }

  return findButton(reactElement.props.children);
}

function workflowEdgeProps(
  data: EdgeProps<WorkflowFlowEdge>['data'],
): EdgeProps<WorkflowFlowEdge> {
  return {
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
    data,
  };
}

test('WorkflowEdge renders a condition detail tooltip', () => {
  const markup = renderToStaticMarkup(
    <TooltipProvider>
      <WorkflowEdge
        {...workflowEdgeProps({ conditionDetail: 'Long internal condition detail' })}
      />
    </TooltipProvider>,
  );

  expect(markup).toContain('Long internal condition detail');
  expect(markup).toContain('Customer asks about billing');
  expect(markup).toContain('data-tooltip-trigger="true"');
  expect(markup).toContain('role="tooltip"');
});

test('WorkflowEdge selects the target from the focusable condition tooltip trigger', () => {
  const onSelectTargetNode = vi.fn();
  const conditionTrigger = findButton(WorkflowEdge(workflowEdgeProps({
    conditionDetail: 'Long internal condition detail',
    onSelectTargetNode,
  })));
  const stopPropagation = vi.fn();

  expect(conditionTrigger.props.type).toBe('button');
  expect(conditionTrigger.props['aria-describedby']).toBe('condition-detail-tooltip');
  conditionTrigger.props.onClick({ stopPropagation });

  expect(stopPropagation).toHaveBeenCalledOnce();
  expect(onSelectTargetNode).toHaveBeenCalledOnce();
});

test('WorkflowEdge does not expose a tooltip without condition detail', () => {
  const markup = renderToStaticMarkup(
    <TooltipProvider>
      <WorkflowEdge {...workflowEdgeProps({ conditionDetail: undefined })} />
    </TooltipProvider>,
  );

  expect(markup).not.toContain('data-tooltip-trigger="true"');
  expect(markup).not.toContain('role="tooltip"');
});
