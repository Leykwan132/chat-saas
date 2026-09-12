import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FilePreviewContent } from "./FileEntryDetails";
import { Dialog } from "@/components/ui/dialog";

test("renders uploaded text in the file preview modal", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(FilePreviewContent, {
        fileName: "refund-policy.txt",
        fileSizeLabel: "1.2 KB",
        extractedText: "Refunds are processed within 14 days.",
      }),
    ),
  );

  expect(markup).toContain("File preview");
  expect(markup).toContain("refund-policy.txt");
  expect(markup).toContain("Refunds are processed within 14 days.");
});

test("renders an image preview when a file URL is available", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(FilePreviewContent, {
        fileName: "menu.png",
        fileSizeLabel: "80 KB",
        previewUrl: "https://cdn.example.com/menu.png",
      }),
    ),
  );

  expect(markup).toContain("https://cdn.example.com/menu.png");
  expect(markup).toContain("menu.png");
});
