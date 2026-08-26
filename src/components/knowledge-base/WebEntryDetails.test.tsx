import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { WebEntryDetails } from "./WebEntryDetails";

test("places expandable scraped markdown below web entry metadata", () => {
  const markup = renderToStaticMarkup(
    createElement(WebEntryDetails, {
      url: "https://example.com/pricing",
      fileSizeLabel: "2.0 KB",
      markdown: "# Pricing\n\nPlans for every team.",
    }),
  );

  expect(markup.indexOf("2.0 KB")).toBeLessThan(markup.indexOf("Scraped Markdown"));
  expect(markup).toContain("View full markdown");
  expect(markup).toContain("# Pricing");
});
