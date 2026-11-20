import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { InboxReplyAuthorChip } from "./InboxReplyAuthorChip";

test("AI author uses the inverted blue colors", () => {
  const markup = renderToStaticMarkup(
    <InboxReplyAuthorChip author={{ kind: "ai", name: "AI" }} />,
  );
  expect(markup).toContain("bg-sky-800 text-sky-100");
  expect(markup).toContain("dark:bg-sky-200 dark:text-sky-950");
});
