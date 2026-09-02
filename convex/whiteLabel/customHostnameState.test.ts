import { describe, expect, test } from "vitest";
import {
  getDelegatedDcvRecord,
  isCloudflareReady,
  normalizeCustomHostname,
} from "./customHostnameState";

describe("custom hostname state", () => {
  test("accepts a subdomain and rejects unsupported hostnames", () => {
    expect(normalizeCustomHostname("App.Partner.com")).toBe("app.partner.com");
    expect(() => normalizeCustomHostname("partner.com")).toThrow("subdomain");
    expect(() => normalizeCustomHostname("https://app.partner.com")).toThrow(
      "hostname",
    );
    expect(() => normalizeCustomHostname("kilobot.app")).toThrow("subdomain");
    expect(() => normalizeCustomHostname("app.kilobot.app")).toThrow(
      "kilobot.app",
    );
  });

  test("builds a hostname-specific delegated DCV CNAME", () => {
    expect(
      getDelegatedDcvRecord(
        "app.partner.com",
        "a6627bf9414e7423.dcv.cloudflare.com",
      ),
    ).toEqual({
      name: "_acme-challenge.app.partner.com",
      type: "CNAME",
      value: "app.partner.com.a6627bf9414e7423.dcv.cloudflare.com",
    });
  });

  test("requires an active hostname and certificate before cutover", () => {
    expect(
      isCloudflareReady({
        hostnameStatus: "active",
        certificateStatus: "pending",
      }),
    ).toBe(false);
    expect(
      isCloudflareReady({
        hostnameStatus: "active",
        certificateStatus: "active",
      }),
    ).toBe(true);
  });
});
