import { expect, test } from "vitest";
import { customerPhonePresentation } from "../shared/customerPhonePresentation";

test("does not present a WhatsApp username or user ID as a phone number", () => {
  expect(
    customerPhonePresentation({
      contactAddress: "MY.1681538786237414",
      whatsappUserId: "MY.1681538786237414",
      whatsappUsername: "aliahammadpk",
    }),
  ).toBeNull();
});

test("presents an explicitly stored customer phone number", () => {
  expect(
    customerPhonePresentation({
      contactAddress: "MY.1681538786237414",
      phone: "+60 12-345 6789",
      whatsappUserId: "MY.1681538786237414",
      whatsappUsername: "aliahammadpk",
    }),
  ).toBe("+60 12-345 6789");
});

test("presents a legacy numeric WhatsApp contact address", () => {
  expect(
    customerPhonePresentation({
      contactAddress: "60123456789",
    }),
  ).toBe("60123456789");
});
