export type SiteHeaderNavLink = {
  label: string;
  to: string;
  external?: boolean;
};

export const siteHeaderNavLinks = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Leaderboard', to: '/leaderboard' },
] as const satisfies readonly SiteHeaderNavLink[];
