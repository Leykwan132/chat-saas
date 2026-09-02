export type OwnershipRecord = {
  type: "TXT";
  name: string;
  value: string;
};

type CloudflareHostnameResponse = {
  status?: string;
  ssl?: { status?: string };
  verification_errors?: string[];
};

type CloudflareOwnershipVerification = {
  type?: string;
  name?: string;
  value?: string;
};

export function getCustomHostnameCreateParams({
  hostname,
  zoneId,
}: {
  hostname: string;
  zoneId: string;
}) {
  return {
    zone_id: zoneId,
    hostname,
    ssl: { method: "txt" as const, type: "dv" as const },
  };
}

export function getHostnameSnapshot(response: CloudflareHostnameResponse) {
  const validationError = response.verification_errors?.[0] ?? null;
  return {
    hostnameStatus: response.status ?? null,
    certificateStatus: response.ssl?.status ?? null,
    validationError,
  };
}

export function getOwnershipRecord(
  verification: CloudflareOwnershipVerification | undefined,
): OwnershipRecord | null {
  if (
    verification?.type !== "txt" ||
    !verification.name ||
    !verification.value
  ) {
    return null;
  }
  return {
    type: "TXT",
    name: verification.name,
    value: verification.value,
  };
}

export function isExpectedPreCutoverError(error: string | null): boolean {
  return error === "custom hostname does not CNAME to this zone.";
}

export function matchesFallbackOrigin(
  cnameTargets: string[],
  fallbackOrigin: string,
): boolean {
  const normalizedOrigin = fallbackOrigin.trim().toLowerCase().replace(/\.$/, "");
  return cnameTargets.some(
    (target) => target.trim().toLowerCase().replace(/\.$/, "") === normalizedOrigin,
  );
}
