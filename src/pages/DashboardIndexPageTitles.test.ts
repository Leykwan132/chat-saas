import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

function pageSource(fileName: string) {
  return readFileSync(fileURLToPath(new URL(fileName, import.meta.url)), 'utf8');
}

function titleClassBeforeMarker(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  expect(markerIndex).toBeGreaterThan(-1);
  const prefix = source.slice(Math.max(0, markerIndex - 500), markerIndex);
  const classMatches = [...prefix.matchAll(/className="([^"]+)"/g)];
  return classMatches.at(-1)?.[1] ?? '';
}

function expectBrandTitle(source: string, marker: string) {
  const className = titleClassBeforeMarker(source, marker);
  expect(className).toContain('font-title');
  expect(className).toContain('font-normal');
  expect(className).not.toContain('font-semibold');
  expect(className).not.toContain('font-bold');
}

test('uses KiloBot typography for authenticated index page titles', () => {
  expectBrandTitle(
    pageSource('./WorkspacePage.tsx'),
    "activeTeam.type === 'personal' ? 'Personal' : activeTeam.name",
  );
  expectBrandTitle(pageSource('./SettingsPage.tsx'), '>Settings</h1>');
  expectBrandTitle(pageSource('./InvitationsPage.tsx'), '>Invitations</h1>');
  expectBrandTitle(pageSource('./ChatsPage.tsx'), '>\n          Inbox\n');
  expectBrandTitle(pageSource('./QuickRepliesPage.tsx'), '>Quick Replies</h1>');
  expectBrandTitle(pageSource('./CustomersPage.tsx'), '>\n            Customers\n');
  expectBrandTitle(pageSource('./FollowUpPage.tsx'), '>Follow-ups</h1>');
  expectBrandTitle(pageSource('./NotificationsPage.tsx'), '>Notifications</h1>');
  expectBrandTitle(pageSource('./BroadcastPage.tsx'), '>Broadcast</h1>');
  expectBrandTitle(pageSource('./TemplatesPage.tsx'), 'Message templates');
  expectBrandTitle(pageSource('./LeadAssignmentPage.tsx'), 'Lead Assignment');

  const analyticsSource = pageSource('../components/analytics/AnalyticsUi.tsx');
  const analyticsHeaderStart = analyticsSource.indexOf('export function AnalyticsSectionHeader');
  const analyticsHeaderEnd = analyticsSource.indexOf('type AnalyticsBlockProps', analyticsHeaderStart);
  expectBrandTitle(
    analyticsSource.slice(analyticsHeaderStart, analyticsHeaderEnd),
    '{title}',
  );
});
