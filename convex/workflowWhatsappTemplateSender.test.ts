import { afterEach, expect, test, vi } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { sendWorkflowWhatsappTemplate } from "./workflowWhatsappTemplateSender";

function parseBody(init: RequestInit | undefined) {
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("sends a workflow template to a username recipient", async () => {
  const requests: Array<Record<string, unknown>> = [];
  vi.stubEnv("SKIP_MESSAGE_TEMPLATE_SEND", "false");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      requests.push(parseBody(init));
      return new Response(JSON.stringify({ messages: [{ id: "wamid.outbound" }] }), {
        status: 200,
      });
    }),
  );
  const ctx = {
    runQuery: vi.fn().mockResolvedValue({
      template: { components: [{ type: "BODY", text: "Hello" }] },
      mediaAsset: null,
      parameterValues: {},
    }),
  } as unknown as Parameters<typeof sendWorkflowWhatsappTemplate>[0];

  const result = await sendWorkflowWhatsappTemplate(ctx, {
    orgId: "org-123",
    channel: {
      _id: "channels:123",
      accessToken: "test-token",
      phoneNumberId: "123456123",
    } as Doc<"channels">,
    customer: {
      _id: "customers:123",
      contactAddress: "US.13491208655302741918",
      whatsappUserId: "US.13491208655302741918",
    } as Doc<"customers">,
    template: { name: "welcome", language: "en_US" },
  });

  expect(result.providerMessageId).toBe("wamid.outbound");
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    messaging_product: "whatsapp",
    recipient: "US.13491208655302741918",
    type: "template",
  });
  expect(requests[0]).not.toHaveProperty("to");
});
