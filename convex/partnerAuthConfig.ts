type PartnerAuthEnvironment = {
  PARTNER_AUTH_JWT_ISSUER?: string;
  PARTNER_AUTH_JWKS_URL?: string;
  WORKOS_CLIENT_ID?: string;
};

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
    issuer: requireEnvironmentValue(environment, "PARTNER_AUTH_JWT_ISSUER"),
    algorithm: "RS256" as const,
    jwks: requireEnvironmentValue(environment, "PARTNER_AUTH_JWKS_URL"),
    applicationID: requireEnvironmentValue(environment, "WORKOS_CLIENT_ID"),
  };
}
