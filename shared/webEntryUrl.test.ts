import { describe, expect, test } from "vitest";
import {
  excludeConvertedWebLinks,
  hasParentWebUrl,
  isSameWebUrl,
} from "./webEntryUrl";

describe("webEntryUrl", () => {
  test("treats trailing slashes as the same URL", () => {
    expect(isSameWebUrl("https://zia-realty.com/", "https://zia-realty.com")).toBe(true);
    expect(isSameWebUrl("https://zia-realty.com/team/", "https://zia-realty.com/team")).toBe(true);
    expect(isSameWebUrl("https://a.com", "https://b.com")).toBe(false);
  });

  test("detects duplicate parent web entries only", () => {
    const entries = [
      { url: "https://zia-realty.com/", parentId: undefined },
      { url: "https://zia-realty.com/team/", parentId: "child" },
    ];
    expect(hasParentWebUrl(entries, "https://zia-realty.com")).toBe(true);
    expect(hasParentWebUrl(entries, "https://zia-realty.com/team")).toBe(false);
    expect(hasParentWebUrl(entries, "https://other.com")).toBe(false);
  });

  test("removes links already converted to markdown from discovery", () => {
    expect(
      excludeConvertedWebLinks(
        [
          "https://example.com/about/",
          "https://example.com/pricing",
          "https://example.com/contact",
        ],
        [
          { url: "https://example.com/about", status: "completed" },
          { url: "https://example.com/pricing", status: "gettingMarkdown" },
        ],
      ),
    ).toEqual([
      "https://example.com/pricing",
      "https://example.com/contact",
    ]);
  });
});
