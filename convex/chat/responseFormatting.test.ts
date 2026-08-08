import { expect, test } from "vitest";
import {
  chatResponseFormattingBlock,
  normalizeCustomerFacingResponseFormatting,
} from "./responseFormatting";

test("response formatting keeps customer replies free of workflow internals", () => {
  expect(chatResponseFormattingBlock).toContain(
    "Do not include workflow metadata, media URLs, or internal action markers",
  );
  expect(chatResponseFormattingBlock).not.toContain("<customer_response>");
  expect(chatResponseFormattingBlock).not.toContain("<media_to_send>");
  expect(chatResponseFormattingBlock).not.toContain(
    "Start with the customer-facing answer.",
  );
});

test("requires customer replies to match the user's language", () => {
  expect(chatResponseFormattingBlock).toContain(
    "IMPORTANT: Match the language of the latest user message.",
  );
  expect(chatResponseFormattingBlock).toContain(
    "1. Detect the language of the latest user message.",
  );
  expect(chatResponseFormattingBlock).toContain(
    "2. Reply only in that language.",
  );
  expect(chatResponseFormattingBlock).toContain(
    "3. Never default to English unless the user wrote in English.",
  );
  expect(chatResponseFormattingBlock).toContain(
    "4. If the message mixes languages, use the dominant language of the latest user message.",
  );
  expect(chatResponseFormattingBlock).toContain(
    "Do not translate the user's input before answering.",
  );
  expect(chatResponseFormattingBlock).toContain(
    'User: "你好，请问你们今天营业吗？"',
  );
  expect(chatResponseFormattingBlock).toContain(
    'Assistant: "你好！我们今天营业。请问有什么可以帮助你？"',
  );
  expect(chatResponseFormattingBlock).toContain(
    'User: "Hello, are you open today?"',
  );
  expect(chatResponseFormattingBlock).toContain(
    'Assistant: "Hello! Yes, we are open today. How can I help you?"',
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

test("strips markdown headings, horizontal rules, and leftover table lines", () => {
  const input = [
    "### Business plan",
    "---",
    "It includes 10 AI agents.",
    "***",
    "|---|---|",
    "| Growth | RM299 |",
    "## Next step",
    "Want help signing up?",
  ].join("\n");

  expect(normalizeCustomerFacingResponseFormatting(input)).toBe(
    [
      "Business plan",
      "It includes 10 AI agents.",
      "- Growth: RM299",
      "Next step",
      "Want help signing up?",
    ].join("\n"),
  );
});

test("strips leftover inline citation markers from customer replies", () => {
  expect(
    normalizeCustomerFacingResponseFormatting(
      "Business is *RM 899/month* [1]. Yearly plans are about *20% off* [2].",
    ),
  ).toBe("Business is *RM 899/month*. Yearly plans are about *20% off*.");
});

test("prompt forbids headings, tables, and separators in customer replies", () => {
  expect(chatResponseFormattingBlock).toContain(
    "Do not use Markdown headings like #, ##, or ###.",
  );
  expect(chatResponseFormattingBlock).toContain(
    "Do not use horizontal separators like ---, ***, ___, or ====",
  );
  expect(chatResponseFormattingBlock).toContain(
    "Do not use Markdown tables, table borders, or pipe rows",
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
