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
  'ChatsPage.tsx',
  'CustomersPage.tsx',
  'FollowUpPage.tsx',
  'LeadAssignmentPage.tsx',
  'QuickRepliesPage.tsx',
];

const compactDetailPages = [
  'BroadcastDetailPage.tsx',
  'FollowUpDetailPage.tsx',
];

const descriptivePageHeaders = [
  {
    fileName: 'ChannelsPage.tsx',
    title: 'Channels',
    description: 'Connect the platforms where customers can reach your agent.',
  },
  {
    fileName: 'SchedulePage.tsx',
    title: 'Availability',
    description: 'Set when your team is available for bookings and lead assignment.',
  },
  {
    fileName: 'ServicesPage.tsx',
    title: 'Services',
    description: 'Create the services customers can book with your team.',
  },
];

describe('page header chrome', () => {
  test.each(compactHeaderPages)('%s uses compact titles without header descriptions', (fileName) => {
    const source = readPage(fileName);

    expect(source).not.toContain('PageDescription');
    expect(source).toContain('font-title text-3xl font-normal tracking-tight text-foreground');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight text-foreground');
  });

  test.each(['ServicePage.tsx', 'TemplatesPage.tsx'])(
    '%s removes the header description',
    (fileName) => {
      const source = readPage(fileName);

      expect(source).not.toContain('PageDescription');
      expect(source).toContain('font-title text-3xl font-normal');
    },
  );

  test.each(['SettingsPage.tsx'])('%s uses a compact page title', (fileName) => {
    const source = readPage(fileName);

    expect(source).toContain('font-title text-3xl font-normal tracking-tight text-foreground');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight text-foreground');
  });

  test.each(compactDetailPages)('%s uses compact detail titles', (fileName) => {
    const source = readPage(fileName);

    expect(source).toContain('font-title text-3xl font-normal tracking-tight');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight');
  });

  test('agent setup header uses the shared compact title', () => {
    const source = readComponent('agent-setup/AgentSetupHeader.tsx');

    expect(source).toContain('PageTitleBlock');
    expect(source).not.toContain('text-4xl font-semibold tracking-tight text-foreground');
  });

  test.each(descriptivePageHeaders)(
    '$fileName shows its page description',
    ({ fileName, title, description }) => {
      const source = readPage(fileName);

      expect(source).toContain('PageTitleBlock');
      expect(source).toContain(`title="${title}"`);
      expect(source).toContain(`description="${description}"`);
    },
  );

  test('agent setup explains Configuration', () => {
    const source = readComponent('agent-setup/AgentSetupHeader.tsx');

    expect(source).toContain('PageTitleBlock');
    expect(source).toContain('title="Configuration"');
    expect(source).toContain(
      'description="Define how your agent behaves and responds to customers."',
    );
  });

  test('Knowledge Base uses its descriptive action header', () => {
    const source = readPage('KnowledgeBasePage.tsx');

    expect(source).toContain('KnowledgeBaseHeader');
  });

  test('shared page title block keeps descriptions visually subordinate', () => {
    const source = readComponent('PageTitleBlock.tsx');

    expect(source).toContain('font-title text-3xl font-normal tracking-tight text-foreground');
    expect(source).toContain('text-sm text-muted-foreground');
  });

  test('analytics section headers use compact titles without descriptions', () => {
    const pageSource = readPage('AnalyticsPage.tsx');
    const headerSource = readComponent('analytics/AnalyticsUi.tsx');

    expect(pageSource).not.toContain('description:');
    expect(pageSource).not.toContain('See how much token spend this agent has used across models over time.');
    expect(headerSource).toMatch(/type AnalyticsSectionHeaderProps = \{\s+title: string;\s+action\?: ReactNode;\s+\};/);
    expect(headerSource).toContain('font-title text-3xl font-normal tracking-tight text-foreground');
    expect(headerSource).not.toContain('sm:text-4xl');
    expect(headerSource).not.toMatch(/export function AnalyticsSectionHeader\([\s\S]*\{description\}[\s\S]*type AnalyticsBlockProps/);
  });
});
