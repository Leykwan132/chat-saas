import type { Id } from "../_generated/dataModel";

export type PartnerAuthSurface = {
  kind: "partner";
  hostname: string;
  partnerId: Id<"whiteLabelPartners">;
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
};

export type PartnerSignInResult = {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
  };
};
