import { expect, test } from "vitest";
import { formatBroadcastMessageContent } from "./broadcastChatContent";

test("keeps only rendered broadcast template content", () => {
  expect(formatBroadcastMessageContent("  Hi Jessica, summer sale is live.  ")).toBe(
    "Hi Jessica, summer sale is live.",
  );
});

test("keeps missing rendered content empty", () => {
  expect(formatBroadcastMessageContent("   ")).toBe("");
});
