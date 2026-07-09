import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

function readPage(fileName: string) {
  return readFileSync(new URL(fileName, import.meta.url), 'utf8');
}

function readComponent(path: string) {
  return readFileSync(new URL(`../components/${path}`, import.meta.url), 'utf8');
}

const compactHeaderPages = [
  'BroadcastPage.tsx',
  'ChannelsPage.tsx',
  'ChatsPage.tsx',
  'CustomersPage.tsx',
  'FollowUpPage.tsx',
  'KnowledgeBasePage.tsx',
  'LeadAssignmentPage.tsx',
  'QuickRepliesPage.tsx',
  'SchedulePage.tsx',
  'ServicesPage.tsx',
];

const compactDetailPages = [
  'BroadcastDetailPage.tsx',
  'FollowUpDetailPage.tsx',
];

describe('page header chrome', () => {
  test.each(compactHeaderPages)('%s uses compact titles without header descriptions', (fileName) => {
    const source = readPage(fileName);

    expect(source).not.toContain('PageDescription');
    expect(source).toContain('text-3xl font-semibold tracking-tight text-foreground');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight text-foreground');
  });

  test.each(['ServicePage.tsx', 'TemplatesPage.tsx'])(
    '%s removes the header description',
    (fileName) => {
      const source = readPage(fileName);

      expect(source).not.toContain('PageDescription');
      expect(source).toContain('text-3xl font-semibold');
    },
  );

  test.each(['SettingsPage.tsx'])('%s uses a compact page title', (fileName) => {
    const source = readPage(fileName);

    expect(source).toContain('text-3xl font-semibold tracking-tight text-foreground');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight text-foreground');
  });

  test.each(compactDetailPages)('%s uses compact detail titles', (fileName) => {
    const source = readPage(fileName);

    expect(source).toContain('text-3xl font-semibold tracking-tight');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight');
  });

  test('agent setup header uses a compact title', () => {
    const source = readComponent('agent-setup/AgentSetupHeader.tsx');

    expect(source).toContain('text-3xl font-semibold tracking-tight text-foreground');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight text-foreground');
  });

  test('analytics section headers use compact titles without descriptions', () => {
    const pageSource = readPage('AnalyticsPage.tsx');
    const headerSource = readComponent('analytics/AnalyticsUi.tsx');

    expect(pageSource).not.toContain('description:');
    expect(pageSource).not.toContain('See how much token spend this agent has used across models over time.');
    expect(headerSource).toMatch(/type AnalyticsSectionHeaderProps = \{\s+title: string;\s+action\?: ReactNode;\s+\};/);
    expect(headerSource).toContain('text-3xl font-semibold tracking-tight text-foreground');
    expect(headerSource).not.toContain('sm:text-4xl');
    expect(headerSource).not.toMatch(/export function AnalyticsSectionHeader\([\s\S]*\{description\}[\s\S]*type AnalyticsBlockProps/);
  });
});
