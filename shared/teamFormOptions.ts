export const TEAM_INDUSTRY_OPTIONS = [
  { id: 'Technology', label: 'Technology', description: 'Software, SaaS, and digital products' },
  { id: 'E-commerce', label: 'E-commerce', description: 'Online stores and marketplaces' },
  { id: 'Healthcare', label: 'Healthcare', description: 'Clinics, wellness, and care providers' },
  { id: 'Finance', label: 'Finance', description: 'Banking, fintech, and insurance' },
  { id: 'Education', label: 'Education', description: 'Schools, courses, and learning platforms' },
  { id: 'Marketing', label: 'Marketing & advertising', description: 'Agencies, brands, and growth teams' },
  { id: 'Professional Services', label: 'Professional services', description: 'Consulting, legal, and advisory firms' },
  { id: 'Other', label: 'Other', description: 'Everything else' },
] as const;

export const TEAM_COMPANY_SIZE_OPTIONS = [
  { id: '1', label: 'Just me' },
  { id: '2-10', label: '2–10' },
  { id: '11-50', label: '11–50' },
  { id: '51-200', label: '51–200' },
  { id: '201-500', label: '201–500' },
  { id: '500+', label: '500+' },
] as const;

export type TeamIndustryId = (typeof TEAM_INDUSTRY_OPTIONS)[number]['id'];
export type TeamCompanySizeId = (typeof TEAM_COMPANY_SIZE_OPTIONS)[number]['id'];
