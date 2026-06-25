import { expect, test } from "vitest";
import { isSkippedWhatsAppContact } from "./whatsappSkipContacts";

test("Meta official account matches common phone formats", () => {
  expect(isSkippedWhatsAppContact("447710173736")).toBe(true);
  expect(isSkippedWhatsAppContact("+447710173736")).toBe(true);
  expect(isSkippedWhatsAppContact("16505551234")).toBe(false);
});
