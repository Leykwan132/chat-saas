import type { Id } from "../_generated/dataModel";
import { partnerAuthIssuer } from "../partnerAuthConfig";

type Identity = {
  issuer: string;
  subject: string;
  [key: string]: unknown;
};

export type AuthSurface =
  | { kind: "kilobot" }
  | {
    kind: "partner";
    hostname: string;
    partnerId: Id<"whiteLabelPartners">;
    partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
  };

export function getAuthSurface(identity: Identity): AuthSurface {
  if (identity.issuer !== partnerAuthIssuer) {
    return { kind: "kilobot" };
  }

  if (
    identity.surface !== "partner" ||
    typeof identity.hostname !== "string" ||
    typeof identity.partnerId !== "string" ||
    typeof identity.partnerOrganizationId !== "string"
  ) {
    throw new Error("Partner authentication surface is invalid.");
  }

  return {
    kind: "partner",
    hostname: identity.hostname,
    partnerId: identity.partnerId as Id<"whiteLabelPartners">,
    partnerOrganizationId: identity.partnerOrganizationId as Id<"whiteLabelPartnerOrganizations">,
  };
}
