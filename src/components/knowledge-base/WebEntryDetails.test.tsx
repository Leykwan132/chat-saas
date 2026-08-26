import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ScrapedMarkdownContent } from "./WebEntryDetails";
import { Dialog } from "@/components/ui/dialog";

test("renders scraped Markdown for the direct full-screen modal", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(ScrapedMarkdownContent, {
        url: "https://example.com/pricing",
        fileSizeLabel: "2.0 KB",
        markdown: "# Pricing\n\nPlans for every team.",
      }),
    ),
  );

  expect(markup).toContain("Scraped Markdown");
  expect(markup).toContain("2.0 KB");
  expect(markup).toContain("# Pricing");
});

test("shows a Markdown skeleton while the content is loading", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(ScrapedMarkdownContent, {
        url: "https://example.com/pricing",
        fileSizeLabel: "2.0 KB",
        isMarkdownLoading: true,
      }),
    ),
  );

  expect(markup).toContain('data-slot="skeleton"');
});
