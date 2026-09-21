import { expect, test } from "vitest";
import {
  normalizeAiReplyMessages,
  splitAiReplyMessages,
  splitStreamingAiReplyMessages,
} from "./aiReplyMessages";

test("preserves a generated reply as one normalized chat message", () => {
  const reply = [
    "Here are the available plans.",
    "",
    "- Starter for smaller teams",
    "- Growth for growing support teams",
    "",
    "Which one would you like to explore?",
  ].join("\n");

  expect(splitAiReplyMessages(reply)).toEqual([
    "Here are the available plans.\n\n- Starter for smaller teams\n- Growth for growing support teams\n\nWhich one would you like to explore?",
  ]);
});

test("keeps streamed content together while it is arriving", () => {
  expect(
    splitStreamingAiReplyMessages(
      "The first detail.\n\nThe second detail is still streaming.",
    ),
  ).toEqual(["The first detail.\n\nThe second detail is still streaming."]);
});

test("normalizes manually supplied content without splitting it into messages", () => {
  expect(
    normalizeAiReplyMessages([
      "One update.",
      "\n\nAnother update.",
    ]),
  ).toEqual(["One update.\n\nAnother update."]);
});
