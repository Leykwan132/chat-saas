import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { WebEntryDetails } from "./WebEntryDetails";

test("shows expanded scraped markdown below web entry metadata", () => {
  const markup = renderToStaticMarkup(
    createElement(WebEntryDetails, {
      url: "https://example.com/pricing",
      fileSizeLabel: "2.0 KB",
      markdown: "# Pricing\n\nPlans for every team.",
    }),
  );

  expect(markup.indexOf("2.0 KB")).toBeLessThan(markup.indexOf("Scraped Markdown"));
  expect(markup).toContain("Open full screen");
  expect(markup).toContain("max-h-[60vh]");
  expect(markup).toContain("# Pricing");
});

test("shows a Markdown skeleton while the content is loading", () => {
  const markup = renderToStaticMarkup(
    createElement(WebEntryDetails, {
      url: "https://example.com/pricing",
      fileSizeLabel: "2.0 KB",
      isMarkdownLoading: true,
    }),
  );

  expect(markup).toContain('data-slot="skeleton"');
  expect(markup).toContain("Open full screen");
});
