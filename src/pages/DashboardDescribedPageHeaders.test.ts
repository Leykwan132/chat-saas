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

test('keeps described dashboard headers 24px from their content', () => {
  const servicesSource = pageSource('./ServicesPage.tsx');
  const channelsSource = pageSource('./ChannelsPage.tsx');
  const overviewSource = pageSource('./AgentOverviewPage.tsx');
  const avatarSource = pageSource('./AvatarPage.tsx');
  const channelTemplatesSource = pageSource('./ChannelWhatsAppTemplatesPage.tsx');
  const workspaceUsageSource = pageSource('./WorkspaceUsagePage.tsx');
  const referralsSource = pageSource('./ReferralsPage.tsx');

  expect(servicesSource).toContain('flex w-full flex-col gap-6');
  expect(channelsSource).toContain('flex w-full flex-col gap-6');
  expect(overviewSource).toContain('flex w-full max-w-none flex-col gap-6');
  expect(avatarSource).toContain('mx-auto flex w-full max-w-6xl flex-col gap-6');
  expect(channelTemplatesSource).toContain('max-w-3xl flex-col gap-6');
  expect(workspaceUsageSource).toContain('space-y-6 max-w-4xl');
  expect(workspaceUsageSource).not.toContain('<div className="mb-4">');
  expect(referralsSource).toContain('animate-fade-in flex-col gap-6 pt-4');
});

test('uses branded normal-weight titles on custom described headers', () => {
  expectBrandTitle(pageSource('./AgentOverviewPage.tsx'), '>Overview</h1>');
  expectBrandTitle(pageSource('./AvatarPage.tsx'), '>Avatar</h1>');
  expectBrandTitle(pageSource('./ChannelWhatsAppTemplatesPage.tsx'), '{label}</h1>');
  expectBrandTitle(pageSource('./WorkspaceUsagePage.tsx'), '{workspaceName} Usage</h1>');
  expectBrandTitle(pageSource('./ReferralsPage.tsx'), 'Get Free Credits');
});
