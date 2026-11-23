import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
const page = readFileSync(new URL("./ChatsPage.tsx", import.meta.url), "utf8");
const routes = readFileSync(new URL("../main.tsx", import.meta.url), "utf8");
test("dedicated focus path reuses the inbox with minimal navigation", () => {
  expect(routes).toContain('path="/dashboard/:agentId/inbox/focus"');
  expect(routes).toContain("<InboxFocusLayout");
  expect(routes).toContain("<ChatsPage focusMode");
  expect(page).toContain('aria-label="Back to chats"');
  expect(page).toContain("!focusMode && selectedConversationId");
  expect(page).toContain(
    "onRequestDelete={focusMode ? undefined : setDeleteConversationId}",
  );
  expect(page).toContain("onTakeControl={() => setPauseDialogOpen(true)}");
  expect(page).toContain('mode="pause"');
  expect(page).not.toContain("handleAiToggle(false)");
});
