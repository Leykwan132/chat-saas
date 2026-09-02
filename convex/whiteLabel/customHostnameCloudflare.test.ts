import { describe, expect, test } from "vitest";
import {
  getCustomHostnameCreateParams,
  getHostnameSnapshot,
  getOwnershipRecord,
  isExpectedPreCutoverError,
  matchesFallbackOrigin,
} from "./customHostnameCloudflare";

describe("custom hostname Cloudflare boundary", () => {
  test("creates a DV TXT hostname request", () => {
    expect(
      getCustomHostnameCreateParams({
        hostname: "app.partner.com",
        zoneId: "zone-id",
      }),
    ).toEqual({
      zone_id: "zone-id",
      hostname: "app.partner.com",
      ssl: { method: "txt", type: "dv" },
    });
  });

  test("extracts safe hostname and certificate statuses", () => {
    expect(
      getHostnameSnapshot({
        status: "active",
        ssl: { status: "active" },
        verification_errors: ["custom hostname does not CNAME to this zone."],
      }),
    ).toEqual({
      hostnameStatus: "active",
      certificateStatus: "active",
      validationError: "custom hostname does not CNAME to this zone.",
    });
  });

  test("keeps only complete TXT ownership records", () => {
    expect(
      getOwnershipRecord({
        type: "txt",
        name: "_cf-custom-hostname.app.partner.com",
        value: "ownership-token",
      }),
    ).toEqual({
      type: "TXT",
      name: "_cf-custom-hostname.app.partner.com",
      value: "ownership-token",
    });
    expect(getOwnershipRecord({ type: "http" })).toBeNull();
  });

  test("recognizes expected pending errors and normalized CNAME targets", () => {
    expect(
      isExpectedPreCutoverError("custom hostname does not CNAME to this zone."),
    ).toBe(true);
    expect(matchesFallbackOrigin(["kilobot.app."], "kilobot.app")).toBe(true);
    expect(matchesFallbackOrigin(["other.example"], "kilobot.app")).toBe(false);
  });
});
