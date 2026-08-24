import { makeFunctionReference } from "convex/server";

export type PlanKey = "free" | "starter" | "growth" | "business";

export type PartnerProfile = {
  partnerId: string;
  name: string;
  logoStorageId: string | null;
  logoUrl: string | null;
  domain: {
    hostname: string;
    status: string;
    dnsTarget: string | null;
    setupState:
      | "draft"
      | "ownership_pending"
      | "ownership_checking"
      | "dcv_pending"
      | "certificate_checking"
      | "cutover_pending"
      | "connection_checking"
      | "connected"
      | "failed"
      | null;
    ownershipRecord: DnsRecord | null;
    delegatedDcvRecord: DnsRecord | null;
    cutoverRecord: DnsRecord | null;
    hostnameStatus: string | null;
    certificateStatus: string | null;
    validationError: string | null;
    previewUrl: string | null;
  } | null;
};

export type DnsRecord = {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
};

export type PartnerOverview = {
  activeOrganizations: number;
  grantCount: number;
  totalGrantedCredits: number;
  totalSpentCredits: number;
  planMix: Record<PlanKey, number>;
  organizations: Array<{
    partnerOrganizationId: string;
    name: string;
    status: "active" | "suspended";
    planKey: PlanKey;
    monthlyAllowance: number;
    renewalAt: number;
    customerCount: number;
    addedCredits: number;
    spentCredits: number;
    remainingCredits: number;
    lastGrantAt: number | null;
    grantCount: number;
  }>;
  customers: Array<{
    email: string;
    organizationName: string;
    role: "owner" | "admin" | "member";
    invitationStatus: "pending" | "accepted";
  }>;
};

export const whiteLabelApi = {
  portal: {
    getCurrentPartner: makeFunctionReference<
      "query",
      Record<string, never>,
      PartnerProfile | null
    >("whiteLabel/portal:getCurrentPartner"),
    getOverview: makeFunctionReference<
      "query",
      Record<string, never>,
      PartnerOverview
    >("whiteLabel/portal:getOverview"),
    grantCredits: makeFunctionReference<
      "mutation",
      { partnerOrganizationId: string; credits: number },
      null
    >("whiteLabel/portal:grantCredits"),
    setOrganizationStatus: makeFunctionReference<
      "mutation",
      { partnerOrganizationId: string; status: "active" | "suspended" },
      null
    >("whiteLabel/portal:setOrganizationStatus"),
    assignOrganizationPlan: makeFunctionReference<
      "mutation",
      { partnerOrganizationId: string; planKey: PlanKey },
      null
    >("whiteLabel/portal:assignOrganizationPlan"),
    generateLogoUploadUrl: makeFunctionReference<
      "mutation",
      Record<string, never>,
      string
    >("whiteLabel/portal:generateLogoUploadUrl"),
    updateBranding: makeFunctionReference<
      "mutation",
      { name: string; logoStorageId?: string },
      null
    >("whiteLabel/portal:updateBranding"),
  },
  customHostnames: {
    create: makeFunctionReference<"action", { hostname: string }, null>(
      "whiteLabel/customHostnameActions:createCustomHostname",
    ),
    restart: makeFunctionReference<"action", Record<string, never>, null>(
      "whiteLabel/customHostnameActions:restartCustomHostname",
    ),
    confirmOwnershipDns: makeFunctionReference<
      "mutation",
      Record<string, never>,
      null
    >("whiteLabel/customHostnameData:confirmOwnershipDns"),
    confirmDelegatedDcvDns: makeFunctionReference<
      "mutation",
      Record<string, never>,
      null
    >("whiteLabel/customHostnameData:confirmDelegatedDcvDns"),
    checkCertificateAgain: makeFunctionReference<
      "mutation",
      Record<string, never>,
      null
    >("whiteLabel/customHostnameData:checkCertificateAgain"),
    confirmCutoverDns: makeFunctionReference<
      "mutation",
      Record<string, never>,
      null
    >("whiteLabel/customHostnameData:confirmCutoverDns"),
  },
  billing: {
    isBillingBlockedForCurrentWorkspace: makeFunctionReference<
      "query",
      Record<string, never>,
      boolean
    >("whiteLabel/billing:isBillingBlockedForCurrentWorkspace"),
    isPartnerManagedCurrentWorkspace: makeFunctionReference<
      "query",
      Record<string, never>,
      boolean
    >("whiteLabel/billing:isPartnerManagedCurrentWorkspace"),
  },
  actions: {
    createOrganization: makeFunctionReference<
      "action",
      { name: string; planKey: PlanKey },
      { partnerOrganizationId: string; teamId: string }
    >("whiteLabel/portalActions:createOrganization"),
    inviteOrganizationAccount: makeFunctionReference<
      "action",
      {
        partnerOrganizationId: string;
        email: string;
        role: "owner" | "admin" | "member";
      },
      unknown
    >("whiteLabel/portalActions:inviteOrganizationAccount"),
  },
  admin: {
    getOwnerWorkspaces: makeFunctionReference<
      "query",
      { sessionToken: string; ownerEmail: string },
      Array<{
        teamId: string;
        name: string;
        type: string;
        workosUserId: string;
      }>
    >("whiteLabel/admin:getOwnerWorkspaces"),
    listPartners: makeFunctionReference<
      "query",
      { sessionToken: string },
      Array<{
        partnerId: string;
        name: string;
        status: string;
        ownerEmail: string;
        totalTokens: number;
        totalCostUsd: number;
        requestCount: number;
        assignedAgentCount: number;
      }>
    >("whiteLabel/admin:listPartners"),
    createPartner: makeFunctionReference<
      "mutation",
      { sessionToken: string; ownerEmail: string },
      string
    >("whiteLabel/admin:createPartner"),
  },
};
