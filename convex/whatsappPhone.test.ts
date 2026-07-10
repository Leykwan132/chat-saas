import { expect, test } from "vitest";
import { ensureWhatsAppRecipientPhone } from "./whatsappPhone";

test("ensureWhatsAppRecipientPhone preserves numbers that already have a plus", () => {
  expect(ensureWhatsAppRecipientPhone(" +16505551234 ")).toBe("+16505551234");
});

test("ensureWhatsAppRecipientPhone adds a plus when missing", () => {
  expect(ensureWhatsAppRecipientPhone("16505551234")).toBe("+16505551234");
});

test("ensureWhatsAppRecipientPhone keeps empty numbers empty", () => {
  expect(ensureWhatsAppRecipientPhone("   ")).toBe("");
});
