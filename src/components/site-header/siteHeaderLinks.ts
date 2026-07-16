import { KILOBOT_DOCS_URL } from '@/lib/docsLinks';

export type SiteHeaderNavLink = {
  label: string;
  to: string;
  external?: boolean;
};

export const siteHeaderNavLinks = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Docs', to: KILOBOT_DOCS_URL, external: true },
] as const satisfies readonly SiteHeaderNavLink[];
