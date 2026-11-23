import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { citationLabel } from "./citationLabel";
import { parseCitations } from "./citation-parser";
import {
  InlineCitationCard,
  InlineCitationCardTrigger,
} from "@/components/ai-elements/inline-citation";

test("labels Q&A and files by their source type without a URL", () => {
  expect(
    citationLabel({ number: "1", sourceType: "qa", title: "Refund policy" }),
  ).toBe("Q&A");
  expect(
    citationLabel({ number: "1", sourceType: "file", title: "Policy.pdf" }),
  ).toBe("File");
  const parsed = parseCitations(
    'Refund details.\n\nCitations\n\n{"title":"Refund policy","url":"","description":"Repair and replacement","sourceType":"qa"}',
  );
  expect(citationLabel(parsed.citations[0])).toBe("Q&A");
});

test("existing citations use their source title or website hostname", () => {
  expect(citationLabel({ number: "1", title: "Policy.pdf" })).toBe(
    "Policy.pdf",
  );
  expect(
    citationLabel({ number: "1", url: "https://kilobot.app/pricing" }),
  ).toBe("kilobot.app");
});

test("renders the source label instead of unknown", () => {
  const markup = renderToStaticMarkup(
    <InlineCitationCard>
      <InlineCitationCardTrigger sources={[]} label="Q&A" />
    </InlineCitationCard>,
  );
  expect(markup).toContain("Q&amp;A");
  expect(markup).not.toContain("unknown");
});

test("renders no badge when there is no source label or URL", () => {
  expect(
    renderToStaticMarkup(
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={[]} />
      </InlineCitationCard>,
    ),
  ).toBe("");
});
