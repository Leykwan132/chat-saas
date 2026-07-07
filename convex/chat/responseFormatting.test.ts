import { expect, test } from "vitest";
import {
  chatResponseFormattingBlock,
  normalizeCustomerFacingResponseFormatting,
} from "./responseFormatting";

test("response formatting does not override the required output envelope", () => {
  expect(chatResponseFormattingBlock).toContain(
    "If another instruction requires `<customer_response>` or `<media_to_send>`",
  );
  expect(chatResponseFormattingBlock).toContain(
    "apply these formatting rules inside `<customer_response>`",
  );
  expect(chatResponseFormattingBlock).not.toContain(
    "Start with the customer-facing answer.",
  );
});

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

test("removes internal context lookup narration", () => {
  const input = [
    "Let me check the knowledge base for the Sena Residence location details.",
    "",
    "Sena Residence is located in Shah Alam.",
  ].join("\n");

  expect(normalizeCustomerFacingResponseFormatting(input)).toBe(
    "Sena Residence is located in Shah Alam.",
  );
});

test("removes leaked internal planning when no customer answer remains", () => {
  const input = [
    "Let me check the knowledge base for the Sena Residence location details.",
    "",
    "Wait, let me first check what the user's query is about. They're asking about the location of Sena Residence. Let me fetch context.",
  ].join("\n");

  expect(normalizeCustomerFacingResponseFormatting(input)).toBe("");
});
