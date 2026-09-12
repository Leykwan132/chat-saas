import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ScrapedMarkdownContent } from "./WebEntryDetails";
import { Dialog } from "@/components/ui/dialog";

test("does not offer a website refresh action", () => {
  const source = readFileSync(fileURLToPath(new URL("./WebEntryDetails.tsx", import.meta.url)), "utf8");
  expect(source).not.toContain("Refresh");
  expect(source).not.toContain("onRefresh");
});

test("renders website Markdown for the direct full-screen modal", () => {
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

  expect(markup).toContain("Website knowledge");
  expect(markup).toContain("2.0 KB");
  expect(markup).toContain("# Pricing");
  expect(markup).not.toContain("<textarea");
});

test("renders an editable textarea when the viewer can manage", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(ScrapedMarkdownContent, {
        url: "https://example.com/pricing",
        fileSizeLabel: "2.0 KB",
        markdown: "# Pricing",
        draft: "# Pricing",
        canEdit: true,
        onDraftChange: () => undefined,
      }),
    ),
  );

  expect(markup).toContain("<textarea");
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
