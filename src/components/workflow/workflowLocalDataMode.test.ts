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

test('local workflow template consumers skip organization-scoped queries', () => {
  const templatesSource = readWorkflowSource('./workflowWhatsappTemplates.ts');
  const reminderSource = readWorkflowSource('./WorkflowReminderMessageDialog.tsx');
  const followupSource = readWorkflowSource('./WorkflowFollowupMessageDialog.tsx');

  expect(templatesSource).toContain(
    "dataMode === 'authenticated' ? {} : 'skip'",
  );
  expect(templatesSource).toContain(
    "dataMode === 'authenticated' && (",
  );
  expect(reminderSource).toContain('useWorkflowWhatsappTemplates(dataMode)');
  expect(followupSource).toContain('useWorkflowWhatsappTemplates(dataMode)');
});

test('local workflow state strips agent identity from descendants', () => {
  const stateSource = readWorkflowSource('./workflowAutomationState.tsx');

  expect(stateSource).toContain(
    "agentId: dataMode === 'authenticated' ? agentId : undefined,",
  );
});

test('local follow-up guides do not mount permission checks', () => {
  const guidesSource = readWorkflowSource('./WorkflowFollowupGuides.tsx');

  expect(guidesSource).toContain('function AuthenticatedWorkflowFollowupGuides(');
  expect(guidesSource).toContain('const { can } = usePermissions();');
  expect(guidesSource).toContain("if (dataMode === 'local') {");
  expect(guidesSource).toContain('canManage={false}');
  expect(guidesSource).toContain('<AuthenticatedWorkflowFollowupGuides');
});

test('local follow-up audience skips customer queries regardless of route', () => {
  const audienceSource = readWorkflowSource('./WorkflowFollowupAudienceField.tsx');

  expect(audienceSource).toContain("dataMode === 'authenticated' && agentId");
  expect(audienceSource).toContain("? { agentId: agentId as Id<'agents'> }");
  expect(audienceSource).toContain(": 'skip'");
});
