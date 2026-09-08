import { expect, test, vi } from "vitest";
import { subscribeInstagramLoginWebhooks } from "./instagramConnect";

test("subscribes Instagram Login accounts to comment and messaging webhooks", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ success: true }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await subscribeInstagramLoginWebhooks("ig-user-1", "ig-token");

  const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
  expect(url.origin).toBe("https://graph.instagram.com");
  expect(url.pathname).toBe("/v25.0/ig-user-1/subscribed_apps");
  expect(url.searchParams.get("subscribed_fields")).toBe(
    "comments,live_comments,messages,message_echoes,message_reactions,messaging_handover,messaging_optins,messaging_postbacks,messaging_referral",
  );
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: "POST",
    headers: { Authorization: "Bearer ig-token" },
  });
});
