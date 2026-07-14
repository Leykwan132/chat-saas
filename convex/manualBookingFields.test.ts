import { expect, test } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { manualBookingFieldsForCustomer } from "./appointmentBooking/manualBookingFields";

function customer(overrides: Partial<Doc<"customers">> = {}) {
  return {
    name: "Stored Name",
    phone: "+60123456789",
    email: "stored@example.com",
    contactAddress: "contact-address",
    ...overrides,
  } as Doc<"customers">;
}

test("manual booking fields use stored customer identity and schedule only", () => {
  expect(manualBookingFieldsForCustomer(customer(), {
    date: "2026-07-14",
    time: "11:20pm",
    name: "Forged Name",
    phone: "wrong-phone",
    requirements: "browser-only questionnaire answer",
  })).toEqual({
    date: "2026-07-14",
    time: "11:20pm",
    name: "Stored Name",
    phone: "+60123456789",
    email: "stored@example.com",
  });
});

test("manual booking display name uses the best stored customer identifier", () => {
  expect(manualBookingFieldsForCustomer(customer({ name: undefined }), {})).toEqual({
    date: "",
    time: "",
    name: "stored@example.com",
    phone: "+60123456789",
    email: "stored@example.com",
  });
});
