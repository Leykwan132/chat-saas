import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

function sourceFile(fileName: string) {
  return readFileSync(fileURLToPath(new URL(fileName, import.meta.url)), 'utf8');
}

function routePathsWithinShell(source: string, shellPath: string) {
  const shellStart = source.indexOf(`<Route path="${shellPath}"`);
  expect(shellStart).toBeGreaterThan(-1);
  const shellEnd = source.indexOf('</Route>', shellStart);
  expect(shellEnd).toBeGreaterThan(shellStart);
  return [...source.slice(shellStart, shellEnd).matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== shellPath);
}

const dashboardCoveredRoutes = [
  'inbox',
  'quick-replies',
  'avatar',
  'overview',
  'knowledge-base/:type',
  'channels',
  'channels/:channelId/templates',
  'customers',
  'customers/:customerId',
  'follow-ups',
  'follow-ups/:ruleId',
  'notifications',
  'broadcast',
  'broadcast/:scheduleId',
  'templates',
  'templates/:templateName',
  'availability',
  'availability/:workosUserId/edit',
  'availability/:workosUserId',
  'services/:serviceId/edit',
  'services/:serviceId',
  'services',
  'lead-assignment',
  'agent-setup',
  'analytics/:section',
  'settings',
];

const dashboardExcludedRoutes = [
  'chats',
  'avatar/create',
  'agent/:threadId?',
  'playground/:threadId?',
  'knowledge-base',
  'follow-ups/new',
  'broadcast/new',
  'templates/new',
  'calendar',
  'services/new',
  'workflow',
  'analytics',
  'account',
];

const workspaceCoveredRoutes = ['settings', 'invitations', 'usage', 'referrals'];
const workspaceExcludedRoutes = ['account', 'partner'];

test('accounts for every authenticated route in the page-title design', () => {
  const mainSource = sourceFile('../main.tsx');
  const dashboardRoutes = routePathsWithinShell(mainSource, '/dashboard/:agentId');
  const workspaceRoutes = routePathsWithinShell(mainSource, '/workspace');

  expect([...dashboardRoutes].sort()).toEqual([
    ...dashboardCoveredRoutes,
    ...dashboardExcludedRoutes,
  ].sort());
  expect([...workspaceRoutes].sort()).toEqual([
    ...workspaceCoveredRoutes,
    ...workspaceExcludedRoutes,
  ].sort());
});

test('keeps each eligible route tied to a focused typography contract', () => {
  const coverageSources = [
    sourceFile('../components/PageTitleBlock.test.tsx'),
    sourceFile('./DashboardDescribedPageHeaders.test.ts'),
    sourceFile('./DashboardIndexPageTitles.test.ts'),
    sourceFile('./DashboardDetailPageTitles.test.ts'),
  ].join('\n');

  const expectedCoverageMarkers = [
    'ChatsPage.tsx',
    'QuickRepliesPage.tsx',
    'AvatarPage.tsx',
    'AgentOverviewPage.tsx',
    'ChannelsPage.tsx',
    'ChannelWhatsAppTemplatesPage.tsx',
    'CustomersPage.tsx',
    'CustomerDetailPage.tsx',
    'FollowUpPage.tsx',
    'FollowUpDetailPage.tsx',
    'NotificationsPage.tsx',
    'BroadcastPage.tsx',
    'BroadcastDetailPage.tsx',
    'TemplatesPage.tsx',
    'TemplateDetailPage.tsx',
    'ScheduleUserAvailabilityPage.tsx',
    'ScheduleUserDetailPage.tsx',
    'ServicePage.tsx',
    'ServicesPage.tsx',
    'LeadAssignmentPage.tsx',
    'AnalyticsUi.tsx',
    'SettingsPage.tsx',
    'InvitationsPage.tsx',
    'WorkspaceUsagePage.tsx',
    'ReferralsPage.tsx',
    'WorkspacePage.tsx',
  ];

  for (const marker of expectedCoverageMarkers) {
    expect(coverageSources).toContain(marker);
  }

  expect(sourceFile('./SchedulePage.tsx')).toContain('<PageTitleBlock');
  expect(sourceFile('./KnowledgeBasePage.tsx')).toContain('<KnowledgeBaseHeader');
  expect(sourceFile('../components/knowledge-base/KnowledgeBaseHeader.tsx')).toContain(
    '<PageTitleBlock',
  );
  expect(sourceFile('./InstructionsPage.tsx')).toContain('<AgentSetupHeader');
  expect(sourceFile('../components/agent-setup/AgentSetupHeader.tsx')).toContain(
    '<PageTitleBlock',
  );
});
