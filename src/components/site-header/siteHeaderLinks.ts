export const siteHeaderNavLinks = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Leaderboard', to: '/leaderboard' },
] as const;

export type SiteHeaderNavLink = (typeof siteHeaderNavLinks)[number];
