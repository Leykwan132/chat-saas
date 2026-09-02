import { expect, test } from "vitest";

type BroadcastPayloadBuilder = (
  customer: {
    contactAddress: string;
    phone?: string;
    whatsappUserId?: string;
  },
  template: unknown,
) => Record<string, unknown>;

async function loadBroadcastPayloadBuilder(): Promise<
  BroadcastPayloadBuilder | undefined
> {
  const module = await import("./broadcastPool");
  return module.buildBroadcastTemplatePayload as
    | BroadcastPayloadBuilder
    | undefined;
}

test("builds broadcast template payloads with recipient for username customers", async () => {
  const buildBroadcastTemplatePayload = await loadBroadcastPayloadBuilder();

  expect(buildBroadcastTemplatePayload).toBeTypeOf("function");
  if (!buildBroadcastTemplatePayload) return;

  const payload = buildBroadcastTemplatePayload(
    {
      contactAddress: "US.13491208655302741918",
      whatsappUserId: "US.13491208655302741918",
    },
    { name: "welcome", language: { code: "en_US" } },
  );

  expect(payload).toMatchObject({
    messaging_product: "whatsapp",
    recipient: "US.13491208655302741918",
    type: "template",
  });
  expect(payload).not.toHaveProperty("to");
});
