import { describe, expect, test } from "vitest";
import { truncateMessagePreview } from "./messagePreview";

describe("truncateMessagePreview", () => {
  test("keeps an emoji intact at the preview boundary", () => {
    const content = `${"a".repeat(139)}🤠`;

    expect(truncateMessagePreview(content, 140)).toBe(content);
  });
});
