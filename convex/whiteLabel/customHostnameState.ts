export const customHostnameSetupStates = [
  "draft",
  "ownership_pending",
  "ownership_checking",
  "dcv_pending",
  "certificate_checking",
  "cutover_pending",
  "connection_checking",
  "connected",
  "failed",
] as const;

export type CustomHostnameSetupState =
  (typeof customHostnameSetupStates)[number];

export type DnsRecord = {
  name: string;
  type: "CNAME";
  value: string;
};

export type CloudflareHostnameSnapshot = {
  hostnameStatus: string | null;
  certificateStatus: string | null;
};

const hostnamePattern =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeCustomHostname(hostname: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!hostnamePattern.test(normalized)) {
    throw new Error("Enter a valid hostname without a protocol or path.");
  }
  const labels = normalized.split(".");
  if (labels.length < 3) {
    throw new Error("Enter a subdomain such as app.partner.com.");
  }
  if (normalized === "kilobot.app" || normalized.endsWith(".kilobot.app")) {
    throw new Error("Use a customer subdomain outside kilobot.app.");
  }
  return normalized;
}

export function getDelegatedDcvRecord(
  hostname: string,
  delegationTarget: string,
): DnsRecord {
  const normalizedTarget = delegationTarget.trim().toLowerCase().replace(/\.$/, "");
  if (!hostnamePattern.test(normalizedTarget)) {
    throw new Error("Cloudflare DCV delegation target is invalid.");
  }
  return {
    name: `_acme-challenge.${hostname}`,
    type: "CNAME",
    value: `${hostname}.${normalizedTarget}`,
  };
}

export function getCutoverRecord(
  hostname: string,
  fallbackOrigin: string,
): DnsRecord {
  const normalizedOrigin = fallbackOrigin.trim().toLowerCase().replace(/\.$/, "");
  if (!hostnamePattern.test(normalizedOrigin)) {
    throw new Error("Cloudflare fallback origin is invalid.");
  }
  return { name: hostname, type: "CNAME", value: normalizedOrigin };
}

export function isCloudflareReady({
  hostnameStatus,
  certificateStatus,
}: CloudflareHostnameSnapshot): boolean {
  return hostnameStatus === "active" && certificateStatus === "active";
}

export function getNextSetupState({
  setupState,
  snapshot,
  cutoverMatches,
}: {
  setupState: CustomHostnameSetupState;
  snapshot: CloudflareHostnameSnapshot;
  cutoverMatches: boolean;
}): CustomHostnameSetupState {
  if (setupState === "ownership_checking" && snapshot.hostnameStatus === "active") {
    return "dcv_pending";
  }
  if (setupState === "certificate_checking" && isCloudflareReady(snapshot)) {
    return "cutover_pending";
  }
  if (
    setupState === "connection_checking" &&
    cutoverMatches &&
    isCloudflareReady(snapshot)
  ) {
    return "connected";
  }
  return setupState;
}
