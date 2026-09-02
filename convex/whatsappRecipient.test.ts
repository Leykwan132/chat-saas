import { expect, test } from "vitest";

type WhatsAppRecipient = { recipient: string } | { to: string };

type RecipientBuilder = (customer: {
  contactAddress: string;
  phone?: string;
  whatsappUserId?: string;
}) => WhatsAppRecipient;

async function loadRecipientBuilder(): Promise<RecipientBuilder | undefined> {
  try {
    const module = await import("./whatsappRecipient");
    return module.buildWhatsAppRecipient;
  } catch {
    return undefined;
  }
}

test("uses recipient for a username-only WhatsApp customer", async () => {
  const buildWhatsAppRecipient = await loadRecipientBuilder();

  expect(buildWhatsAppRecipient).toBeTypeOf("function");
  if (!buildWhatsAppRecipient) return;

  const recipient = buildWhatsAppRecipient({
    contactAddress: "US.13491208655302741918",
    whatsappUserId: "US.13491208655302741918",
  });

  expect(recipient).toEqual({ recipient: "US.13491208655302741918" });
  expect(recipient).not.toHaveProperty("to");
});

test("normalizes a phone customer into to", async () => {
  const buildWhatsAppRecipient = await loadRecipientBuilder();

  expect(buildWhatsAppRecipient).toBeTypeOf("function");
  if (!buildWhatsAppRecipient) return;

  const recipient = buildWhatsAppRecipient({
    contactAddress: "+1 (650) 555-1111",
  });

  expect(recipient).toEqual({ to: "+1 (650) 555-1111" });
  expect(recipient).not.toHaveProperty("recipient");
});
