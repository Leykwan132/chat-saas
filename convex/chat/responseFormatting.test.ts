import { expect, test } from "vitest";
import {
  chatResponseFormattingBlock,
  normalizeCustomerFacingResponseFormatting,
  splitCustomerFacingResponseMessages,
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

test("asks the model for separately sendable messages", () => {
  expect(chatResponseFormattingBlock).toContain(
    "Write 2-4 short, separately sendable chat messages",
  );
  expect(chatResponseFormattingBlock).toContain(
    "Put a line containing only <<MESSAGE_BREAK>> between those messages.",
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

test("splits explicit model message breaks", () => {
  expect(
    splitCustomerFacingResponseMessages(
      "Thanks for reaching out!\n<<MESSAGE_BREAK>>\nWhich service do you need?",
    ),
  ).toEqual([
    "Thanks for reaching out!",
    "Which service do you need?",
  ]);
});

test("falls back to paragraph and sentence boundaries", () => {
  expect(
    splitCustomerFacingResponseMessages(
      "We have two options.\n\nThe first is faster.\n\nWhich do you prefer?",
    ),
  ).toEqual([
    "We have two options.",
    "The first is faster.",
    "Which do you prefer?",
  ]);
  expect(
    splitCustomerFacingResponseMessages(
      "We are open today. We close at 6 PM. Would you like to book?",
    ),
  ).toEqual([
    "We are open today.",
    "We close at 6 PM.",
    "Would you like to book?",
  ]);
});

test("keeps single sentences and compact lists together", () => {
  expect(splitCustomerFacingResponseMessages("Yes, we are open today.")).toEqual([
    "Yes, we are open today.",
  ]);
  expect(
    splitCustomerFacingResponseMessages("Available:\n- Morning\n- Afternoon"),
  ).toEqual(["Available:\n- Morning\n- Afternoon"]);
});
