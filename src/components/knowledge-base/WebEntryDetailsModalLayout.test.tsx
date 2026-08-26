import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => children,
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    createElement("div", { className, "data-slot": "dialog-content" }, children)
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => createElement("p", null, children),
  DialogHeader: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogTitle: ({ children }: { children: ReactNode }) => createElement("h2", null, children),
}));

import { WebEntryDetails } from "./WebEntryDetails";

test("insets the direct Markdown modal from all screen edges", () => {
  const markup = renderToStaticMarkup(
    createElement(WebEntryDetails, {
      open: true,
      onOpenChange: () => undefined,
      url: "https://example.com/pricing",
      fileSizeLabel: "2.0 KB",
      markdown: "# Pricing",
    }),
  );

  expect(markup).toContain("!top-4");
  expect(markup).toContain("!left-4");
  expect(markup).toContain("!h-[calc(100dvh-2rem)]");
  expect(markup).toContain("!w-[calc(100vw-2rem)]");
  expect(markup).toContain("!rounded-3xl");
  expect(markup).toContain("lg:!top-6");
  expect(markup).toContain("lg:!h-[calc(100dvh-3rem)]");
});
