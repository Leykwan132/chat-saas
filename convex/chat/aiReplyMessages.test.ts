import { expect, test } from "vitest";
import {
  AI_REPLY_MESSAGE_BREAK,
  SOFT_AI_REPLY_MESSAGE_CHARS,
  aiReplyMessageBreakBlock,
  normalizeAiReplyMessages,
  splitAiReplyMessages,
  splitStreamingAiReplyMessages,
} from "./aiReplyMessages";

test("instructs the model to use natural message breaks without a hard character cap", () => {
  expect(aiReplyMessageBreakBlock).toContain(AI_REPLY_MESSAGE_BREAK);
  expect(aiReplyMessageBreakBlock).toContain("natural chat messages");
  expect(aiReplyMessageBreakBlock).not.toContain("characters");
  expect(aiReplyMessageBreakBlock).toContain("Do not cut mid-sentence or mid-list item");
});

test("splits a delimited reply and normalizes each message", () => {
  expect(
    splitAiReplyMessages(
      `Yes, we have a **Business** plan!\n${AI_REPLY_MESSAGE_BREAK}\n It costs RM899/month. \n<<< MESSAGE_BREAK >>>\n\nWant help signing up?`,
    ),
  ).toEqual([
    "Yes, we have a *Business* plan!",
    "It costs RM899/month.",
    "Want help signing up?",
  ]);
});

test("keeps an undelimited short reply as one message", () => {
  expect(splitAiReplyMessages("Just one short answer.")).toEqual([
    "Just one short answer.",
  ]);
  expect(splitAiReplyMessages("   ")).toEqual([]);
});

test("splits long undelimited replies on paragraph boundaries and keeps lists together", () => {
  const reply = [
    "Alright! Let me break down the available plans for you.",
    "",
    "*KiloBot* offers five plans: *Free, Starter, Growth, Business,* and *Enterprise*.",
    "",
    "Here's the quick overview:",
    "",
    "- *Free* | *RM 0 forever*",
    "- *Starter* | *RM 149/month*",
    "- *Growth* | *RM 399/month*",
    "- *Business* | *RM 899/month*",
    "- *Enterprise* | *Custom pricing*",
    "",
    "Would you like me to dive deeper into any specific plan?",
  ].join("\n");

  const parts = splitAiReplyMessages(reply);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.length).toBeLessThanOrEqual(4);
  expect(parts.some((part) => part.includes("- *Free*"))).toBe(true);
  expect(
    parts.find((part) => part.includes("- *Free*")),
  ).toContain("Here's the quick overview:");
  expect(parts.at(-1)).toContain("Would you like me to dive deeper");
});

test("soft-splits a dense paragraph on sentence groups without mid-sentence cuts", () => {
  const dense = [
    "KiloBot has several plans for different team sizes and budgets across growing support organizations.",
    "The Free plan is useful for trying the product with light usage before you commit to a paid workspace.",
    "Starter and Growth add more agents, credits, and team seats for active support teams handling daily chats.",
    "Business is aimed at larger workspaces that need advanced models, higher limits, and broader channel coverage.",
    "Enterprise pricing is custom when you need tailored limits, procurement support, or a dedicated rollout plan.",
  ].join(" ");

  expect(dense.length).toBeGreaterThan(SOFT_AI_REPLY_MESSAGE_CHARS);
  const parts = splitAiReplyMessages(dense);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.join(" ")).toBe(dense);
  for (const sentence of dense.match(/[^.!?]+[.!?]+/g) ?? []) {
    expect(parts.some((part) => part.includes(sentence.trim()))).toBe(true);
  }
});

test("merges overflow parts into the last message instead of dropping them", () => {
  expect(
    normalizeAiReplyMessages(["One", " ", "Two", "Three", "Four", "Five"]),
  ).toEqual(["One", "Two", "Three", "Four\n\nFive"]);
});

test("hides a partially streamed break token from the playground", () => {
  expect(
    splitStreamingAiReplyMessages("First message\n<<<MESSAGE_BRE"),
  ).toEqual(["First message"]);
  expect(
    splitStreamingAiReplyMessages(
      `First message\n${AI_REPLY_MESSAGE_BREAK}\nSecond mes`,
    ),
  ).toEqual(["First message", "Second mes"]);
});

test("keeps the Citations section intact on the last message", () => {
  const reply = [
    "Alright! Here are the plans.",
    "",
    "Starter is RM149/month and Growth is RM399/month.",
    "",
    "Want a deeper comparison?",
    "",
    "Citations",
    "",
    '{title: "Pricing Plan for Kilobot", url: "https://storage.kilobot.app/Pricing%20Plan%20for%20Kilobot_598c22d5.txt", description: "Contains the KiloBot pricing plans."}',
  ].join("\n");

  const parts = splitAiReplyMessages(reply);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.slice(0, -1).every((part) => !part.includes("Citations"))).toBe(
    true,
  );
  expect(parts.at(-1)).toContain("Citations");
  expect(parts.at(-1)).toContain(
    "https://storage.kilobot.app/Pricing%20Plan%20for%20Kilobot_598c22d5.txt",
  );
});
