import { expect, test } from "vitest";

type RecipientLabel = (customer: {
  contactAddress: string;
  phone?: string;
  whatsappUsername?: string;
}) => string;

async function loadCustomerRecipientLabel(): Promise<RecipientLabel | undefined> {
  try {
    const module = await import("./customerRecipientPresentation");
    return module.customerRecipientLabel;
  } catch {
    return undefined;
  }
}

test("prefers an opted-in WhatsApp username as the customer recipient label", async () => {
  const customerRecipientLabel = await loadCustomerRecipientLabel();

  expect(customerRecipientLabel).toBeTypeOf("function");
  if (!customerRecipientLabel) return;

  expect(
    customerRecipientLabel({
      contactAddress: "US.13491208655302741918",
      whatsappUsername: "@testusername",
    }),
  ).toBe("@testusername");
});

test("uses the phone presentation when a WhatsApp username is unavailable", async () => {
  const customerRecipientLabel = await loadCustomerRecipientLabel();

  expect(customerRecipientLabel).toBeTypeOf("function");
  if (!customerRecipientLabel) return;

  expect(
    customerRecipientLabel({
      contactAddress: "60123456789",
      phone: "+60123456789",
    }),
  ).toBe("+60123456789");
});
