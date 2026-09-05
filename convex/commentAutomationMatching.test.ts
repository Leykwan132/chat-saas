import { describe, expect, it } from "vitest";
import { matchesCommentAutomation } from "./commentAutomationMatching";

describe("matchesCommentAutomation", () => {
  it("matches every comment for an any-comment automation", () => {
    expect(
      matchesCommentAutomation({
        trigger: "any_comment",
        keywords: [],
        commentText: "Hello there",
      }),
    ).toBe(true);
  });

  it("matches a keyword phrase without case sensitivity", () => {
    expect(
      matchesCommentAutomation({
        trigger: "keywords",
        keywords: ["pricing", "book a demo"],
        commentText: "Can I BOOK A DEMO?",
      }),
    ).toBe(true);
  });

  it("does not match keywords that are absent", () => {
    expect(
      matchesCommentAutomation({
        trigger: "keywords",
        keywords: ["pricing"],
        commentText: "Can I speak to support?",
      }),
    ).toBe(false);
  });
});
