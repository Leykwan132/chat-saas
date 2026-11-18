import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { InboxHandlingBadge } from "./InboxHandlingBadge";
import { matchesInboxHandling } from "../../../shared/inboxHandling";

test("shows a badge for AI handling and chats needing attention", () => {
  expect(renderToStaticMarkup(<InboxHandlingBadge handling="ai" />)).toContain(
    "AI handling",
  );
  expect(renderToStaticMarkup(<InboxHandlingBadge handling="human" />)).toBe(
    "",
  );
  expect(
    renderToStaticMarkup(<InboxHandlingBadge handling="attention" />),
  ).toContain("Needs attention");
});
test("human handling includes escalations while AI handling stays exclusive", () => {
  expect(matchesInboxHandling("ai", "ai")).toBe(true);
  expect(matchesInboxHandling("human", "ai")).toBe(false);
  expect(matchesInboxHandling("attention", "human")).toBe(true);
  expect(matchesInboxHandling("ai", "human")).toBe(false);
  expect(matchesInboxHandling(undefined, "ai")).toBe(false);
});
