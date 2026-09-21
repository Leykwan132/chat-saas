import { expect, test } from "vitest";
import { playgroundAssistantTextParts } from "../../src/lib/playgroundMessageParts";

test("keeps a streamed playground reply in one displayed message", () => {
  expect(
    playgroundAssistantTextParts({
      parts: [
        {
          type: "text",
          text: "Here is the first paragraph.\n\nHere is the second paragraph.",
        },
      ],
    }),
  ).toEqual(["Here is the first paragraph.\n\nHere is the second paragraph."]);
});

test("combines streamed text parts into one displayed message", () => {
  expect(
    playgroundAssistantTextParts({
      parts: [
        { type: "text", text: "Here is the first paragraph." },
        { type: "text", text: "\n\nHere is the second paragraph." },
      ],
    }),
  ).toEqual(["Here is the first paragraph.\n\nHere is the second paragraph."]);
});
