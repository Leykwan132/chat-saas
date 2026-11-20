import { expect, test } from "vitest";
import { matchesInboxLastReply } from "./inboxLastReplyFilter";

test("matches the last outgoing author rather than the current AI handling", () => {
  expect(matchesInboxLastReply({ lastReplyAuthor: { kind: "ai" } }, true)).toBe(
    true,
  );
  expect(
    matchesInboxLastReply({ lastReplyAuthor: { kind: "human" } }, true),
  ).toBe(false);
  expect(
    matchesInboxLastReply({ lastReplyAuthor: { kind: "automation" } }, true),
  ).toBe(false);
  expect(matchesInboxLastReply({ lastReplyAuthor: null }, true)).toBe(false);
  expect(matchesInboxLastReply({}, true)).toBe(false);
  expect(matchesInboxLastReply({}, false)).toBe(true);
});
