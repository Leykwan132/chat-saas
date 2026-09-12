import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { QAKnowledgeContent } from "./QAEntryDetails";
import { Dialog } from "@/components/ui/dialog";

test("renders Q&A knowledge in the preview modal", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(QAKnowledgeContent, {
        question: "Do you offer refunds?",
        answer: "Yes, within 14 days.",
        onQuestionChange: () => undefined,
        onAnswerChange: () => undefined,
      }),
    ),
  );

  expect(markup).toContain("Q&amp;A knowledge");
  expect(markup).toContain("Do you offer refunds?");
  expect(markup).toContain("Yes, within 14 days.");
  expect(markup).not.toContain("Enter question");
});

test("renders the edit fields when the viewer can manage", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dialog,
      { open: true },
      createElement(QAKnowledgeContent, {
        question: "Do you offer refunds?",
        answer: "Yes, within 14 days.",
        canManage: true,
        onQuestionChange: () => undefined,
        onAnswerChange: () => undefined,
      }),
    ),
  );

  expect(markup).toContain("Enter question");
  expect(markup).toContain("Enter answer");
});
