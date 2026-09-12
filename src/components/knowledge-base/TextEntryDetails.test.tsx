import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { TextKnowledgeContent } from "./TextEntryDetails";
import { Dialog } from "@/components/ui/dialog";

test("renders text knowledge in the preview modal", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(TextKnowledgeContent, {
        title: "Refund policy",
        content: "Refunds are processed within 14 days.",
        onTitleChange: () => undefined,
        onContentChange: () => undefined,
      }),
    ),
  );

  expect(markup).toContain("Text knowledge");
  expect(markup).toContain("Refund policy");
  expect(markup).toContain("Refunds are processed within 14 days.");
  expect(markup).not.toContain("Knowledge title");
});

test("renders the edit form when the viewer can manage", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(TextKnowledgeContent, {
        title: "Refund policy",
        content: "Refunds are processed within 14 days.",
        canManage: true,
        onTitleChange: () => undefined,
        onContentChange: () => undefined,
      }),
    ),
  );

  expect(markup).toContain("Knowledge title");
  expect(markup).toContain("Refunds are processed within 14 days.");
});
