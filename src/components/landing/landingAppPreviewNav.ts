import type { LandingPreviewSectionId } from './landingAppPreviewData';

export type LandingPreviewNavKey = 'overview' | 'agentSetup' | 'workflow';

export type LandingPreviewNavItem = {
  key: LandingPreviewNavKey;
  label: string;
  sectionId: LandingPreviewSectionId;
};

export const landingPreviewSidebarCta = {
  title: 'Explore full version',
  description: 'Explore the full Kilobot workspace when you are ready.',
  actionLabel: 'Get Started',
};

export const landingPreviewNavItems = [
  { key: 'overview', label: 'Overview', sectionId: 'overview' },
  { key: 'agentSetup', label: 'Configuration', sectionId: 'agentSetup' },
  { key: 'workflow', label: 'Workflow', sectionId: 'workflow' },
] satisfies LandingPreviewNavItem[];

export function getLandingPreviewNavTarget(key: LandingPreviewNavKey) {
  const item = landingPreviewNavItems.find((navItem) => navItem.key === key);

  if (!item) {
    throw new Error(`Unknown landing preview nav key: ${key}`);
  }

  return item.sectionId;
}
