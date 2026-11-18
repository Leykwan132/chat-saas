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

test("keeps customer switching and details available without redundant AI switches", () => {
  expect(pageSource).toContain("InboxMobileConversationSwitcher");
  expect(switcherSource).toContain("mobile-conversation-switcher");
  expect(pageSource).not.toContain("mobile-ai-replies-switch");
  expect(pageSource).not.toContain("ai-replies-switch-chat");
  expect(pageSource).toContain("InboxMobileDetailsSheet");
  expect(detailsSource).toContain("mobile-details-button");
  expect(pageSource).toContain("if (mobileConversationSwitcherOpen) return;");
  expect(pageSource).toContain("mobileConversationSearchQuery");
  expect(chatRowSource).toContain("tabIndex={0}");
  expect(chatRowSource).toMatch(/event\.key === ["']Enter["']/);
  expect(pageSource).not.toContain("rounded-md bg-background px-1");
  expect(demoSource).not.toContain("bg-muted/50");
});

test("moves the desktop conversation column out of the mobile layout", () => {
  expect(pageSource).toContain("hidden md:contents");
});
