import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const readWorkflowSource = (filename: string) => readFileSync(
  new URL(filename, import.meta.url),
  'utf8',
);

test('workflow canvas requires and propagates an explicit data mode', () => {
  const contextSource = readWorkflowSource('./workflowAutomationContext.ts');
  const stateSource = readWorkflowSource('./workflowAutomationState.tsx');
  const canvasSource = readWorkflowSource('./WorkflowCanvas.tsx');

  expect(contextSource).toContain(
    "export type WorkflowCanvasDataMode = 'authenticated' | 'local';",
  );
  expect(contextSource).toContain('dataMode: WorkflowCanvasDataMode;');
  expect(canvasSource).toContain('dataMode: WorkflowCanvasDataMode;');
  expect(canvasSource).toContain('dataMode={props.dataMode}');
  expect(stateSource).toContain('dataMode: WorkflowCanvasDataMode;');
  expect(stateSource).toContain('dataMode,');
  expect(stateSource).toContain('[agentId, configs, dataMode, onChange]');
});

test('landing uses local data while dashboard uses authenticated data', () => {
  const landingSource = readFileSync(
    new URL('../landing/LandingAppPreviewWorkflow.tsx', import.meta.url),
    'utf8',
  );
  const dashboardSource = readFileSync(
    new URL('../../pages/WorkflowPage.tsx', import.meta.url),
    'utf8',
  );

  expect(landingSource).toContain('dataMode="local"');
  expect(dashboardSource).toContain('dataMode="authenticated"');
});
