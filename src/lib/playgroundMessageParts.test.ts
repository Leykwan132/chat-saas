import { describe, expect, it } from "vitest";
import { playgroundAssistantTextParts } from "./playgroundMessageParts";

describe("playgroundAssistantTextParts", () => {
  it("keeps merged assistant text parts separate", () => {
    expect(
      playgroundAssistantTextParts({
        text: "First Second Third",
        parts: [
          { type: "text", text: "First" },
          { type: "text", text: "Second" },
          { type: "text", text: "Third" },
        ],
      }),
    ).toEqual(["First", "Second", "Third"]);
  });

  it("falls back to the combined message text", () => {
    expect(
      playgroundAssistantTextParts({
        text: "Only response",
        parts: [{ type: "source-url" }],
      }),
    ).toEqual(["Only response"]);
  });
});
