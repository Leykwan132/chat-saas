import { makeFunctionReference } from 'convex/server';

type PlanKey = 'free' | 'starter' | 'growth' | 'business';

export type PartnerOverview = {
  activeOrganizations: number;
  grantCount: number;
  totalGrantedCredits: number;
  planMix: Record<PlanKey, number>;
  organizations: Array<{
    partnerOrganizationId: string;
    name: string;
    status: 'active' | 'suspended';
    planKey: PlanKey;
    monthlyAllowance: number;
    addedCredits: number;
    remainingCredits: number;
    lastGrantAt: number | null;
    grantCount: number;
  }>;
};

export const whiteLabelApi = {
  portal: {
    getCurrentPartner: makeFunctionReference<'query', Record<string, never>, { partnerId: string; name: string; logoStorageId: string | null; domain: { hostname: string; status: string; dnsTarget: string | null } | null } | null>('whiteLabel/portal:getCurrentPartner'),
    getOverview: makeFunctionReference<'query', Record<string, never>, PartnerOverview>('whiteLabel/portal:getOverview'),
    grantCredits: makeFunctionReference<'mutation', { partnerOrganizationId: string; credits: number }, null>('whiteLabel/portal:grantCredits'),
    setOrganizationStatus: makeFunctionReference<'mutation', { partnerOrganizationId: string; status: 'active' | 'suspended' }, null>('whiteLabel/portal:setOrganizationStatus'),
    assignOrganizationPlan: makeFunctionReference<'mutation', { partnerOrganizationId: string; planKey: PlanKey }, null>('whiteLabel/portal:assignOrganizationPlan'),
    updateBrandAndDomain: makeFunctionReference<'mutation', { name: string; hostname?: string }, null>('whiteLabel/portal:updateBrandAndDomain'),
  },
  billing: {
    isBillingBlockedForCurrentWorkspace: makeFunctionReference<'query', Record<string, never>, boolean>('whiteLabel/billing:isBillingBlockedForCurrentWorkspace'),
  },
  actions: {
    createOrganization: makeFunctionReference<'action', { name: string; planKey: PlanKey }, { partnerOrganizationId: string; teamId: string }>('whiteLabel/portalActions:createOrganization'),
    inviteOrganizationAccount: makeFunctionReference<'action', { partnerOrganizationId: string; email: string; role: 'owner' | 'admin' | 'member' }, unknown>('whiteLabel/portalActions:inviteOrganizationAccount'),
  },
  admin: {
    getOwnerWorkspaces: makeFunctionReference<'query', { sessionToken: string; ownerEmail: string }, Array<{ teamId: string; name: string; type: string; workosUserId: string }>>('whiteLabel/admin:getOwnerWorkspaces'),
    listPartners: makeFunctionReference<'query', { sessionToken: string }, Array<{ partnerId: string; name: string; status: string; ownerEmail: string; totalTokens: number; totalCostUsd: number; requestCount: number; assignedAgentCount: number }>>('whiteLabel/admin:listPartners'),
    createPartner: makeFunctionReference<'mutation', { sessionToken: string; ownerEmail: string }, string>('whiteLabel/admin:createPartner'),
  },
};
