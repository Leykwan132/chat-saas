import { renderToStaticMarkup } from 'react-dom/server';
import { ReactFlowProvider } from '@xyflow/react';
import { expect, test } from 'vitest';
import { WorkflowToolbar } from './WorkflowToolbar';

test('renders one Workflow title above the canvas tool row', () => {
  const markup = renderToStaticMarkup(
    <ReactFlowProvider>
      <WorkflowToolbar
        activeView="messageHandling"
        layoutOrientation="horizontal"
        onArrange={() => undefined}
        onCleanup={() => undefined}
        onTemplateApply={() => undefined}
        onViewChange={() => undefined}
      />
    </ReactFlowProvider>,
  );

  expect(markup.match(/<h1[^>]*>Workflow<\/h1>/g)).toHaveLength(1);
  expect(markup.indexOf('>Workflow</h1>')).toBeLessThan(markup.indexOf('Zoom in'));
  expect(markup).not.toMatch(/<h2[^>]*>Workflow<\/h2>/);
  expect(markup).toContain('nodrag nopan m-6');
  expect(markup).not.toContain('nodrag nopan m-4');
  expect(markup).toContain(
    'font-title text-3xl font-normal tracking-tight text-foreground',
  );
});
