import { afterEach, describe, expect, it, vi } from "vitest";
import { listInstagramAccounts } from "./instagramEmbeddedSignup";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Instagram Embedded Signup", () => {
  it("returns only authorized Pages linked to Instagram professional accounts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        {
          id: "page-1",
          name: "Store",
          access_token: "page-token",
          instagram_business_account: {
            id: "ig-1",
            username: "store",
          },
        },
        {
          id: "page-2",
          name: "No Instagram",
          access_token: "other-token",
        },
      ],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const accounts = await listInstagramAccounts("user-token");

    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.instagram_business_account.id).toBe("ig-1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/me/accounts");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "instagram_business_account",
    );
  });
});
