import { expect, test } from "vitest";
import { normalizeCustomerFacingResponseFormatting } from "./responseFormatting";

test("normalizes markdown bold to WhatsApp bold", () => {
  const input = [
    "Yes, absolutely! Let me get started on booking a **Sena Residence Showroom Viewing** for you!",
    "First, could you please share your **name**, **preferred date & time**, and **contact number**?",
  ].join("\n\n");

  expect(normalizeCustomerFacingResponseFormatting(input)).toBe(
    [
      "Yes, absolutely! Let me get started on booking a *Sena Residence Showroom Viewing* for you!",
      "First, could you please share your *name*, *preferred date & time*, and *contact number*?",
    ].join("\n\n"),
  );
});

test("keeps existing WhatsApp bold unchanged", () => {
  expect(normalizeCustomerFacingResponseFormatting("Please share your *name*.")).toBe(
    "Please share your *name*.",
  );
});

test("normalizes underscore and triple-asterisk emphasis", () => {
  expect(normalizeCustomerFacingResponseFormatting("Book __today__ for ***Sena***.")).toBe(
    "Book *today* for *Sena*.",
  );
});

test("normalizes markdown tables to WhatsApp-friendly bullets", () => {
  const input = [
    "Here are the property projects available through *Zia Realty*!",
    "",
    "| Property | Location | Developer |",
    "|---|---|---|",
    "| *Edusentral Harvard Suites* | Setia Alam | HCK |",
    "| *Erat Residence* | Alam Impian | Suntrack Development |",
    "",
    "Any of these catch your interest?",
  ].join("\n");

  expect(normalizeCustomerFacingResponseFormatting(input)).toBe(
    [
      "Here are the property projects available through *Zia Realty*!",
      "",
      "- *Edusentral Harvard Suites*: Location: Setia Alam; Developer: HCK",
      "- *Erat Residence*: Location: Alam Impian; Developer: Suntrack Development",
      "",
      "Any of these catch your interest?",
    ].join("\n"),
  );
});
