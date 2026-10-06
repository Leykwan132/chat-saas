import { expect, test, vi } from "vitest";
import { receive } from "./whatsappWebhook";

test.each(["ad", "post"])("forwards %s referrals for persistent window tracking", async (sourceType) => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const response = await receive({ runMutation } as unknown as Parameters<typeof receive>[0], JSON.stringify({
    entry: [{ changes: [{ field: "messages", value: {
      metadata: { phone_number_id: "phone-123" },
      messages: [{ id: "referral-123", from: "60123456789", timestamp: "1700000000",
        type: "text", text: { body: "Hello" },
        referral: { source_type: sourceType, source_id: "source-123", source_url: "https://fb.me/example", headline: "An offer", body: "Offer details", image_url: "https://example.com/ad.jpg" },
      }],
    } }] }],
  }));

  expect(response.status).toBe(200);
  expect(runMutation.mock.calls.find(([, args]) => args.externalId === "referral-123")?.[1]).toMatchObject({
    referral: { sourceType, sourceId: "source-123", sourceUrl: "https://fb.me/example", headline: "An offer", body: "Offer details", imageUrl: "https://example.com/ad.jpg" },
  });
});
