import { expect, test, vi } from "vitest";
import type { ActionCtx } from "./_generated/server";
import { receive } from "./messengerWebhook";

test("forwards an echoed Messenger app reply with its Page and customer IDs", async () => {
  const runMutation = vi.fn().mockResolvedValue(undefined);
  const response = await receive({ runMutation } as unknown as ActionCtx, JSON.stringify({
    object: "page",
    entry: [{
      messaging: [{
        sender: { id: "page-1" },
        recipient: { id: "customer-1" },
        timestamp: 1_788_936_018_000,
        message: { mid: "echo-1", text: "I'll take over.", is_echo: true },
      }],
    }],
  }));

  expect(response.status).toBe(200);
  const args = runMutation.mock.calls.find(
    ([, mutationArgs]) => mutationArgs?.externalId === "echo-1",
  )?.[1];
  expect(args).toMatchObject({
    pageId: "page-1",
    senderPsid: "page-1",
    recipientPsid: "customer-1",
    isEcho: true,
  });
});
