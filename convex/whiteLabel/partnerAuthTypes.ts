import type { Id } from "../_generated/dataModel";

export type PartnerAuthSurface = {
  kind: "partner";
  hostname: string;
  partnerId: Id<"whiteLabelPartners">;
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
};

export type PartnerSignInResult = {
  kind: "session";
  token: string;
  user: PartnerAuthUser;
} | {
  kind: "organization_choice";
  organizations: Array<{
    id: Id<"whiteLabelPartnerOrganizations">;
    name: string;
  }>;
};

export type PartnerAuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
};
