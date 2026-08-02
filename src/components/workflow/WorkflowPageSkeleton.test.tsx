import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { WorkflowPageSkeleton } from './WorkflowPageSkeleton';

const sourcePath = fileURLToPath(new URL('./WorkflowPageSkeleton.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow page skeleton previews the full navigation and branching canvas', () => {
  const markup = renderToStaticMarkup(<WorkflowPageSkeleton />);
  const titleIndex = markup.indexOf('data-workflow-skeleton-navigation="page-title"');
  const toolsIndex = markup.indexOf('data-workflow-skeleton-navigation="canvas-tools"');
  const tabsIndex = markup.indexOf('data-workflow-skeleton-navigation="workflow-tabs"');

  expect(titleIndex).toBeGreaterThan(-1);
  expect(titleIndex).toBeLessThan(toolsIndex);
  expect(toolsIndex).toBeLessThan(tabsIndex);
  expect(source).toContain('data-workflow-skeleton-navigation="workspace"');
  expect(source).toContain('data-workflow-skeleton-navigation="workflow-tabs"');
  expect(source).toContain('data-workflow-skeleton-navigation="canvas-tools"');
  expect(source).toContain('data-workflow-skeleton-node={nodeRole}');
  expect(source).toContain('nodeRole="root"');
  expect(source.match(/nodeRole="subnode"/g)).toHaveLength(3);
  expect(source).toContain('data-workflow-skeleton-connector="dotted-curve"');
  expect(source).toContain('strokeDasharray="5 7"');
});
