import { afterEach, expect, test, vi } from "vitest";
import type { ActionCtx } from "./_generated/server";
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
