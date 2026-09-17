import { describe, expect, test } from "vitest";
import {
  createWhatsAppMetaSignupClient,
  selectFirstMetaAppCredentials,
  selectSingleWhatsAppBusinessAccountId,
  selectSingleWhatsAppPhoneNumber,
} from "./whatsappMetaSignup";

test("selects the first matching server Meta application credential", () => {
  expect(
    selectFirstMetaAppCredentials({
      appIds: "app-1|app-2",
      appSecrets: "secret-1|secret-2",
    }),
  ).toEqual({ appId: "app-1", appSecret: "secret-1" });
});

test("rejects mismatched server Meta application credentials", () => {
  expect(() =>
    selectFirstMetaAppCredentials({
      appIds: "app-1|app-2",
      appSecrets: "secret-1",
    }),
  ).toThrow("META_APP_ID and META_APP_SECRET must have matching pipe-separated values.");
});

describe("WhatsApp Meta asset selection", () => {
  test("selects the only WABA authorized for WhatsApp management", () => {
    expect(
      selectSingleWhatsAppBusinessAccountId({
        data: {
          granular_scopes: [
            {
              scope: "whatsapp_business_management",
              target_ids: ["waba-123"],
            },
            {
              scope: "business_management",
              target_ids: ["business-ignored"],
            },
          ],
        },
      }),
    ).toBe("waba-123");
  });

  test.each([
    {
      name: "missing WABA targets",
      response: { data: { granular_scopes: [] } },
      count: 0,
    },
    {
      name: "multiple WABA targets",
      response: {
        data: {
          granular_scopes: [
            {
              scope: "whatsapp_business_management",
              target_ids: ["waba-1", "waba-2"],
            },
          ],
        },
      },
      count: 2,
    },
  ])("rejects $name", ({ response, count }) => {
    expect(() => selectSingleWhatsAppBusinessAccountId(response)).toThrow(
      `Expected Meta to authorize exactly one WhatsApp Business Account, received ${count}.`,
    );
  });

  test("deduplicates the same WABA across granular scopes", () => {
    expect(
      selectSingleWhatsAppBusinessAccountId({
        data: {
          granular_scopes: [
            {
              scope: "whatsapp_business_management",
              target_ids: ["waba-123", "waba-123"],
            },
          ],
        },
      }),
    ).toBe("waba-123");
  });

  test("selects the only phone number returned by the WABA", () => {
    expect(
      selectSingleWhatsAppPhoneNumber({
        data: [
          {
            id: "phone-123",
            display_phone_number: "+1 555 078 3881",
            verified_name: "Wati",
          },
        ],
      }),
    ).toEqual({
      id: "phone-123",
      display_phone_number: "+1 555 078 3881",
      verified_name: "Wati",
    });
  });

  test.each([
    { name: "no phone numbers", data: [], count: 0 },
    {
      name: "multiple phone numbers",
      data: [{ id: "phone-1" }, { id: "phone-2" }],
      count: 2,
    },
  ])("rejects $name", ({ data, count }) => {
    expect(() => selectSingleWhatsAppPhoneNumber({ data })).toThrow(
      `Expected Meta to return exactly one WhatsApp phone number, received ${count}.`,
    );
  });
});

test("Meta signup client exchanges the code and discovers one backend-owned asset", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    { access_token: "business-token", token_type: "bearer", expires_in: 3600 },
    {
      data: {
        granular_scopes: [
          {
            scope: "whatsapp_business_management",
            target_ids: ["waba-123"],
          },
        ],
      },
    },
    {
      data: [
        {
          id: "phone-123",
          display_phone_number: "+1 555 078 3881",
          verified_name: "Wati",
        },
      ],
    },
    { success: true },
  ];
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify(responses[requests.length - 1]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = createWhatsAppMetaSignupClient({
    appId: "app-123",
    appSecret: "app-secret",
    graphVersion: "v22.0",
    fetcher,
  });

  const token = await client.exchangeAuthorizationCode("oauth-code");
  const assets = await client.discoverAssets(token.access_token);
  await client.subscribeWaba(assets.wabaId, token.access_token);

  expect(token).toEqual({
    access_token: "business-token",
    token_type: "bearer",
    expires_in: 3600,
  });
  expect(assets).toEqual({
    wabaId: "waba-123",
    phoneNumber: {
      id: "phone-123",
      display_phone_number: "+1 555 078 3881",
      verified_name: "Wati",
    },
  });
  expect(requests).toHaveLength(4);
  expect(requests[1].url).toContain("/v22.0/debug_token");
  expect(requests[1].init?.headers).toEqual({
    Authorization: "Bearer app-123|app-secret",
  });
  expect(requests[2].url).toContain(
    "/v22.0/waba-123/phone_numbers?fields=id%2Cdisplay_phone_number%2Cverified_name",
  );
  expect(requests[2].init?.headers).toEqual({
    Authorization: "Bearer business-token",
  });
  expect(requests[3]).toMatchObject({
    url: "https://graph.facebook.com/v22.0/waba-123/subscribed_apps",
    init: {
      method: "POST",
      headers: { Authorization: "Bearer business-token" },
    },
  });
});
