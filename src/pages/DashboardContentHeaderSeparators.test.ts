import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));

function readSource(relativePath: string) {
  return readFileSync(`${sourceRoot}/${relativePath}`, 'utf8');
}

const contentHeaderPaths = [
  'pages/ChannelsPage.tsx',
  'pages/BroadcastPage.tsx',
  'pages/BroadcastDetailPage.tsx',
  'pages/FollowUpPage.tsx',
  'pages/FollowUpDetailPage.tsx',
  'pages/QuickRepliesPage.tsx',
  'pages/ServicesPage.tsx',
  'pages/ServicePage.tsx',
  'pages/SettingsPage.tsx',
  'pages/LeadAssignmentPage.tsx',
  'pages/TemplatesPage.tsx',
  'pages/TemplateDetailPage.tsx',
  'pages/ChannelWhatsAppTemplatesPage.tsx',
  'pages/CreateTemplatePage.tsx',
  'components/agent-setup/AgentSetupHeader.tsx',
  'components/knowledge-base/KnowledgeBaseHeader.tsx',
  'components/templates/TemplateDetailPageSkeleton.tsx',
];

for (const path of contentHeaderPaths) {
  test(`${path} has no dashboard title divider`, () => {
    const source = readSource(path);
    expect(source).not.toMatch(/<header className="[^"]*\bborder-b\b/);
    expect(source).not.toContain('<div className="border-b border-border pb-6">');
  });
}

test('fixed application navigation keeps its separator', () => {
  expect(readSource('layouts/DashboardLayout.tsx')).toContain(
    'sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/50',
  );
});

test('internal dialog headers keep their separators', () => {
  expect(readSource('components/workflow/WorkflowInspectorForm.tsx')).toContain(
    'DialogHeader className="shrink-0 border-b border-border',
  );
});
