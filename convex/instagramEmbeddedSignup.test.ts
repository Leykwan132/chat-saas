import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listInstagramAccounts,
  shouldEnableInstagramCommentWebhooks,
  subscribeInstagramPage,
} from "./instagramEmbeddedSignup";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Instagram Embedded Signup", () => {
  it("enforces the Comment-to-Inbox allowlist on the backend", () => {
    expect(shouldEnableInstagramCommentWebhooks(
      true,
      "leykwan132@gmail.com",
    )).toBe(true);
    expect(shouldEnableInstagramCommentWebhooks(
      true,
      "other@example.com",
    )).toBe(false);
    expect(shouldEnableInstagramCommentWebhooks(
      false,
      "leykwan132@gmail.com",
    )).toBe(false);
  });

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

  it("keeps ordinary Instagram connections messaging-only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await subscribeInstagramPage({
      id: "page-1",
      access_token: "page-token",
    }, false);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/page-1/subscribed_apps",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "subscribed_fields=messages",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("feed");
  });

  it("adds feed only for approved Comment-to-Inbox connections", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await subscribeInstagramPage({
      id: "page-1",
      access_token: "page-token",
    }, true);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "subscribed_fields=messages%2Cfeed",
    );
  });
});
