import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const pageSource = readFileSync(
  new URL("./ChatsPage.tsx", import.meta.url),
  "utf8",
);
const switcherSource = readFileSync(
  new URL(
    "../components/inbox/InboxMobileConversationSwitcher.tsx",
    import.meta.url,
  ),
  "utf8",
);
const detailsSource = readFileSync(
  new URL("../components/inbox/InboxMobileDetailsSheet.tsx", import.meta.url),
  "utf8",
);
const demoSource = readFileSync(
  new URL("../components/inbox/InboxDemoPreview.tsx", import.meta.url),
  "utf8",
);
const chatRowSource = readFileSync(
  new URL("../components/ChatRow.tsx", import.meta.url),
  "utf8",
);

test("uses back navigation and focus-style filters on mobile", () => {
  expect(pageSource).toContain('aria-label="Back to chats"');
  expect(pageSource).not.toContain("<InboxMobileConversationSwitcher");
  expect(pageSource).toContain("<InboxFocusFilters");
  expect(pageSource).not.toContain("mobile-ai-replies-switch");
  expect(pageSource).toContain("InboxMobileDetailsSheet");
});

test("moves the desktop conversation column out of the mobile layout", () => {
  expect(pageSource).toContain("hidden md:contents");
});
