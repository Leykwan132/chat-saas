type PartnerAuthEnvironment = {
  CONVEX_SITE_URL?: string;
  WORKOS_CLIENT_ID?: string;
};

export const partnerAuthIssuer = "kilobot-partner-auth";

function requireEnvironmentValue(
  environment: PartnerAuthEnvironment,
  name: keyof PartnerAuthEnvironment,
) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getPartnerAuthJwtProvider(environment: PartnerAuthEnvironment) {
  return {
    type: "customJwt" as const,
    issuer: partnerAuthIssuer,
    algorithm: "RS256" as const,
    jwks: getPartnerAuthJwksUrl(environment),
    applicationID: requireEnvironmentValue(environment, "WORKOS_CLIENT_ID"),
  };
}

export function getPartnerAuthJwksUrl(environment: PartnerAuthEnvironment) {
  const siteUrl = requireEnvironmentValue(environment, "CONVEX_SITE_URL");
  return new URL("/partner-auth/jwks", siteUrl).toString();
}
