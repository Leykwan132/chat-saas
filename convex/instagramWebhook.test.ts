import { afterEach, expect, test, vi } from "vitest";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { receive } from "./instagramWebhook";

afterEach(() => {
  vi.restoreAllMocks();
});

test("logs the complete Instagram webhook payload before filtering events", async () => {
  const rawBody = JSON.stringify({
    object: "instagram",
    entry: [{
      id: "17841415503021124",
      changes: [{ field: "comments", value: {} }],
    }],
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

  const response = await receive({} as ActionCtx, rawBody);

  expect(response.status).toBe(200);
  expect(log).toHaveBeenCalledWith(
    "[instagram-webhook] receive:raw-meta",
    rawBody,
  );
});

test("forwards an Instagram comment event to Comment-to-Inbox", async () => {
  const runAction = vi.fn().mockResolvedValue(undefined);
  const rawBody = JSON.stringify({
    object: "instagram",
    entry: [{
      id: "17841415503021124",
      time: 1_788_936_018,
      changes: [{
        field: "comments",
        value: {
          from: { id: "1099246446014774", username: "leykwann" },
          media: { id: "17905468116308865", media_product_type: "FEED" },
          id: "18096630032677697",
          text: "dm",
        },
      }],
    }],
  });

  const response = await receive({ runAction } as unknown as ActionCtx, rawBody);

  expect(response.status).toBe(200);
  expect(runAction).toHaveBeenCalledWith(
    internal.instagramCommentAutomation.processInstagramComment,
    {
      igUserId: "17841415503021124",
      externalCommentId: "18096630032677697",
      authorAddress: "1099246446014774",
      authorName: "leykwann",
      text: "dm",
      timestampMs: 1_788_936_018_000,
    },
  );
});
