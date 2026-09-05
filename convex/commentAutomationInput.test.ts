import { describe, expect, it } from "vitest";
import { normalizeCommentAutomationInput } from "./commentAutomationInput";

describe("normalizeCommentAutomationInput", () => {
  it("normalizes keyword automations and removes empty duplicate keywords", () => {
    expect(
      normalizeCommentAutomationInput({
        name: "  Demo replies ",
        trigger: "keywords",
        keywords: [" pricing ", "", "PRICING", "demo"],
        privateMessage: "  Hello ",
        publicReply: " Thanks ",
      }),
    ).toEqual({
      name: "Demo replies",
      trigger: "keywords",
      keywords: ["pricing", "demo"],
      privateMessage: "Hello",
      publicReply: "Thanks",
    });
  });

  it("rejects a keyword automation without keywords", () => {
    expect(() => normalizeCommentAutomationInput({
      name: "Replies",
      trigger: "keywords",
      keywords: [" "],
      privateMessage: "Hello",
    })).toThrow("Add at least one keyword");
  });
});
